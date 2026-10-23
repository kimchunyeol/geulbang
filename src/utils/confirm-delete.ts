import { Alert, Platform } from 'react-native';

// "이 글을 지울까요?" 확인창을 띄우고, '지우기'를 고르면 onConfirm을 불러요.
// 웹에서는 Alert가 아무것도 하지 않아서, 브라우저 기본 확인창(window.confirm)을 써요.
export function confirmDelete(onConfirm: () => void) {
  const title = '이 글을 지울까요?';
  const message = '지운 글은 되돌릴 수 없어요.';

  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '지우기', style: 'destructive', onPress: onConfirm },
  ]);
}
