/**
 * Firestore Security Rule tests for Black Rabbit World Cup 2026.
 *
 * Requires the Firestore emulator running on localhost:8080.
 * Start it with: firebase emulators:start --only firestore
 *
 * Run tests: npm run test:rules
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';

// ─── Environment setup ──────────────────────────────────────────────────────

const PROJECT_ID = 'rabbit-world-cup';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed baseline data using admin bypass (no rules applied).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Users
    await setDoc(doc(db, 'users', 'admin'), {
      isAdmin: true,
      leagueIds: [],
      displayName: 'Admin User',
    });
    await setDoc(doc(db, 'users', 'alice'), {
      isAdmin: false,
      leagueIds: ['league1'],
      displayName: 'Alice',
    });
    await setDoc(doc(db, 'users', 'bob'), {
      isAdmin: false,
      leagueIds: ['league1'],
      displayName: 'Bob',
    });
    await setDoc(doc(db, 'users', 'charlie'), {
      isAdmin: false,
      leagueIds: ['league2'],
      displayName: 'Charlie',
    });

    // Matches
    await setDoc(doc(db, 'matches', 'match1'), {
      locked: false,
      lockAt: Timestamp.fromMillis(Date.now() + 3_600_000), // 1h from now
      homeTeam: 'BRA',
      awayTeam: 'ARG',
    });
    await setDoc(doc(db, 'matches', 'match2'), {
      locked: true,
      lockAt: Timestamp.fromMillis(Date.now() - 3_600_000), // 1h ago
      homeTeam: 'GER',
      awayTeam: 'FRA',
    });

    // Leagues
    await setDoc(doc(db, 'leagues', 'league1'), {
      memberIds: ['alice', 'bob'],
      code: 'RABBIT7',
    });
    await setDoc(doc(db, 'leagues', 'league2'), {
      memberIds: ['charlie'],
      code: 'OTHER1',
    });

    // Settings — tournament in the future (allows bonusPicks writes)
    await setDoc(doc(db, 'settings', 'system'), {
      tournamentStartAt: Timestamp.fromMillis(Date.now() + 86_400_000 * 30),
    });

    // Invites
    await setDoc(doc(db, 'invites', 'token123'), {
      email: 'test@example.com',
      used: false,
    });

    // Audit log
    await setDoc(doc(db, 'auditLog', 'log1'), {
      type: 'point-adjustment',
      who: 'admin',
      when: Timestamp.now(),
    });

    // Leaderboard entry (subcollection)
    await setDoc(doc(db, 'leaderboard', 'league1', 'entries', 'alice'), {
      totalPoints: 10,
    });

    // Alice's existing pick for match1 (used in delete test)
    await setDoc(doc(db, 'picks', 'alice', 'matches', 'match1'), {
      userId: 'alice',
      matchId: 'match1',
      homeGoals: 1,
      awayGoals: 0,
      submittedAt: Timestamp.now(),
    });

    // Alice's existing bonus pick
    await setDoc(doc(db, 'bonusPicks', 'alice'), {
      userId: 'alice',
      topScorer: null,
      worldCupWinner: null,
    });
  });
});

// ─── Helper: build a valid pick payload ─────────────────────────────────────

function validPickPayload(uid: string, matchId: string) {
  return {
    userId: uid,
    matchId,
    homeGoals: 2,
    awayGoals: 1,
    submittedAt: Timestamp.now(),
  };
}

// ─── /users ──────────────────────────────────────────────────────────────────

describe('/users/{uid}', () => {
  test('authenticated user can read own user doc', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice')));
  });

  test('authenticated user can read user in same league', async () => {
    // alice and bob share league1
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'bob')));
  });

  test('authenticated user cannot read user in different league', async () => {
    // alice is in league1; charlie is in league2 only
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(aliceDb, 'users', 'charlie')));
  });

  test('user can update own displayName and photoURL', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice Updated',
        photoURL: 'https://example.com/photo.jpg',
      }),
    );
  });

  test('user cannot update own isAdmin field', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice'), { isAdmin: true }),
    );
  });

  test('user cannot update leagueIds (Cloud-Function-only)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice'), {
        leagueIds: ['league1', 'league3'],
      }),
    );
  });

  test('admin can read any user doc', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'users', 'charlie')));
  });
});

// ─── /picks/{uid}/matches/{matchId} ──────────────────────────────────────────

describe('/picks/{uid}/matches/{matchId}', () => {
  test('user can write pick for unlocked match', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(
        doc(aliceDb, 'picks', 'alice', 'matches', 'match1'),
        validPickPayload('alice', 'match1'),
      ),
    );
  });

  test('user cannot write pick for locked match', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(
        doc(aliceDb, 'picks', 'alice', 'matches', 'match2'),
        validPickPayload('alice', 'match2'),
      ),
    );
  });

  test('user cannot write pick for another user (cross-user denial)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    // alice tries to write a pick into bob's collection
    await assertFails(
      setDoc(
        doc(aliceDb, 'picks', 'bob', 'matches', 'match1'),
        validPickPayload('bob', 'match1'),
      ),
    );
  });

  test('user can read own pick', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      getDoc(doc(aliceDb, 'picks', 'alice', 'matches', 'match1')),
    );
  });

  test('admin can read any user pick', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(
      getDoc(doc(adminDb, 'picks', 'alice', 'matches', 'match1')),
    );
  });

  test('user cannot write pick with negative goal value', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'picks', 'alice', 'matches', 'match1'), {
        userId: 'alice',
        matchId: 'match1',
        homeGoals: -1,
        awayGoals: 0,
        submittedAt: Timestamp.now(),
      }),
    );
  });

  test('user cannot write pick with extra "points" field', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'picks', 'alice', 'matches', 'match1'), {
        userId: 'alice',
        matchId: 'match1',
        homeGoals: 1,
        awayGoals: 0,
        submittedAt: Timestamp.now(),
        points: 3, // disallowed field
      }),
    );
  });

  test('locked pick cannot be deleted by the owning user', async () => {
    // match2 is locked; alice already has a pick seeded for match1 (unlocked).
    // Seed a locked-match pick via admin bypass first.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'picks', 'alice', 'matches', 'match2'),
        {
          userId: 'alice',
          matchId: 'match2',
          homeGoals: 0,
          awayGoals: 0,
          submittedAt: Timestamp.now(),
        },
      );
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      deleteDoc(doc(aliceDb, 'picks', 'alice', 'matches', 'match2')),
    );
  });
});

// ─── /matches/{matchId} ──────────────────────────────────────────────────────

describe('/matches/{matchId}', () => {
  test('authenticated user can read match', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'matches', 'match1')));
  });

  test('client cannot write match (Cloud-Function-only path)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'matches', 'newMatch'), {
        locked: false,
        lockAt: Timestamp.now(),
      }),
    );
  });

  test('admin cannot write match (write: if false applies to all)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertFails(
      setDoc(doc(adminDb, 'matches', 'newMatch'), { locked: false }),
    );
  });
});

// ─── /leaderboard ────────────────────────────────────────────────────────────

describe('/leaderboard', () => {
  test('authenticated user can read leaderboard entry', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      getDoc(doc(aliceDb, 'leaderboard', 'league1', 'entries', 'alice')),
    );
  });

  test('client cannot write leaderboard entry (Cloud-Function-only path)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'leaderboard', 'league1', 'entries', 'alice'), {
        totalPoints: 99,
      }),
    );
  });

  test('admin cannot write leaderboard (write: if false applies to all)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertFails(
      setDoc(doc(adminDb, 'leaderboard', 'league1', 'entries', 'bob'), {
        totalPoints: 5,
      }),
    );
  });
});

// ─── /leagues/{leagueId} ─────────────────────────────────────────────────────

describe('/leagues/{leagueId}', () => {
  test('authenticated user can read any league', async () => {
    const charlieDb = testEnv.authenticatedContext('charlie').firestore();
    await assertSucceeds(getDoc(doc(charlieDb, 'leagues', 'league1')));
  });

  test('non-admin cannot write a league', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'leagues', 'newLeague'), { code: 'HACK99' }),
    );
  });

  test('admin can write a league', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(
      setDoc(doc(adminDb, 'leagues', 'newLeague'), {
        memberIds: [],
        code: 'NEWCODE',
      }),
    );
  });
});

// ─── /bonusPicks/{uid} ───────────────────────────────────────────────────────

describe('/bonusPicks/{uid}', () => {
  test('user can write bonus pick before tournament start', async () => {
    // settings/system.tournamentStartAt is 30 days in the future (seeded in beforeEach)
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'bonusPicks', 'alice'), {
        userId: 'alice',
        topScorer: {
          playerId: 'p1',
          playerName: 'Messi',
          submittedAt: Timestamp.now(),
        },
        worldCupWinner: { teamCode: 'BRA', submittedAt: Timestamp.now() },
      }),
    );
  });

  test('user cannot write bonus pick for another user', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'bonusPicks', 'bob'), {
        userId: 'bob',
        topScorer: null,
        worldCupWinner: null,
      }),
    );
  });

  test('user cannot write bonus pick after tournament start', async () => {
    // Update settings/system so tournament is in the past
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'system'), {
        tournamentStartAt: Timestamp.fromMillis(Date.now() - 86_400_000),
      });
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'bonusPicks', 'alice'), {
        userId: 'alice',
        topScorer: null,
        worldCupWinner: null,
      }),
    );
  });

  test('admin can read any bonus pick', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'bonusPicks', 'alice')));
  });
});

// ─── /settings ───────────────────────────────────────────────────────────────

describe('/settings', () => {
  test('authenticated user can read settings', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'settings', 'system')));
  });

  test('non-admin cannot write settings', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'settings', 'system'), {
        tournamentStartAt: Timestamp.now(),
      }),
    );
  });

  test('admin can write settings', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(
      setDoc(doc(adminDb, 'settings', 'system'), {
        tournamentStartAt: Timestamp.fromMillis(Date.now() + 86_400_000 * 60),
      }),
    );
  });

  test('unauthenticated user cannot read settings', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'settings', 'system')));
  });
});

// ─── /invites/{token} ────────────────────────────────────────────────────────

describe('/invites/{token}', () => {
  test('unauthenticated user can get invite by token (bearer access)', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(unauthDb, 'invites', 'token123')));
  });

  test('non-admin cannot list invites (enumeration prevention)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDocs(collection(aliceDb, 'invites')));
  });

  test('admin can list invites', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(getDocs(collection(adminDb, 'invites')));
  });

  test('non-admin cannot write invite', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'invites', 'newtoken'), {
        email: 'hacker@example.com',
        used: false,
      }),
    );
  });

  test('admin can write invite', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(
      setDoc(doc(adminDb, 'invites', 'admintoken'), {
        email: 'newuser@example.com',
        used: false,
      }),
    );
  });

  test('unauthenticated user cannot write invite', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(unauthDb, 'invites', 'newtoken'), {
        email: 'hacker@example.com',
        used: false,
      }),
    );
  });
});

// ─── /auditLog/{logId} ───────────────────────────────────────────────────────

describe('/auditLog/{logId}', () => {
  test('non-admin cannot read audit log', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(aliceDb, 'auditLog', 'log1')));
  });

  test('admin can read audit log', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'auditLog', 'log1')));
  });

  test('client cannot write audit log (Cloud-Function-only path)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'auditLog', 'newLog'), {
        type: 'fake-entry',
        who: 'alice',
        when: Timestamp.now(),
      }),
    );
  });

  test('admin cannot write audit log (write: if false applies to all)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    await assertFails(
      setDoc(doc(adminDb, 'auditLog', 'newLog'), {
        type: 'admin-entry',
        who: 'admin',
        when: Timestamp.now(),
      }),
    );
  });

  test('unauthenticated user cannot read audit log', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'auditLog', 'log1')));
  });
});
