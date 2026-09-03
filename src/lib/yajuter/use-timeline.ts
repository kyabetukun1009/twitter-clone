import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTimeline } from './api';
import type { YPost } from './api';

const PAGE = 20;

type UseTimeline = {
  posts: YPost[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
  patchPost: (id: number, patch: Partial<YPost>) => void;
  removePost: (id: number) => void;
  prependPost: (post: YPost) => void;
};

export function useYajuterTimeline(): UseTimeline {
  const [posts, setPosts] = useState<YPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const postsRef = useRef<YPost[]>([]);
  postsRef.current = posts;

  useEffect(() => {
    let cancelled = false;
    fetchTimeline(undefined, PAGE)
      .then(({ posts }) => {
        if (cancelled) return;
        setPosts(posts);
        setHasMore(posts.length >= PAGE);
        hasMoreRef.current = posts.length >= PAGE;
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    const current = postsRef.current;
    if (!current.length) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const lastId = current[current.length - 1].id;
      const { posts: next } = await fetchTimeline(lastId, PAGE);
      if (!next.length) {
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }
      setPosts(() => {
        const seen = new Set(current.map((p) => p.id));
        return [...current, ...next.filter((p) => !seen.has(p.id))];
      });
      const more = next.length >= PAGE;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch {
      // keep existing posts on failure
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observer.current?.disconnect();
      if (!node || !hasMore || loading) return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) void loadMore();
      });
      observer.current.observe(node);
    },
    [hasMore, loading, loadMore]
  );

  const patchPost = useCallback((id: number, patch: Partial<YPost>) => {
    setPosts((current) =>
      current.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }, []);

  const removePost = useCallback((id: number) => {
    setPosts((current) => current.filter((p) => p.id !== id));
  }, []);

  const prependPost = useCallback((post: YPost) => {
    setPosts((current) => [post, ...current]);
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    patchPost,
    removePost,
    prependPost
  };
}
