const DAYS = '일월화수목금토';

export function formatDate(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${DAYS[d.getDay()]}요일`;
}

export function formatTime(t: number) {
  const d = new Date(t);
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 단어수 / 글자수(공백 포함) / 글자수(공백 제외)
export function countLabel(text: string, mode: number) {
  if (mode === 1) return `글자 ${text.length} (공백 포함)`;
  if (mode === 2) return `글자 ${text.replace(/\s/g, '').length} (공백 제외)`;
  return `단어 ${(text.trim().match(/\S+/g) || []).length}`;
}

// 파일 이름용 오늘 날짜 (기기 시간 기준, toISOString은 세계 표준시라 아침에 하루 밀림)
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
