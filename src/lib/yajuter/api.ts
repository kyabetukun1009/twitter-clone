import type {
  PostRow,
  UserRow,
  AnniversaryRow,
  QuoteRow
} from '@lib/supabase/tables';

export type YPost = PostRow & { reply_count: number };

export type OwnerProfile = UserRow & {
  totalTweets: number;
  totalPhotos: number;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (res.status === 401) throw new Error('unauthorized');
  const body = (await res.json()) as { ok: boolean } & T;
  if (!body.ok) throw new Error('request failed');
  return body;
}

export function fetchMe(): Promise<{ user: OwnerProfile }> {
  return api('/api/yajuter/me');
}

export function fetchTimeline(
  before?: number,
  limit?: number
): Promise<{ posts: YPost[]; count: number }> {
  const params = new URLSearchParams();
  if (before) params.set('before', String(before));
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return api(`/api/yajuter/timeline${qs ? `?${qs}` : ''}`);
}

export function createPost(input: {
  content: string;
  emotion_tag?: string;
  reply_to?: number;
  image_path?: string;
}): Promise<{ post: PostRow }> {
  return api('/api/yajuter/posts', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function likePost(
  post_id: number
): Promise<{ post: { id: number; like_count: number } }> {
  return api('/api/yajuter/like', {
    method: 'POST',
    body: JSON.stringify({ post_id })
  });
}

export function toggleBookmark(
  post_id: number
): Promise<{ post: { id: number; bookmarked: boolean } }> {
  return api('/api/yajuter/bookmark', {
    method: 'POST',
    body: JSON.stringify({ post_id })
  });
}

export function deletePost(post_id: number): Promise<{ id: number }> {
  return api(`/api/yajuter/posts/${post_id}`, { method: 'DELETE' });
}

export async function uploadImage(file: File): Promise<{ path: string }> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('/api/yajuter/upload', {
    method: 'POST',
    body: form
  });
  if (res.status === 401) throw new Error('unauthorized');
  const body = (await res.json()) as { ok: boolean; path?: string };
  if (!body.ok || !body.path) throw new Error('upload failed');
  return { path: body.path };
}

export function imageUrl(path: string): string {
  return `/api/yajuter/image?path=${encodeURIComponent(path)}`;
}

export function fetchAnniversaries(): Promise<{
  anniversaries: AnniversaryRow[];
}> {
  return api('/api/yajuter/anniversaries');
}

export type YThread = {
  post: YPost;
  parents: YPost[];
  replies: YPost[];
};

export function fetchThread(id: number): Promise<YThread> {
  return api(`/api/yajuter/posts/${id}`);
}

export function fetchBookmarks(): Promise<{ posts: YPost[]; count: number }> {
  return api('/api/yajuter/bookmarks');
}

export function clearBookmarks(): Promise<{ cleared: number }> {
  return api('/api/yajuter/bookmarks', { method: 'DELETE' });
}

export type ProfileTab = 'posts' | 'media' | 'liked';

export function fetchProfile(tab: ProfileTab): Promise<{
  posts: YPost[];
  stats: { totalTweets: number; totalPhotos: number };
}> {
  return api(`/api/yajuter/profile?tab=${tab}`);
}

export function fetchRandomQuote(): Promise<{ quote: QuoteRow | null }> {
  return api('/api/yajuter/quote');
}
