import { useSyncExternalStore } from 'react';
import { getSlowRequestCount, subscribeToSlowRequests } from '../../api/client';

/** True while at least one API request has been pending for more than 2 seconds. */
export function useIsWaitingForServer(): boolean {
  // The counter lives in the API module, outside React: read it as an external store.
  return useSyncExternalStore(subscribeToSlowRequests, getSlowRequestCount) > 0;
}
