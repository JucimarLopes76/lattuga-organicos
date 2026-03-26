/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_WHATSAPP_PHONE: string;
    readonly VITE_STORE_NAME: string;
    readonly VITE_STORE_ADDRESS: string;
    readonly VITE_PIX_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
