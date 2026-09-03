// yajuter table row types (Supabase / Postgres).
// Mirrors supabase/schema.sql, ported from the PHP+MySQL version.

export type UserRow = {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_emoji: string;
  theme: string;
  created_at: string;
};

export type PostRow = {
  id: number;
  user_id: number;
  content: string;
  emotion_tag: string | null;
  image_path: string | null;
  like_count: number;
  bookmarked: boolean;
  pinned: boolean;
  reply_to: number | null;
  scheduled_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type PilgrimageSpotRow = {
  id: number;
  name: string;
  area: string;
  description: string | null;
  caution: string;
  is_public: boolean;
};

export type PilgrimageLogRow = {
  id: number;
  user_id: number;
  spot_id: number;
  visited_at: string;
  digital_only: boolean;
  memo: string | null;
  photo_path: string | null;
  created_at: string;
};

export type AnniversaryRow = {
  id: number;
  name: string;
  month: number;
  day: number;
  description: string | null;
};

export type EventRow = {
  id: number;
  user_id: number;
  title: string;
  event_date: string;
  memo: string | null;
  created_at: string;
};

export type QuoteRow = {
  id: number;
  text: string;
  reading: string | null;
  category: string | null;
  source: string | null;
  meaning: string | null;
  usage_note: string | null;
  created_at: string;
};

export type BadgeRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  metric: string;
  rarity: string | null;
};

export type BadgeUnlockRow = {
  id: number;
  user_id: number;
  badge_code: string;
  seen: boolean;
  unlocked_at: string;
};

export type SearchHistoryRow = {
  id: number;
  user_id: number;
  query: string;
  created_at: string;
};

export type SettingsRow = {
  user_id: number;
  theme: string;
  daily_goal: number;
  quiz_best_hard: number;
};

export type PostStampRow = {
  id: number;
  post_id: number;
  stamp: string;
  created_at: string;
};

export type NoticeRow = {
  id: number;
  title: string;
  body: string;
  kind: 'info' | 'culture' | 'update';
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

// yajuter emotion tags (must match the PHP version's emotion_tags()).
export const EMOTION_TAGS = [
  '迫真',
  '小並感',
  '察し',
  '呆',
  '棒読み',
  '憤怒',
  '適当',
  '震え声',
  '困惑',
  '使命感',
  '即答',
  '諸行無常'
] as const;

export type EmotionTag = typeof EMOTION_TAGS[number];

// yajuter stamps (must match the PHP version's stamp kinds).
export const STAMPS = [
  'いいぞ',
  '草',
  '微レ存',
  'たまげた',
  '114514',
  'まずい'
] as const;

export type Stamp = typeof STAMPS[number];

export const MAX_POST_LEN = 810;
export const PAGE_SIZE = 30;
