import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  query,
  where,
  increment,
  Timestamp,
  type FieldValue,
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
  joinedAt: Timestamp | FieldValue;
  status: 'active' | 'banned';
}

export interface InviteDoc {
  email: string;
  invitedBy: string;
  leagueId: string | null;
  used: boolean;
  expiresAt: Timestamp;
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

export interface LeagueDoc {
  name: string;
  code: string;
  color: 'pink' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';
  photoUrl?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface ScoringDoc {
  stageMultipliers: { group: number; r16: number; qf: number; sf: number; final: number };
  basePoints: { exactScore: number; correctGap: number; correctWinner: number };
  bonusPoints: { topScorer: number; worldCupWinner: number };
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
export const leagueConverter           = makeConverter<LeagueDoc>();
export const scoringConverter          = makeConverter<ScoringDoc>();

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
export const leaguesCol = () => collection(requireDb(), 'leagues').withConverter(leagueConverter);
export function leagueDoc(leagueId: string) {
  return doc(requireDb(), 'leagues', leagueId).withConverter(leagueConverter);
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

export async function joinLeague(leagueId: string, uid: string): Promise<void> {
  const db_ = requireDb();
  const batch = writeBatch(db_);
  batch.update(doc(leaguesCol(), leagueId), { memberIds: arrayUnion(uid) });
  batch.update(doc(usersCol(), uid), { leagueIds: arrayUnion(leagueId) });
  await batch.commit();
}

export async function findLeagueByCode(code: string): Promise<(LeagueDoc & { id: string }) | null> {
  const q = query(leaguesCol(), where('code', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { ...first.data(), id: first.id };
}

export const scoringDocRef = () =>
  doc(requireDb(), 'settings', 'scoring').withConverter(scoringConverter);

export async function getScoringDoc(): Promise<ScoringDoc | null> {
  const snap = await getDoc(scoringDocRef());
  return snap.exists() ? snap.data() : null;
}

export async function saveScoringDoc(data: ScoringDoc): Promise<void> {
  await setDoc(scoringDocRef(), data);
}

// ── Admin user helpers ───────────────────────────────────────

export async function updateUserRole(uid: string, isAdmin: boolean): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { isAdmin });
}

export async function updateUserStatus(uid: string, status: 'active' | 'banned'): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { status });
}

// ── Audit log ────────────────────────────────────────────────

export interface AuditLogEntry {
  type: 'point-adjustment';
  who: string;
  whoUid: string;
  target: string;
  targetUid: string;
  delta: number;
  reason: string;
  when: Timestamp;
}

export const auditLogConverter = makeConverter<AuditLogEntry>();
export const auditLogCol = () =>
  collection(requireDb(), 'auditLog').withConverter(auditLogConverter);

export async function applyPointAdjustment(
  adminDisplayName: string,
  adminUid: string,
  targetUser: { id: string; displayName: string; leagueIds: string[] },
  delta: number,
  reason: string,
): Promise<void> {
  const db_ = requireDb();
  const batch = writeBatch(db_);

  const logRef = doc(auditLogCol());
  batch.set(logRef, {
    type: 'point-adjustment',
    who: adminDisplayName,
    whoUid: adminUid,
    target: targetUser.displayName,
    targetUid: targetUser.id,
    delta,
    reason,
    when: Timestamp.now(),
  } as AuditLogEntry);

  for (const leagueId of targetUser.leagueIds) {
    const entryRef = doc(leaderboardEntriesCol(leagueId), targetUser.id);
    batch.set(entryRef, { totalPoints: increment(delta) }, { merge: true });
  }

  await batch.commit();
}
