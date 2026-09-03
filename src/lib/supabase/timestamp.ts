import type { Timestamp } from 'firebase/firestore';

// Firestore Timestamp adapter: lets fork components keep calling
// `.toDate()` while the data actually comes from Supabase ISO strings.
export function fromISO(iso: string | null | undefined): Timestamp {
  const date = iso ? new Date(iso) : new Date();
  const millis = date.getTime();
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
    toDate: () => date,
    toMillis: () => millis,
    isEqual: (other: Timestamp) =>
      other.seconds === Math.floor(millis / 1000) &&
      other.nanoseconds === (millis % 1000) * 1_000_000,
    toJSON: () => ({ seconds: Math.floor(millis / 1000) })
  } as unknown as Timestamp;
}
