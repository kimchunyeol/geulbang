import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// 바뀔 일이 없는 값이라 구독할 것도 없어요.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // 미리 만들어 둔 HTML과 처음 화면을 맞추는 동안에는 false, 그 뒤 브라우저에서는 true예요.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
