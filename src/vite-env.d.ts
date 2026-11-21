/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FCM_API_KEY?: string;
  readonly VITE_FCM_AUTH_DOMAIN?: string;
  readonly VITE_FCM_PROJECT_ID?: string;
  readonly VITE_FCM_STORAGE_BUCKET?: string;
  readonly VITE_FCM_SENDER_ID?: string;
  readonly VITE_FCM_APP_ID?: string;
  readonly VITE_FCM_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/// <reference types="vite/client" />
