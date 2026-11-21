import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
          size?: "normal" | "compact";
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

export const RECAPTCHA_SITE_KEY =
  "6LeFkOIsAAAAADqHLvRqSyr4jqHjxdeDJDXcUobc";

interface Props {
  onChange: (token: string | null) => void;
  theme?: "light" | "dark";
}

let lastWidgetId: number | null = null;

export default function ReCaptcha({ onChange, theme = "light" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const themeRef = useRef(theme);
  const pollerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    mountedRef.current = true;
    setStatus("loading");

    const clearTimers = () => {
      if (pollerRef.current !== null) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const renderWidget = () => {
      if (!mountedRef.current) return false;
      if (!containerRef.current) return false;
      if (!window.grecaptcha?.render) return false;
      if (widgetIdRef.current !== null) return true;

      try {
        containerRef.current.innerHTML = "";

        const widgetId = window.grecaptcha.render(containerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: themeRef.current,
          callback: (token: string) => {
            onChangeRef.current(token || null);
          },
          "expired-callback": () => {
            onChangeRef.current(null);
          },
          "error-callback": () => {
            onChangeRef.current(null);
          },
        });

        widgetIdRef.current = widgetId;
        lastWidgetId = widgetId;
        setStatus("ready");
        clearTimers();
        return true;
      } catch (error) {
        console.error("[ReCaptcha] Widget render hatası", error);
        return false;
      }
    };

    const startPolling = () => {
      if (renderWidget()) return;

      pollerRef.current = window.setInterval(() => {
        if (renderWidget()) {
          clearTimers();
        }
      }, 250);

      timeoutRef.current = window.setTimeout(() => {
        clearTimers();
        if (widgetIdRef.current === null && mountedRef.current) {
          setStatus("error");
          console.warn("[ReCaptcha] reCAPTCHA belirlenen sürede yüklenmedi.");
        }
      }, 30000);
    };

    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(() => {
        if (!renderWidget()) startPolling();
      });
    } else {
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      clearTimers();

      try {
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
        }
      } catch (error) {
        console.error("[ReCaptcha] Cleanup reset hatası", error);
      }

      widgetIdRef.current = null;
      lastWidgetId = null;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        className="flex justify-center"
        style={{ minHeight: "78px" }}
      />
      {status === "error" ? (
        <p className="text-xs text-destructive text-center">
          reCAPTCHA yüklenemedi. Sayfayı yenileyin.
        </p>
      ) : null}
    </div>
  );
}

export function resetRecaptcha() {
  try {
    if (window.grecaptcha && lastWidgetId !== null) {
      window.grecaptcha.reset(lastWidgetId);
    }
  } catch (error) {
    console.error("[ReCaptcha] Reset hatası", error);
  }
}
