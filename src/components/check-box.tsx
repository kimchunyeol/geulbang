import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
};

// 메모의 체크 블록 앞에 붙는 네모 칸. 누르면 체크가 켜졌다 꺼져요.
export function CheckBox({ checked, onToggle }: Props) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[
        styles.box,
        { borderColor: checked ? colors.accent : colors.textSecondary },
        checked && { backgroundColor: colors.accent },
      ]}>
      {checked && <Text style={[styles.mark, { color: colors.background }]}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
});
