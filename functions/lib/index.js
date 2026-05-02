"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = exports.inviteUser = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const identity_1 = require("firebase-functions/v2/identity");
const crypto = __importStar(require("crypto"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// ── inviteUser ────────────────────────────────────────────────
// Callable: admin sends an invite link for a given email.
// Requires caller to have isAdmin custom claim.
exports.inviteUser = (0, https_1.onCall)(async (request) => {
    // Verify admin via custom claims (set via Firebase Auth console or admin SDK)
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in');
    const callerClaims = request.auth?.token;
    if (!callerClaims?.['isAdmin'])
        throw new https_1.HttpsError('permission-denied', 'Admins only');
    const { email, leagueId } = request.data;
    if (!email)
        throw new https_1.HttpsError('invalid-argument', 'email is required');
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
        throw new https_1.HttpsError('resource-exhausted', 'Invite limit reached for today (50/day)');
    }
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.collection('invites').doc(token).set({
        email,
        invitedBy: uid,
        leagueId: leagueId ?? null,
        used: false,
        expiresAt,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await auditRef.add({
        type: 'invite-sent',
        who: uid,
        target: email,
        when: firestore_1.FieldValue.serverTimestamp(),
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
exports.onUserCreated = (0, identity_1.beforeUserCreated)(async (event) => {
    const user = event.data;
    if (!user)
        throw new https_1.HttpsError('invalid-argument', 'No user data in event');
    // Look up an unused, non-expired invite for this email address
    const invitesSnap = await db
        .collection('invites')
        .where('email', '==', user.email ?? '')
        .where('used', '==', false)
        .where('expiresAt', '>', new Date())
        .limit(1)
        .get();
    if (invitesSnap.empty) {
        throw new https_1.HttpsError('permission-denied', 'No valid invite found for this email. Ask an admin to send you an invite.');
    }
    const inviteDoc = invitesSnap.docs[0];
    const inviteData = inviteDoc.data();
    // Create the user doc and mark the invite used in a batch
    const batch = db.batch();
    batch.set(db.collection('users').doc(user.uid), {
        uid: user.uid,
        displayName: user.displayName ?? user.email ?? 'Anonymous',
        email: user.email ?? '',
        photoURL: user.photoURL ?? null,
        isAdmin: false,
        leagueIds: inviteData.leagueId ? [inviteData.leagueId] : [],
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
        status: 'active',
    });
    batch.update(inviteDoc.ref, { used: true });
    batch.set(db.collection('auditLog').doc(), {
        type: 'user-joined',
        who: user.uid,
        target: user.email,
        when: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
});
//# sourceMappingURL=index.js.map