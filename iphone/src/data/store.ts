// 앱 전체 상태: 메모리에 들고 있으면서 바뀐 레코드만 SQLite에 기록한다
import * as db from './db';
import { DEFAULT_SETTINGS, type Data, type Folder, type Post, type Settings, type Story } from './types';
import { uid } from '@/utils/id';

const DAY = 86400000;
export const TRASH_DAYS = 30;

type Listener = () => void;
const listeners = new Set<Listener>();
let data: Data;

function seed(): Data {
  // 고정 ID: Mac과 같은 예시 데이터라 백업을 합쳐도 겹치지 않음
  const now = Date.now();
  return {
    folders: [],
    stories: [{ id: 'welcome-story', folderId: null, title: '나의 첫 이야기', subtitle: '매일 한 줄이라도 써 보기',
      createdAt: now, trashedAt: null, orderBy: 'writedAt', orderDir: 'desc', rank: 0, dateVisible: true }],
    posts: [{ id: 'welcome-post', storyId: 'welcome-story', title: '시작',
      text: '여기에 첫 글이 있습니다.\n\n오른쪽 위 연필 버튼으로 새 글을 쓰고, 글을 두 번 탭하면 수정할 수 있어요.',
      writedAt: now, editedAt: now, trashedAt: null, align: 'left', photos: [] }],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function init() {
  const loaded = db.loadAll();
  if (loaded) {
    data = loaded;
  } else {
    data = seed();
    db.replaceAll(data);
  }
  purgeOldTrash();
}

function emit(next: Data) {
  data = next;
  listeners.forEach(fn => fn());
}

export const store = {
  get: () => data,
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

// ---------- 조회 ----------
export const liveStories = (d: Data) => d.stories.filter(s => !s.trashedAt).sort((a, b) => a.rank - b.rank);

export function postsOf(d: Data, story: Story) {
  const dir = story.orderDir === 'asc' ? 1 : -1;
  return d.posts
    .filter(p => p.storyId === story.id && !p.trashedAt)
    .sort((a, b) => story.orderBy === 'title' ? dir * a.title.localeCompare(b.title, 'ko') : dir * (a.writedAt - b.writedAt));
}

export function daysLeft(trashedAt: number) {
  return Math.max(0, TRASH_DAYS - Math.floor((Date.now() - trashedAt) / DAY));
}

// ---------- 이야기 / 폴더 ----------
export function addStory(fields: Pick<Story, 'title' | 'subtitle' | 'folderId'>) {
  const s: Story = { id: uid(), createdAt: Date.now(), trashedAt: null, orderBy: 'writedAt', orderDir: 'desc',
    rank: data.stories.length, dateVisible: true, ...fields };
  db.upsert('stories', s);
  emit({ ...data, stories: [...data.stories, s] });
  return s;
}

export function updateStory(id: string, patch: Partial<Story>) {
  const stories = data.stories.map(s => s.id === id ? { ...s, ...patch } : s);
  const s = stories.find(x => x.id === id);
  if (!s) return;
  db.upsert('stories', s);
  emit({ ...data, stories });
}

export function addFolder(title: string) {
  const f: Folder = { id: uid(), title, createdAt: Date.now(), rank: data.folders.length };
  db.upsert('folders', f);
  emit({ ...data, folders: [...data.folders, f] });
}

// 폴더만 지우고 안의 이야기는 폴더 밖으로 꺼낸다
export function deleteFolder(id: string) {
  const stories = data.stories.map(s => {
    if (s.folderId !== id) return s;
    const moved = { ...s, folderId: null };
    db.upsert('stories', moved);
    return moved;
  });
  db.remove('folders', [id]);
  emit({ ...data, stories, folders: data.folders.filter(f => f.id !== id) });
}

// ---------- 글 ----------
export function addPost(storyId: string) {
  const now = Date.now();
  const p: Post = { id: uid(), storyId, title: '', text: '', writedAt: now, editedAt: now, trashedAt: null, align: 'left', photos: [] };
  db.upsert('posts', p);
  emit({ ...data, posts: [...data.posts, p] });
  return p;
}

export function updatePost(id: string, patch: Partial<Post>) {
  const posts = data.posts.map(p => p.id === id ? { ...p, ...patch } : p);
  const p = posts.find(x => x.id === id);
  if (!p) return;
  db.upsert('posts', p);
  emit({ ...data, posts });
}

export function trashPost(id: string) {
  updatePost(id, { trashedAt: Date.now() });
}

export function restorePost(id: string) {
  const p = data.posts.find(x => x.id === id);
  if (!p) return;
  updatePost(id, { trashedAt: null });
  const s = data.stories.find(x => x.id === p.storyId);
  if (s?.trashedAt) updateStory(s.id, { trashedAt: null });
}

export function purgePosts(ids: string[]) {
  if (!ids.length) return;
  db.remove('posts', ids);
  const gone = new Set(ids);
  emit({ ...data, posts: data.posts.filter(p => !gone.has(p.id)) });
}

// 내용이 없는 새 글은 편집을 마칠 때 지운다
export function discardIfEmpty(id: string) {
  const p = data.posts.find(x => x.id === id);
  if (p && !p.title.trim() && !p.text.trim() && !p.photos.length) {
    purgePosts([id]);
    return true;
  }
  return false;
}

export function emptyTrash() {
  const deadStories = data.stories.filter(s => s.trashedAt).map(s => s.id);
  const dead = new Set(deadStories);
  purgePosts(data.posts.filter(p => p.trashedAt || dead.has(p.storyId)).map(p => p.id));
  if (deadStories.length) {
    db.remove('stories', deadStories);
    emit({ ...data, stories: data.stories.filter(s => !dead.has(s.id)) });
  }
}

function purgeOldTrash() {
  const cutoff = Date.now() - TRASH_DAYS * DAY;
  purgePosts(data.posts.filter(p => p.trashedAt && p.trashedAt < cutoff).map(p => p.id));
  const oldStories = data.stories.filter(s => s.trashedAt && s.trashedAt < cutoff).map(s => s.id);
  if (oldStories.length) {
    db.remove('stories', oldStories);
    emit({ ...data, stories: data.stories.filter(s => !oldStories.includes(s.id)) });
  }
}

// ---------- 설정 / 백업 ----------
export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...data.settings, ...patch };
  db.saveSettings(settings);
  emit({ ...data, settings });
}

export function replaceAll(next: Data) {
  db.replaceAll(next);
  emit(next);
}

init();
