import { CATEGORIES, type CategoryId } from '@/constants/categories';
import type { Block, Post } from '@/store/posts';
import { makeId } from '@/utils/make-id';

// 예전 웹 버전 글방(kimchunyeol.github.io/geulbang)이 브라우저에 남긴 글을 새 앱 모양으로 바꿔요.
// 예전 데이터는 지우지 않고 읽기만 해요.
const OLD_KEY = 'pen-diary-v2'; // { cats, entries }
const OLDEST_KEY = 'pen-diary-entries'; // 맨 처음 버전: 날짜별 일기만 있었어요

type OldEntry = {
  id?: string;
  cat?: string;
  date?: string; // 'YYYY-MM-DD'
  title?: string;
  body?: string;
  weather?: string;
  checks?: { text?: string; done?: boolean }[];
  createdAt?: number;
  updatedAt?: number;
};

type OldCategory = { id: string; name: string };

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

// 'YYYY-MM-DD' → 그날 정오의 시각 (시간대가 달라도 날짜가 바뀌지 않게 정오로)
function dateToTime(date: string | undefined) {
  const [y, m, d] = (date ?? '').split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 12).getTime();
}

function convert(key: string, entry: OldEntry, oldCats: OldCategory[]): Post | null {
  const isKnown = CATEGORIES.some((category) => category.id === entry.cat);
  const category: CategoryId = isKnown ? (entry.cat as CategoryId) : entry.cat ? 'memo' : 'diary';
  // 직접 만든 카테고리의 글은 메모로 옮기고, 제목 앞에 원래 카테고리 이름을 붙여요.
  const customName = !isKnown && entry.cat ? oldCats.find((c) => c.id === entry.cat)?.name : undefined;

  const title = [customName && `[${customName}]`, entry.title?.trim()].filter(Boolean).join(' ');
  const body = [entry.weather && `날씨: ${entry.weather}`, entry.body ?? ''].filter(Boolean).join('\n');
  const checks = (entry.checks ?? []).filter((check) => (check.text ?? '').trim() !== '');

  if (!title.trim() && !body.trim() && checks.length === 0) return null;

  const blocks: Block[] = [{ id: makeId(), type: 'text', text: body }];
  for (const check of checks) {
    blocks.push({ id: makeId(), type: 'check', text: String(check.text), checked: !!check.done });
  }

  const createdAt = dateToTime(entry.date) ?? entry.createdAt ?? Date.now();
  return {
    id: `old-${entry.id ?? key}`,
    category,
    title,
    blocks,
    createdAt,
    updatedAt: entry.updatedAt || entry.createdAt || createdAt,
  };
}

export function importOldWebPosts(): Post[] {
  if (typeof localStorage === 'undefined') return [];

  const saved = readJson(OLD_KEY) as { cats?: OldCategory[]; entries?: Record<string, OldEntry> } | null;
  const oldest = readJson(OLDEST_KEY) as Record<string, OldEntry> | null;

  let pairs: [string, OldEntry][] = [];
  if (saved?.entries) {
    pairs = Object.entries(saved.entries);
  } else if (oldest) {
    pairs = Object.values(oldest).map((entry) => [`d-${entry.date}`, { ...entry, cat: 'diary' }]);
  }

  return pairs
    .map(([key, entry]) => convert(key, entry, saved?.cats ?? []))
    .filter((post): post is Post => post !== null);
}
