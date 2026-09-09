export {};
declare global {
  interface Window {
    desktopApi?: {
      getVersion: () => Promise<string>;
      openDataFolder: () => Promise<{ folder: string; error: string | null }>;
    };
  }
}
