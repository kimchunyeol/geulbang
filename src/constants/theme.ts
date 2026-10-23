/**
 * 글방에서 쓰는 색과 글꼴, 간격을 한곳에 모아 둔 파일이에요.
 * 여기 값만 바꾸면 앱 전체의 분위기가 함께 바뀌어요.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FAF8F4', // 종이처럼 살짝 따뜻한 흰색
    surface: '#FFFFFF', // 카드 배경
    text: '#2B2A28',
    textSecondary: '#8A867F',
    border: '#ECE8E0',
    accent: '#8C7A63', // 버튼·체크 표시에 쓰는 차분한 갈색
  },
  dark: {
    background: '#1A1917',
    surface: '#242320',
    text: '#ECE8E1',
    textSecondary: '#9A958C',
    border: '#34322E',
    accent: '#C2AE92',
  },
} as const;

export type ThemeColors = (typeof Colors)['light' | 'dark'];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    /** 아이폰에 들어 있는 명조 계열 글꼴 */
    serif: 'ui-serif',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
  },
});

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 680;
