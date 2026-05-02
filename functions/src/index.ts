import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import * as crypto from 'crypto';

initializeApp();

const db = getFirestore();

// ── inviteUser ────────────────────────────────────────────────
// Callable: admin sends an invite link for a given email.
// Requires caller to have isAdmin custom claim.
export const inviteUser = onCall(async (request) => {
  // Verify admin via custom claims (set via Firebase Auth console or admin SDK)
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

  const callerClaims = request.auth?.token;
  if (!callerClaims?.['isAdmin']) throw new HttpsError('permission-denied', 'Admins only');

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
