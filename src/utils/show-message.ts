import { Alert, Platform } from 'react-native';

// 확인 버튼 하나만 있는 알림창을 띄워요.
// 웹에서는 Alert가 아무것도 하지 않아서, 브라우저 기본 알림창(window.alert)을 써요.
export function showMessage(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}
