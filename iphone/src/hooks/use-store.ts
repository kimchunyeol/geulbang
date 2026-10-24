import { useSyncExternalStore } from 'react';

import { store } from '@/data/store';

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get);
}
