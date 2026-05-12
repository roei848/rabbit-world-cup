import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import * as crypto from 'crypto';
import { scorePick, DEFAULT_SCORING, type ScoringSettings, type Stage } from './scoring';

initializeApp();

const db = getFirestore();

// ── API-Football types ────────────────────────────────────────
interface ApiFixtureStatus {
  short: string;
  elapsed: number | null;
}

interface WCPlayer {
  id: number;
  name: string;
  teamCode: string;
}

interface ApiPlayerItem {
  player: { id: number; name: string };
  statistics: Array<{ team: { id: number; code: string; name: string } }>;
}

interface ApiPlayersResponse {
  response: ApiPlayerItem[];
  paging: { current: number; total: number };
}

interface ApiFixtureInfo {
  id: number;
  date: string;
  status: ApiFixtureStatus;
}

interface ApiTeam {
  id: number;
  name: string;
  code: string | null;
}

interface ApiGoals {
  home: number | null;
  away: number | null;
}

interface ApiLeague {
  id: number;
  round: string;
}

interface ApiFixture {
  fixture: ApiFixtureInfo;
  league: ApiLeague;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
}

interface ApiResponse {
  response: ApiFixture[];
}

interface ApiTopScorerItem {
  player: { id: number; name: string };
  statistics: Array<{ goals: { total: number | null } }>;
}

interface ApiTopScorersResponse {
  response: ApiTopScorerItem[];
}

// ── Helpers ───────────────────────────────────────────────────

export function deriveWinner(
  score: { home: number; away: number },
  homeCode: string,
  awayCode: string
): string {
  return score.home >= score.away ? homeCode : awayCode;
}

function mapStatus(short: string): 'live' | 'finished' | 'upcoming' {
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(short)) return 'live';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  return 'upcoming';
}

function mapRound(round: string): 'group' | 'r16' | 'qf' | 'sf' | 'final' {
  const r = round.toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('round of 16')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'final';
  console.warn(`mapRound: unrecognised round "${round}" — defaulting to 'group'`);
  return 'group';
}

