import type {
  UserRow,
  PostRow,
  PilgrimageSpotRow,
  PilgrimageLogRow,
  AnniversaryRow,
  EventRow,
  QuoteRow,
  BadgeRow,
  BadgeUnlockRow,
  SearchHistoryRow,
  SettingsRow,
  PostStampRow,
  NoticeRow
} from './tables';

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

// Typed schema for supabase-js (kills `any` across all queries).
export type Database = {
  public: {
    Tables: {
      users: Table<UserRow>;
      posts: Table<PostRow>;
      pilgrimage_spots: Table<PilgrimageSpotRow>;
      pilgrimage_logs: Table<PilgrimageLogRow>;
      anniversaries: Table<AnniversaryRow>;
      events: Table<EventRow>;
      quotes: Table<QuoteRow>;
      badges: Table<BadgeRow>;
      badge_unlocks: Table<BadgeUnlockRow>;
      search_history: Table<SearchHistoryRow>;
      settings: Table<SettingsRow>;
      post_stamps: Table<PostStampRow>;
      notices: Table<NoticeRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
