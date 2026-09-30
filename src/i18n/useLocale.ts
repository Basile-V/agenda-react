import { useSyncExternalStore } from 'react';
import { getLocale, subscribeToLocale, type Locale } from './locale';
import { messages, type Messages } from './messages';

// The locale lives outside React (the API client reads it too): an external store, no provider.
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeToLocale, getLocale);
}

/** Interface texts in the current language; re-renders when it changes. */
export function useMessages(): Messages {
  return messages[useLocale()];
}
