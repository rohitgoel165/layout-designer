// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vite env vars you use (optional) */
  readonly VITE_API_BASE?: string;
  // add other VITE_ variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
