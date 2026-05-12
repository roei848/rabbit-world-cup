/**
 * Unit tests for inviteUser rate-limiting helper: getAdminInviteCountToday
 *
 * Requires the Firestore emulator running on localhost:8080.
 * Start with: firebase emulators:start --only firestore
 *
 * IMPORTANT: env vars must be set BEFORE any import that triggers
 * firebase-admin initialization (i.e. before importing from ./index).
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getAdminInviteCountToday } from './index';
import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';

// Re-use the Firestore instance that index.ts already initialized
const db = getFirestore(getApp());
const auditLog = db.collection('auditLog');

/** Seed a batch of auditLog docs with a concrete JS Date and return their IDs */
async function seedAuditEntries(
  uid: string,
  count: number,
  when: Date,
  type = 'invite-sent',
): Promise<string[]> {
  const ids: string[] = [];
  const batch = db.batch();
  for (let i = 0; i < count; i++) {
    const ref = auditLog.doc();
    batch.set(ref, { type, who: uid, target: `user${i}@example.com`, when });
    ids.push(ref.id);
  }
  await batch.commit();
  return ids;
}

/** Delete a list of auditLog docs by ID */
async function cleanup(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = db.batch();
  ids.forEach((id) => batch.delete(auditLog.doc(id)));
  await batch.commit();
}

// Track all seeded doc IDs so we can clean up after each test
let seededIds: string[] = [];

beforeEach(async () => {
  await cleanup(seededIds);
  seededIds = [];
});

afterAll(async () => {
  await cleanup(seededIds);
});

/** Returns a Date representing start-of-today in UTC */
function startOfTodayUTC(): Date {
  const todayStr = new Date().toISOString().split('T')[0];
  return new Date(todayStr); // e.g. 2026-05-12T00:00:00.000Z
}

/** Returns a Date representing start-of-yesterday in UTC */
function startOfYesterdayUTC(): Date {
  const d = startOfTodayUTC();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

describe('getAdminInviteCountToday — rate-limit helper', () => {
  it('returns 0 when no invites have been sent today', async () => {
    const count = await getAdminInviteCountToday('admin-uid-zero');
    expect(count).toBe(0);
  });

  it("counts only today's invite-sent entries for the given uid", async () => {
    const uid = 'admin-uid-basic';
    const today = startOfTodayUTC();
    const ids = await seedAuditEntries(uid, 3, today);
    seededIds.push(...ids);

    const count = await getAdminInviteCountToday(uid);
    expect(count).toBe(3);
  });

  it("does not count yesterday's entries", async () => {
    const uid = 'admin-uid-yesterday';
    const today = startOfTodayUTC();
    const yesterday = startOfYesterdayUTC();

    const todayIds = await seedAuditEntries(uid, 5, today);
    const yesterdayIds = await seedAuditEntries(uid, 10, yesterday);
    seededIds.push(...todayIds, ...yesterdayIds);

    const count = await getAdminInviteCountToday(uid);
    // Only the 5 from today should be counted
    expect(count).toBe(5);
  });

  it('does not count other event types in auditLog', async () => {
    const uid = 'admin-uid-types';
    const today = startOfTodayUTC();

    const inviteIds = await seedAuditEntries(uid, 4, today, 'invite-sent');
    const otherIds = await seedAuditEntries(uid, 6, today, 'league-created');
    seededIds.push(...inviteIds, ...otherIds);

    const count = await getAdminInviteCountToday(uid);
    // Only 'invite-sent' type should be counted
    expect(count).toBe(4);
  });

  it('does not count entries from a different admin uid', async () => {
    const uid = 'admin-uid-target';
    const otherUid = 'admin-uid-other';
    const today = startOfTodayUTC();

    const targetIds = await seedAuditEntries(uid, 7, today);
    const otherIds = await seedAuditEntries(otherUid, 20, today);
    seededIds.push(...targetIds, ...otherIds);

    const count = await getAdminInviteCountToday(uid);
    // Only the 7 belonging to uid should be counted
    expect(count).toBe(7);
  });

  it('returns 49 when 49 invites sent today (under the limit)', async () => {
    const uid = 'admin-uid-49';
    const today = startOfTodayUTC();

    const ids = await seedAuditEntries(uid, 49, today);
    seededIds.push(...ids);

    const count = await getAdminInviteCountToday(uid);
    expect(count).toBe(49);
  });

  it('returns 50 when exactly 50 invites sent today (at the limit)', async () => {
    const uid = 'admin-uid-50';
    const today = startOfTodayUTC();

    const ids = await seedAuditEntries(uid, 50, today);
    seededIds.push(...ids);

    const count = await getAdminInviteCountToday(uid);
    expect(count).toBe(50);
  });
});
