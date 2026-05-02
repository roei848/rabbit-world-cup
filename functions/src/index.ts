import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import * as crypto from 'crypto';

initializeApp();

const db = getFirestore();

// ── API-Football types ────────────────────────────────────────
interface ApiFixtureStatus {
  short: string;
  elapsed: number | null;
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

// ── Helpers ───────────────────────────────────────────────────

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
