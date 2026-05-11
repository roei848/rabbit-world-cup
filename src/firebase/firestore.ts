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

export interface PickDoc {
  userId: string;
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  submittedAt: Timestamp | null;
  lockedAt: Timestamp | null;
  points: number | null;
  pointsBreakdown: {
    exact: boolean;
    correctGap: boolean;
    correctWinner: boolean;
  } | null;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  exactScores: number;
  rank: number;
  prevRank: number;
  lastUpdated?: Timestamp;
}

export interface BonusPickDoc {
  userId: string;
  topScorer: { playerId: string; playerName: string; submittedAt: Timestamp } | null;
  worldCupWinner: { teamCode: string; submittedAt: Timestamp } | null;
}

// ── Converters ───────────────────────────────────────────────

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot, opts?: SnapshotOptions) =>
      snap.data(opts) as T,
  };
}

export const userConverter            = makeConverter<UserDoc>();
export const inviteConverter          = makeConverter<InviteDoc>();
export const matchConverter           = makeConverter<MatchDoc>();
export const pickConverter            = makeConverter<PickDoc>();
export const leaderboardEntryConverter = makeConverter<LeaderboardEntry>();
export const bonusPickConverter        = makeConverter<BonusPickDoc>();

// ── Collection refs ──────────────────────────────────────────

function requireDb() {
  if (!db) throw new Error('Firebase not configured');
  return db;
}

export const usersCol   = () => collection(requireDb(), 'users').withConverter(userConverter);
export const invitesCol = () => collection(requireDb(), 'invites').withConverter(inviteConverter);
export const matchesCol = () => collection(requireDb(), 'matches').withConverter(matchConverter);
export function picksCol(uid: string) {
  return collection(requireDb(), 'picks', uid, 'matches').withConverter(pickConverter);
}
export function leaderboardEntriesCol(leagueId: string) {
  return collection(requireDb(), 'leaderboard', leagueId, 'entries').withConverter(leaderboardEntryConverter);
}
export function bonusPickDoc(uid: string) {
  return doc(requireDb(), 'bonusPicks', uid).withConverter(bonusPickConverter);
}

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
