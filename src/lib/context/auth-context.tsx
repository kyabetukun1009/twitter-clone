import { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { useRouter } from 'next/router';
import { fetchMe } from '@lib/yajuter/api';
import { fromISO } from '@lib/supabase/timestamp';
import { getRandomId } from '@lib/random';
import type { ReactNode } from 'react';
import type { User } from '@lib/types/user';
import type { Bookmark } from '@lib/types/bookmark';

type AuthContext = {
  user: User | null;
  error: Error | null;
  loading: boolean;
  isAdmin: boolean;
  randomSeed: string;
  userBookmarks: Bookmark[] | null;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

export const AuthContext = createContext<AuthContext | null>(null);

type AuthContextProviderProps = {
  children: ReactNode;
};

// Single-user mode: the gate already authenticated the human,
// so the owner profile (id = 1) is always the current user.
export function AuthContextProvider({
  children
}: AuthContextProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const { replace } = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(({ user: owner }) => {
        if (cancelled) return;
        setUser({
          id: String(owner.id),
          bio: owner.bio,
          name: owner.display_name,
          theme: null,
          accent: 'yellow',
          website: null,
          location: null,
          username: owner.username,
          photoURL: '/api/yajuter/avatar',
          verified: false,
          following: [],
          followers: [],
          createdAt: fromISO(owner.created_at),
          updatedAt: null,
          totalTweets: owner.totalTweets,
          totalPhotos: owner.totalPhotos,
          pinnedTweet: null,
          coverPhotoURL: null
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    await replace('/gate');
  };

  const signOut = async (): Promise<void> => {
    try {
      await fetch('/api/yajuter/gate', { method: 'DELETE' });
    } catch {
      // cookie may already be gone; still leave
    }
    setUser(null);
    await replace('/gate');
  };

  const isAdmin = !!user;
  const randomSeed = useMemo(getRandomId, [user?.id]);

  const value: AuthContext = {
    user,
    error,
    loading,
    isAdmin,
    randomSeed,
    userBookmarks: null,
    signOut,
    signInWithGoogle
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContext {
  const context = useContext(AuthContext);

  if (!context)
    throw new Error('useAuth must be used within an AuthContextProvider');

  return context;
}
