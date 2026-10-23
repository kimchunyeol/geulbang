// 글방의 카테고리 목록이에요.
// 여기에 항목을 하나 추가하면 첫 화면에 카드가 하나 더 생겨요.
export type CategoryId = 'diary' | 'memo' | 'essay';

export type Category = {
  id: CategoryId;
  name: string;
  description: string;
  color: string; // 카드 왼쪽의 얇은 색 띠
  allowsChecklist: boolean; // 체크 블록을 넣을 수 있는지
};

export const CATEGORIES: Category[] = [
  {
    id: 'diary',
    name: '일기',
    description: '오늘 하루를 차분히 기록해요',
    color: '#D9A88A',
    allowsChecklist: false,
  },
  {
    id: 'memo',
    name: '메모',
    description: '떠오른 생각과 할 일을 적어요',
    color: '#9BBBA9',
    allowsChecklist: true,
  },
  {
    id: 'essay',
    name: '수필',
    description: '긴 호흡으로 생각을 펼쳐요',
    color: '#A3A9C8',
    allowsChecklist: false,
  },
];

// id로 카테고리 정보를 찾아요. 없는 id면 undefined를 돌려줘요.
export function findCategory(id: string | undefined): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}
