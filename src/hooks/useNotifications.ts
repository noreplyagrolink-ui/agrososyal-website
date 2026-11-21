// ============================================================
//  useNotifications — Firebase olmadan gerçek zamanlı bildirim
//  Strateji:
//    1. SSE  → /api/notifications/stream (sunucu destekliyorsa)
//    2. Long-polling → her 20 sn /api/notifications kontrolü
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { getStoredUser, getToken } from "@/lib/api";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";
const POLL_INTERVAL = 20_000; // 20 saniye

export interface AppNotification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "follow_request" | "disease_alert" | string;
  message: string;
  read: boolean;
  createdAt: string;
  fromUser?: { username: string; profilePic?: string };
  postId?: string;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;          // SSE bağlı mı
  mode: "sse" | "polling" | "offline";
  markRead: (id?: string) => void;    // id yoksa hepsini işaretle
  refresh: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const user = getStoredUser();
  const token = getToken();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<"sse" | "polling" | "offline">("offline");

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ------ Polling fonksiyonu ------
  const poll = useCallback(async () => {
    if (!token || !mountedRef.current) return;
    try {
      const res = await fetch(`${API_BASE}/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) {
        setNotifications(data.notifications || []);
      }
    } catch {}
  }, [token]);

  // ------ SSE başlat ------
  const startSSE = useCallback(() => {
    if (!token) return false;
    try {
      const es = new EventSource(
        `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`
      );

      es.onopen = () => {
        if (mountedRef.current) {
          setConnected(true);
          setMode("sse");
        }
      };

      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const notif: AppNotification = JSON.parse(e.data);
          setNotifications((prev) => {
            // Duplicate önle
            if (prev.find((n) => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
        } catch {}
      };

      // Özel event türleri
      ["like", "comment", "follow", "mention", "disease_alert"].forEach((type) => {
        es.addEventListener(type, (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const notif: AppNotification = JSON.parse(e.data);
            setNotifications((prev) => {
              if (prev.find((n) => n.id === notif.id)) return prev;
              return [notif, ...prev];
            });
          } catch {}
        });
      });

      es.onerror = () => {
        es.close();
        if (mountedRef.current) {
          setConnected(false);
          setMode("polling");
          startPolling(); // SSE başarısız → polling'e geç
        }
      };

      sseRef.current = es;
      return true;
    } catch {
      return false;
    }
  }, [token]);

  // ------ Polling başlat ------
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // zaten çalışıyor
    poll(); // hemen bir kez çek
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    if (mountedRef.current) setMode("polling");
  }, [poll]);

  // ------ Mount / Unmount ------
  useEffect(() => {
    mountedRef.current = true;
    if (!token || !user) {
      setMode("offline");
      return;
    }

    // SSE dene, başarısız olursa polling
    const sseOk = startSSE();
    if (!sseOk) startPolling();

    // İlk yükleme: her iki modda da anlık bildirim çek
    poll();

    return () => {
      mountedRef.current = false;
      sseRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]);

  // ------ Mark Read ------
  const markRead = useCallback(async (id?: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(id ? { id } : {}),
      });
      setNotifications((prev) =>
        prev.map((n) => (id ? (n.id === id ? { ...n, read: true } : n) : { ...n, read: true }))
      );
    } catch {}
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    connected,
    mode,
    markRead,
    refresh: poll,
  };
}

