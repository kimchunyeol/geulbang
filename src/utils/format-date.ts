const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 예: 2026년 10월 23일 금요일
export function formatLongDate(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

// 예: 10.23 (같은 해) / 2025.10.23 (다른 해)
export function formatShortDate(time: number) {
  const date = new Date(time);
  const monthDay = `${date.getMonth() + 1}.${date.getDate()}`;
  return date.getFullYear() === new Date().getFullYear()
    ? monthDay
    : `${date.getFullYear()}.${monthDay}`;
}
