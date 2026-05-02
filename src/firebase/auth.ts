import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './client';

const googleProvider = new GoogleAuthProvider();

function requireAuth() {
  if (!auth) throw new Error('Firebase not configured — fill in .env.local');
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(requireAuth(), googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function createEmailAccount(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export function signOut(): Promise<void> {
  return firebaseSignOut(requireAuth());
}

export function onAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
