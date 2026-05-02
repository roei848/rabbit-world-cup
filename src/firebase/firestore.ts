import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import { db } from './client';

// ── Shared types ─────────────────────────────────────────────

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  isAdmin: boolean;
  leagueIds: string[];
  joinedAt: ReturnType<typeof serverTimestamp>;
  status: 'active' | 'banned';
}

export interface InviteDoc {
  email: string;
  invitedBy: string;
  leagueId: string | null;
  used: boolean;
  expiresAt: Date;
  createdAt: ReturnType<typeof serverTimestamp>;
}

export interface MatchDoc {
  apiId: number;
  homeTeam: { code: string; name: string };
  awayTeam: { code: string; name: string };
  kickoff: Timestamp;
  lockAt: Timestamp;
  stage: 'group' | 'r16' | 'qf' | 'sf' | 'final';
  stageLabel: string;
  status: 'upcoming' | 'live' | 'finished';
  score: { home: number; away: number } | null;
  liveMinute: number | null;
  locked: boolean;
}

// ── Converters ───────────────────────────────────────────────

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot, opts?: SnapshotOptions) =>
      snap.data(opts) as T,
  };
}

export const userConverter   = makeConverter<UserDoc>();
export const inviteConverter = makeConverter<InviteDoc>();
export const matchConverter  = makeConverter<MatchDoc>();

// ── Collection refs ──────────────────────────────────────────

function requireDb() {
  if (!db) throw new Error('Firebase not configured');
  return db;
}

export const usersCol   = () => collection(requireDb(), 'users').withConverter(userConverter);
export const invitesCol = () => collection(requireDb(), 'invites').withConverter(inviteConverter);
export const matchesCol = () => collection(requireDb(), 'matches').withConverter(matchConverter);

// ── Helpers ──────────────────────────────────────────────────

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(usersCol(), uid));
  return snap.exists() ? snap.data() : null;
}

export async function getInviteDoc(token: string): Promise<InviteDoc | null> {
  const snap = await getDoc(doc(invitesCol(), token));
  return snap.exists() ? snap.data() : null;
}

export async function createUserDoc(uid: string, data: Omit<UserDoc, 'joinedAt'>): Promise<void> {
  await setDoc(doc(usersCol(), uid), {
    ...data,
    joinedAt: serverTimestamp(),
  } as UserDoc);
}

export async function markInviteUsed(token: string): Promise<void> {
  await updateDoc(doc(invitesCol(), token), { used: true });
}