async function fetchFixtures(path: string): Promise<ApiFixture[]> {
  const apiKey = process.env['API_FOOTBALL_KEY'] ?? '';
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`api-football request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as ApiResponse;
  if (!Array.isArray(data.response)) {
    throw new Error(`api-football: unexpected response — 'response' is not an array`);
  }
  return data.response;
}

async function assertAdmin(uid: string): Promise<void> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists || snap.data()?.['isAdmin'] !== true) {
    throw new HttpsError('permission-denied', 'Admins only');
  }
}

async function getSeasonId(): Promise<number> {
  try {
    const snap = await db.doc('/settings/system').get();
    if (snap.exists) {
      const d = snap.data() as Record<string, unknown>;
      const val = d['apiFootballSeasonId'];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseInt(val, 10) || 2026;
    }
  } catch {
    // fall through
  }
  return 2026;
}

// ── joinLeague ────────────────────────────────────────────────
// Callable: authenticated user joins a league by providing its code.
// Verifies the code server-side before writing to Firestore so that
// neither memberIds nor leagueIds need client-writable rules.
export const joinLeague = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

  const { leagueId, code } = request.data as { leagueId: string; code: string };
  if (!leagueId || !code) throw new HttpsError('invalid-argument', 'leagueId and code are required');

  const leagueSnap = await db.collection('leagues').doc(leagueId).get();
  if (!leagueSnap.exists) throw new HttpsError('not-found', 'League not found');
  const league = leagueSnap.data()!;
  if (league['code'] !== code.toUpperCase().trim()) {
    throw new HttpsError('permission-denied', 'Incorrect league code');
  }
  if ((league['memberIds'] as string[]).includes(uid)) {
    return { success: true }; // Already a member — idempotent
  }

  const batch = db.batch();
  batch.update(db.collection('leagues').doc(leagueId), { memberIds: FieldValue.arrayUnion(uid) });
  batch.update(db.collection('users').doc(uid), { leagueIds: FieldValue.arrayUnion(leagueId) });
  await batch.commit();
  return { success: true };
});

// ── inviteUser ────────────────────────────────────────────────
// Callable: admin sends an invite link for a given email.
// Requires caller to have isAdmin custom claim.
export const inviteUser = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  await assertAdmin(uid);

  const { email, leagueId } = request.data as { email: string; leagueId?: string };
  if (!email) throw new HttpsError('invalid-argument', 'email is required');

  // Rate-limit: max 50 invites per admin per day
  const today = new Date().toISOString().split('T')[0];
  const auditRef = db.collection('auditLog');
  const todayCount = await auditRef
    .where('type', '==', 'invite-sent')
    .where('who', '==', uid)
    .where('when', '>=', new Date(today))
    .count()
    .get();

  if (todayCount.data().count >= 50) {
    throw new HttpsError('resource-exhausted', 'Invite limit reached for today (50/day)');
  }

  const token     = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.collection('invites').doc(token).set({
    email,
    invitedBy: uid,
    leagueId:  leagueId ?? null,
    used:      false,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  await auditRef.add({
    type:   'invite-sent',
    who:    uid,
    target: email,
    when:   FieldValue.serverTimestamp(),
  });

  // Email sending: requires SENDGRID_API_KEY env var.
  // Uncomment when SendGrid is configured:
  //
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  // const appUrl = process.env.APP_URL ?? 'https://your-app.web.app';
  // await sgMail.send({
  //   to: email,
  //   from: 'noreply@your-domain.com',
  //   subject: "You're invited to Black Rabbit World Cup 2026",
  //   html: `<p>Click to join: <a href="${appUrl}/invite/${token}">${appUrl}/invite/${token}</a></p>`,
  // });

  return { token, inviteUrl: `/invite/${token}` };
});

// ── onUserCreate ──────────────────────────────────────────────
// Blocking Auth trigger: validates that the new user has a valid
// invite before the account is created. If no valid invite exists,
// the registration is blocked.
export const onUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) throw new HttpsError('invalid-argument', 'No user data in event');

  // Look up an unused, non-expired invite for this email address
  const invitesSnap = await db
    .collection('invites')
    .where('email', '==', user.email ?? '')
    .where('used', '==', false)
    .where('expiresAt', '>', new Date())
    .limit(1)
    .get();

  if (invitesSnap.empty) {
    throw new HttpsError(
      'permission-denied',
      'No valid invite found for this email. Ask an admin to send you an invite.'
    );
  }

  const inviteDoc  = invitesSnap.docs[0];
  const inviteData = inviteDoc.data() as {
    email: string;
    invitedBy: string;
    leagueId: string | null;
    used: boolean;
    expiresAt: FirebaseFirestore.Timestamp;
  };

  // Create the user doc and mark the invite used in a batch
  const batch = db.batch();

  batch.set(db.collection('users').doc(user.uid), {
    uid:         user.uid,
    displayName: user.displayName ?? user.email ?? 'Anonymous',
    email:       user.email ?? '',
    photoURL:    user.photoURL ?? null,
    isAdmin:     false,
    leagueIds:   inviteData.leagueId ? [inviteData.leagueId] : [],
    joinedAt:    FieldValue.serverTimestamp(),
    status:      'active',
  });

  batch.update(inviteDoc.ref, { used: true });

  batch.set(db.collection('auditLog').doc(), {
    type:   'user-joined',
    who:    user.uid,
    target: user.email,
    when:   FieldValue.serverTimestamp(),
  });

  await batch.commit();
});

// ── pollFootballAPI ───────────────────────────────────────────
// Scheduled every 1 minute. Fetches live scores from api-football.com
// and upserts existing /matches docs. Uses smart-skip to avoid
// unnecessary API calls when no live/imminent matches are present.
export const pollFootballAPI = onSchedule('every 1 minutes', async () => {
  const apiKey = process.env['API_FOOTBALL_KEY'] ?? '';
  if (!apiKey) {
    console.warn('pollFootballAPI: API_FOOTBALL_KEY is not set — skipping');
    return;
  }

  const now = new Date();
  const imminentCutoff = new Date(now.getTime() + 15 * 60 * 1000); // now + 15 min

  // Run full queries upfront to avoid double-querying
  const [liveSnap, imminentSnap] = await Promise.all([
    db.collection('matches').where('status', '==', 'live').get(),
    db
      .collection('matches')
      .where('kickoff', '>=', Timestamp.fromDate(now))
      .where('kickoff', '<=', Timestamp.fromDate(imminentCutoff))
      .get(),
  ]);

  const hasLiveOrImminent = !liveSnap.empty || !imminentSnap.empty;

  if (!hasLiveOrImminent) {
    // Check lastFullSync — if >60 min ago (or never), do a full sync of today's matches
    const settingsSnap = await db.doc('/settings/system').get();
    const settings = settingsSnap.exists
      ? (settingsSnap.data() as Record<string, unknown>)
      : {};
    const lastFullSync = settings['lastFullSync'];
    let shouldFullSync = true;
    if (lastFullSync instanceof Timestamp) {
      const minutesSince = (now.getTime() - lastFullSync.toDate().getTime()) / 60000;
      if (minutesSince < 60) shouldFullSync = false;
    }

    if (!shouldFullSync) {
      console.log('pollFootballAPI: no live/imminent matches and last full sync was recent — skipping');
      return;
    }

    // Full sync of today's matches
    const dateStr = now.toISOString().split('T')[0];
    const seasonId = await getSeasonId();
    console.log(`pollFootballAPI: full sync for ${dateStr}, season ${seasonId}`);
    const fixtures = await fetchFixtures(`/fixtures?season=${seasonId}&league=1&date=${dateStr}`);
    await upsertFixtures(fixtures);

    await db.doc('/settings/system').set(
      { lastFullSync: FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log(`pollFootballAPI: full sync complete — ${fixtures.length} fixture(s) processed`);
    return;
  }

  // Reuse snapshots from earlier queries to extract apiIds
  const apiIds = new Set<number>();
  for (const doc of [...liveSnap.docs, ...imminentSnap.docs]) {
    const d = doc.data() as Record<string, unknown>;
    if (typeof d['apiId'] === 'number') apiIds.add(d['apiId']);
  }

  if (apiIds.size === 0) {
    console.log('pollFootballAPI: no apiIds found for live/imminent matches — skipping');
    return;
  }

  const idsParam = Array.from(apiIds).join('-');
  console.log(`pollFootballAPI: fetching ${apiIds.size} fixture(s): ${idsParam}`);
  const fixtures = await fetchFixtures(`/fixtures?ids=${idsParam}`);
  await upsertFixtures(fixtures);
  console.log(`pollFootballAPI: upserted ${fixtures.length} fixture(s)`);
});

async function upsertFixtures(fixtures: ApiFixture[]): Promise<void> {
  for (const f of fixtures) {
    const matchId = String(f.fixture.id);
    const status = mapStatus(f.fixture.status.short);
    const score =
      status === 'live' || status === 'finished'
        ? { home: f.goals.home ?? 0, away: f.goals.away ?? 0 }
        : null;
    const liveMinute: number | null = f.fixture.status.elapsed ?? null;

    const ref = db.collection('matches').doc(matchId);
    try {
      await ref.update({
        status,
        score,
        liveMinute,
      });
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 5) {
        console.log(`upsertFixtures: doc ${matchId} not found — skipping`);
      } else {
        console.error(`upsertFixtures: failed to update doc ${matchId}:`, err);
      }
    }
  }
}

// ── lockPicks ─────────────────────────────────────────────────
// Scheduled every 5 minutes. Finds matches whose lockAt time has
// passed but are not yet marked as locked, and batch-updates them.
export const lockPicks = onSchedule('every 5 minutes', async () => {
  const now = Timestamp.now();

  const snap = await db
    .collection('matches')
    .where('lockAt', '<=', now)
    .where('locked', '==', false)
    .get();

  if (snap.empty) {
    console.log('lockPicks: no matches to lock');
    return;
  }

  // Firestore batch max is 500; chunk if necessary
  const docs = snap.docs;
  const BATCH_LIMIT = 500;
  let totalLocked = 0;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, { locked: true });
    }
    await batch.commit();
    totalLocked += chunk.length;
  }

  console.log(`lockPicks: locked ${totalLocked} match(es)`);
});

// ── seedTournament ────────────────────────────────────────────
// HTTPS callable (admin only). Fetches all WC 2026 fixtures from
// api-football.com and seeds /matches in Firestore.
export const seedTournament = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  await assertAdmin(uid);

  const apiKey = process.env['API_FOOTBALL_KEY'] ?? '';
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'API_FOOTBALL_KEY not configured');
  }

  const seasonId = await getSeasonId();
  console.log(`seedTournament: fetching WC fixtures for season ${seasonId}`);

  const fixtures = await fetchFixtures(`/fixtures?season=${seasonId}&league=1`);
  console.log(`seedTournament: received ${fixtures.length} fixture(s) from api-football`);

  const BATCH_LIMIT = 500;
  let seeded = 0;

  for (let i = 0; i < fixtures.length; i += BATCH_LIMIT) {
    const chunk = fixtures.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    for (const f of chunk) {
      const matchId = String(f.fixture.id);
      const kickoffDate = new Date(f.fixture.date);
      const lockAtDate = new Date(kickoffDate.getTime() - 15 * 60 * 1000);

      const homeCode =
        f.teams.home.code ?? f.teams.home.name.slice(0, 3).toUpperCase();
      const awayCode =
        f.teams.away.code ?? f.teams.away.name.slice(0, 3).toUpperCase();

      const ref = db.collection('matches').doc(matchId);
      batch.set(
        ref,
        {
          apiId: f.fixture.id,
          homeTeam: { code: homeCode, name: f.teams.home.name },
          awayTeam: { code: awayCode, name: f.teams.away.name },
          kickoff: Timestamp.fromDate(kickoffDate),
          lockAt: Timestamp.fromDate(lockAtDate),
          stage: mapRound(f.league.round),
          stageLabel: f.league.round,
          status: mapStatus(f.fixture.status.short),
          score: null,
          liveMinute: null,
          locked: false,
        },
        { merge: true }
      );
    }

    await batch.commit();
    seeded += chunk.length;
  }

  console.log(`seedTournament: seeded ${seeded} fixture(s)`);
  return { seeded };
});

// ── calculatePoints ───────────────────────────────────────────
// Firestore trigger: fires when a /matches/{matchId} document is updated.
// When the match transitions to 'finished', scores all picks and rebuilds
// leaderboard entries for every affected user.
export const calculatePoints = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data?.before.data() as Record<string, unknown> | undefined;
  const after  = event.data?.after.data()  as Record<string, unknown> | undefined;

  if (!before || !after) return;

  // Only run when transitioning to finished with a valid score
  if (before['status'] === 'finished') return;
  if (after['status'] !== 'finished') return;
  if (!after['score'] || typeof after['score'] !== 'object') return;

  const matchId = event.params.matchId;
  const score   = after['score'] as { home: number; away: number };
  const stage   = (after['stage'] as Stage) ?? 'group';

  console.log(`calculatePoints: scoring match ${matchId} (${stage}) — ${score.home}:${score.away}`);

  // 1. Read scoring settings with fallback to defaults
  let settings: ScoringSettings = DEFAULT_SCORING;
  try {
    const settingsSnap = await db.doc('/settings/scoring').get();
    if (settingsSnap.exists) {
      settings = { ...DEFAULT_SCORING, ...(settingsSnap.data() as Partial<ScoringSettings>) };
    }
  } catch (err) {
    console.warn('calculatePoints: failed to read /settings/scoring, using defaults:', err);
  }

  // 2. Query all picks for this match across all users/leagues
  const picksSnap = await db
    .collectionGroup('matches')
    .where('matchId', '==', matchId)
    .get();

  if (picksSnap.empty) {
    console.log(`calculatePoints: no picks found for match ${matchId}`);
    return;
  }

  console.log(`calculatePoints: found ${picksSnap.size} pick(s) for match ${matchId}`);

  // 3. Score each pick and write points + breakdown back
  const affectedUids = new Set<string>();
  const pickWritePromises: Promise<unknown>[] = [];

  for (const pickDoc of picksSnap.docs) {
    const pickData = pickDoc.data() as Record<string, unknown>;
    const homeGoals = pickData['homeGoals'];
    const awayGoals = pickData['awayGoals'];
    if (typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
      console.warn(`calculatePoints: pick ${pickDoc.ref.path} missing homeGoals/awayGoals — skipping`);
      continue;
    }
    const pickScore = { home: homeGoals, away: awayGoals };

    const result = scorePick(pickScore, score, settings, stage);
    const uid = pickData['userId'] as string | undefined;
    if (uid) affectedUids.add(uid);

    pickWritePromises.push(
      pickDoc.ref.set(
        {
          points:          result.points,
          pointsBreakdown: result.breakdown,
          scoredAt:        FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    );
  }

  const pickWriteResults = await Promise.allSettled(pickWritePromises);
  pickWriteResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`calculatePoints: failed to write pick result ${i}:`, r.reason);
    }
  });
  console.log(`calculatePoints: wrote points for ${pickWritePromises.length} pick(s)`);

  if (affectedUids.size === 0) return;

  // 4. Rebuild leaderboard entries for every affected user across all their leagues
  const affectedLeagueIds = new Set<string>();

  await Promise.all(
    Array.from(affectedUids).map(async (uid) => {
      // Read user doc to get leagueIds
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) return;

      const userData = userSnap.data() as { displayName?: string; leagueIds?: string[] };
      const leagueIds: string[] = userData.leagueIds ?? [];
      const displayName = userData.displayName ?? '';

      // Aggregate all scored picks for this user
      const allPicksSnap = await db
        .collectionGroup('matches')
        .where('userId', '==', uid)
        .get();

      let totalPoints = 0;
      let exactScores = 0;

      for (const p of allPicksSnap.docs) {
        const d = p.data() as Record<string, unknown>;
        if (d['points'] == null) continue;
        totalPoints += (d['points'] as number) ?? 0;
        const bd = d['pointsBreakdown'] as Record<string, boolean> | undefined;
        if (bd?.['exact'] === true) exactScores++;
      }

      // Write a leaderboard entry for each league this user belongs to
      await Promise.all(
        leagueIds.map(async (leagueId) => {
          affectedLeagueIds.add(leagueId);

          const entryRef = db
            .collection('leaderboard')
            .doc(leagueId)
            .collection('entries')
            .doc(uid);

          const existingSnap = await entryRef.get();
          const prevRank: number = existingSnap.exists
            ? ((existingSnap.data() as Record<string, unknown>)['rank'] as number) ?? 0
            : 0;

          await entryRef.set({
            userId:      uid,
            displayName,
            totalPoints,
            exactScores,
            rank:        0, // placeholder — recomputed below
            prevRank,
            lastUpdated: FieldValue.serverTimestamp(),
          });
        })
      );
    })
  );

  // 5. Recompute ranks for each affected league
  await Promise.all(
    Array.from(affectedLeagueIds).map(async (leagueId) => {
      const entriesSnap = await db
        .collection('leaderboard')
        .doc(leagueId)
        .collection('entries')
        .orderBy('totalPoints', 'desc')
        .orderBy('exactScores', 'desc')
        .get();

      const BATCH_LIMIT = 500;
      const docs = entriesSnap.docs;

      for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const chunk = docs.slice(i, i + BATCH_LIMIT);
        const batch = db.batch();
        for (let j = 0; j < chunk.length; j++) {
          batch.update(chunk[j].ref, { rank: i + j + 1 });
        }
        await batch.commit();
      }

      console.log(`calculatePoints: recomputed ranks for league ${leagueId} (${docs.length} entries)`);
    })
  );

  console.log(`calculatePoints: done — ${affectedUids.size} user(s), ${affectedLeagueIds.size} league(s)`);
});

// ── cacheWCPlayers ────────────────────────────────────────────
// HTTPS callable (admin only). Fetches all WC 2026 players from
// api-football.com (paginated) and caches them in /cache/wcPlayers.
export const cacheWCPlayers = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  await assertAdmin(uid);

  const apiKey = process.env['API_FOOTBALL_KEY'] ?? '';
  if (!apiKey) throw new HttpsError('failed-precondition', 'API_FOOTBALL_KEY not configured');

  const seasonId = await getSeasonId();

  const allPlayers: WCPlayer[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `https://v3.football.api-sports.io/players?league=1&season=${seasonId}&page=${page}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'x-apisports-key': apiKey },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error(`cacheWCPlayers: page ${page} failed with ${res.status} — skipping`);
        page++;
        continue;
      }
    } catch (fetchErr) {
      console.error(`cacheWCPlayers: page ${page} fetch error — skipping`, fetchErr);
      page++;
      continue;
    }

    const data = await res.json() as ApiPlayersResponse;
    totalPages = data.paging?.total ?? 1;

    for (const item of data.response ?? []) {
      const teamCode = item.statistics?.[0]?.team?.code ?? '';
      allPlayers.push({
        id: item.player.id,
        name: item.player.name,
        teamCode,
      });
    }
    page++;
  } while (page <= totalPages);

  if (allPlayers.length === 0) {
    console.warn('cacheWCPlayers: API returned 0 players — cache NOT written');
    return { count: 0 };
  }

  await db.doc('/cache/wcPlayers').set({
    players: allPlayers,
    cachedAt: FieldValue.serverTimestamp(),
    season: seasonId,
  });

  console.log(`cacheWCPlayers: cached ${allPlayers.length} players for season ${seasonId}`);
  return { count: allPlayers.length };
});

