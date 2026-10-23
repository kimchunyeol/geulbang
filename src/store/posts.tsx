import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import type { CategoryId } from '@/constants/categories';
import { importOldWebPosts } from '@/utils/import-old-web';
import { makeId } from '@/utils/make-id';

// 글의 본문은 "블록"을 차례로 쌓아서 만들어요.
// - text: 보통 글 한 덩어리
// - check: 체크 표시를 할 수 있는 한 줄 (메모에서만 써요)
export type TextBlock = { id: string; type: 'text'; text: string };
export type CheckBlock = { id: string; type: 'check'; text: string; checked: boolean };
export type Block = TextBlock | CheckBlock;

export type Post = {
  id: string;
  category: CategoryId;
  title: string;
  blocks: Block[];
  createdAt: number; // 1970년부터 지난 밀리초. 날짜를 숫자로 저장하는 흔한 방법이에요.
  updatedAt: number;
};

// 폰 저장소에서 글 목록을 찾을 때 쓰는 이름표예요.
const STORAGE_KEY = 'geulbang.posts.v1';

export { makeId };

export function isPostEmpty(post: Post) {
  return post.title.trim() === '' && post.blocks.every((block) => block.text.trim() === '');
}

type PostsContextValue = {
  posts: Post[];
  isLoaded: boolean;
  createPost: (category: CategoryId) => string;
  updatePost: (id: string, changes: Partial<Pick<Post, 'title' | 'blocks'>>) => void;
  deletePost: (id: string) => void;
  discardIfEmpty: (id: string) => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

// 앱 전체를 이 컴포넌트로 감싸면, 어느 화면에서든 usePosts()로 글을 다룰 수 있어요.
export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱을 켤 때 한 번, 폰에 저장된 글을 불러와요.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          setPosts(JSON.parse(saved));
        } else if (Platform.OS === 'web') {
          // 처음 여는 웹이라면, 예전 웹 버전 글방에 써 둔 글이 있는지 찾아서 옮겨 와요.
          setPosts(importOldWebPosts());
        }
      })
      .catch((error) => console.warn('글을 불러오지 못했어요', error))
      .finally(() => setIsLoaded(true));
  }, []);

  // 글이 바뀔 때마다 폰에 저장해요. 불러오기 전에는 저장하지 않아야 기존 글을 덮어쓰지 않아요.
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts)).catch((error) =>
      console.warn('글을 저장하지 못했어요', error)
    );
  }, [posts, isLoaded]);

  function createPost(category: CategoryId) {
    const now = Date.now();
    const post: Post = {
      id: makeId(),
      category,
      title: '',
      blocks: [{ id: makeId(), type: 'text', text: '' }],
      createdAt: now,
      updatedAt: now,
    };
    setPosts((prev) => [post, ...prev]);
    return post.id;
  }

  function updatePost(id: string, changes: Partial<Pick<Post, 'title' | 'blocks'>>) {
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, ...changes, updatedAt: Date.now() } : post))
    );
  }

  function deletePost(id: string) {
    setPosts((prev) => prev.filter((post) => post.id !== id));
  }

  // 새 글을 열었다가 아무것도 안 쓰고 나가면 빈 글이 남지 않도록 지워요.
  // 글쓰기 화면이 닫힐 때 부르므로, 화면이 다시 그려져도 같은 함수로 유지되게 useCallback으로 감싸요.
  const discardIfEmpty = useCallback((id: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== id || !isPostEmpty(post)));
  }, []);

  return (
    <PostsContext.Provider
      value={{ posts, isLoaded, createPost, updatePost, deletePost, discardIfEmpty }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const value = useContext(PostsContext);
  if (!value) throw new Error('usePosts는 PostsProvider 안에서만 쓸 수 있어요');
  return value;
}
