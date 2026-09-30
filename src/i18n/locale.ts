export type Locale = 'fr' | 'en';

// Also read by the inline script of index.html, which sets <html lang> before the first paint.
const STORAGE_KEY = 'locale';

const listeners = new Set<() => void>();

/** The <html lang> attribute is the source of truth. French unless it says English. */
export function getLocale(): Locale {
  return document.documentElement.lang === 'en' ? 'en' : 'fr';
}

export function setLocale(locale: Locale) {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice simply lasts until the page is reloaded.
  }
  for (const listener of listeners) listener();
}

/** Shaped for useSyncExternalStore. Returns an unsubscribe function. */
export function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
