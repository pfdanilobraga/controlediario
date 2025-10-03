// Fix: The reference to "vite/client" was causing an error because the type
// definition file could not be found. To resolve this and the resulting
// type errors in firebase.ts, the failing reference has been removed and
// replaced with a manual definition of the ImportMeta and ImportMetaEnv interfaces.
// This provides TypeScript with the necessary types for Vite's environment variables.

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
