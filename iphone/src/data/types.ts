// Mac 글방과 같은 데이터 모양 (백업 파일을 그대로 주고받기 위해)

export type Folder = {
  id: string;
  title: string;
  createdAt: number;
  rank: number;
  updatedAt?: number;
};

export type Story = {
  id: string;
  folderId: string | null;
  title: string;
  subtitle: string;
  createdAt: number;
  trashedAt: number | null;
  orderBy: 'writedAt' | 'title';
  orderDir: 'asc' | 'desc';
  rank: number;
  dateVisible: boolean;
  updatedAt?: number;
};

export type Align = 'left' | 'center' | 'justify';

export type Post = {
  id: string;
  storyId: string;
  title: string;
  text: string;
  writedAt: number;
  editedAt: number;
  trashedAt: number | null;
  align: Align;
  photos: string[];
  updatedAt?: number;
};

export type Settings = {
  theme: 'light' | 'dark';
  fontSize: number;
  countMode: number;
};

export type Data = {
  folders: Folder[];
  stories: Story[];
  posts: Post[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = { theme: 'light', fontSize: 17, countMode: 0 };