// ── settleBonuses ─────────────────────────────────────────────
// HTTPS callable (admin only). Run once after the tournament ends.
// Evaluates all bonus picks against the actual top scorer and WC winner,
// updates leaderboard entries, recomputes ranks, and marks the tournament settled.
export const settleBonuses = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  await assertAdmin(uid);

  // 1. Atomic idempotency check — claim the settlement lock in a transaction
  const sysRef = db.doc('/settings/system');
  let alreadySettled = false;
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(sysRef);
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    if (data['tournamentFinishedAt']) {
      alreadySettled = true;
      return; // abort the transaction without writing
    }
    // Atomically claim — write the marker now, before doing any work
    txn.set(sysRef, { tournamentFinishedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  if (alreadySettled) {
    throw new HttpsError('already-exists', 'Bonuses already settled. Clear tournamentFinishedAt to re-run.');
  }

  // 2. Find WC winner from final match
  const finalSnap = await db.collection('matches')
    .where('stage', '==', 'final')
    .where('status', '==', 'finished')
    .limit(1)
    .get();
  if (finalSnap.empty) throw new HttpsError('failed-precondition', 'Final match not yet finished');

  const finalMatch = finalSnap.docs[0].data() as {
    score: { home: number; away: number };
    homeTeam: { code: string; name: string };
    awayTeam: { code: string; name: string };
  };
  const { score, homeTeam, awayTeam } = finalMatch;
  const winnerCode = deriveWinner(score, homeTeam.code, awayTeam.code);

  // 3. Get top scorer from api-football
  const apiKey = process.env['API_FOOTBALL_KEY'] ?? '';
  if (!apiKey) throw new HttpsError('failed-precondition', 'API_FOOTBALL_KEY not configured');
  const seasonId = await getSeasonId();

  const tsRes = await fetch(
    `https://v3.football.api-sports.io/players/topscorers?league=1&season=${seasonId}`,
    { headers: { 'x-apisports-key': apiKey }, signal: AbortSignal.timeout(10_000) }
  );
  if (!tsRes.ok) throw new HttpsError('internal', `api-football topscorers failed: ${tsRes.status}`);
  const tsData = (await tsRes.json()) as ApiTopScorersResponse;
  if (!tsData.response?.length) throw new HttpsError('internal', 'No top scorer data');

  const topScorerApiId = String(tsData.response[0].player.id);
  const topScorerName  = tsData.response[0].player.name;

  // 4. Read bonus point values from settings
  let bonusPoints = { topScorer: 10, worldCupWinner: 15 };
  const scoringSnap = await db.doc('/settings/scoring').get();
  if (scoringSnap.exists) {
    const s = scoringSnap.data() as { bonusPoints?: { topScorer?: number; worldCupWinner?: number } };
    bonusPoints = {
      topScorer:      s.bonusPoints?.topScorer      ?? 10,
      worldCupWinner: s.bonusPoints?.worldCupWinner ?? 15,
    };
  }

  // 5. Scan bonusPicks and compute awards
  const bonusPicksSnap = await db.collection('bonusPicks').get();
  const awards: Array<{ uid: string; pts: number }> = [];

  for (const pickDoc of bonusPicksSnap.docs) {
    const pick = pickDoc.data() as {
      userId: string;
      topScorer: { playerId: string } | null;
      worldCupWinner: { teamCode: string } | null;
    };
    let pts = 0;
    if (pick.topScorer?.playerId === topScorerApiId) pts += bonusPoints.topScorer;
    if (pick.worldCupWinner?.teamCode === winnerCode)  pts += bonusPoints.worldCupWinner;
    if (pts > 0) awards.push({ uid: pickDoc.id, pts });
  }

  // 6. Update leaderboard entries
  const affectedLeagueIds = new Set<string>();

  const awardResults = await Promise.allSettled(awards.map(async ({ uid: awardUid, pts }) => {
    const userSnap = await db.collection('users').doc(awardUid).get();
    if (!userSnap.exists) return;
    const userData = userSnap.data() as { leagueIds?: string[] };
    const leagueIds = userData.leagueIds ?? [];

    await Promise.all(leagueIds.map(async (leagueId) => {
      affectedLeagueIds.add(leagueId);
      const entryRef = db.collection('leaderboard').doc(leagueId).collection('entries').doc(awardUid);
      await entryRef.set(
        { totalPoints: FieldValue.increment(pts), lastUpdated: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }));
  }));
  awardResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`settleBonuses: failed to update leaderboard for award ${i}:`, r.reason);
    }
  });

  // Recompute ranks — same pattern as calculatePoints
  await Promise.all(Array.from(affectedLeagueIds).map(async (leagueId) => {
    const entriesSnap = await db
      .collection('leaderboard').doc(leagueId).collection('entries')
      .orderBy('totalPoints', 'desc')
      .orderBy('exactScores', 'desc')
      .get();

    const BATCH_LIMIT = 500;
    const docs = entriesSnap.docs;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const chunk = docs.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      for (let j = 0; j < chunk.length; j++) batch.update(chunk[j].ref, { rank: i + j + 1 });
      await batch.commit();
    }
    console.log(`settleBonuses: recomputed ranks for league ${leagueId}`);
  }));

  // 7. Audit log
  await db.collection('auditLog').add({
    type:         'bonuses-settled',
    who:          uid,
    topScorerApiId,
    topScorerName,
    winnerCode,
    usersAwarded: awards.length,
    when:         FieldValue.serverTimestamp(),
  });

  console.log(`settleBonuses: ${awards.length} user(s) awarded — top scorer: ${topScorerName}, winner: ${winnerCode}`);
  return { topScorer: { apiId: topScorerApiId, name: topScorerName }, worldCupWinner: winnerCode, usersAwarded: awards.length };
});
