import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const AUTHORIZED_EDITOR_EMAILS = [
  'muhammadnadeemfaisal82@gmail.com',
  'oneworldmovement6@gmail.com',
] as const;

export function isBootstrappedEditor(user: User | null): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  const normalized = user.email.toLowerCase();
  return (AUTHORIZED_EDITOR_EMAILS as readonly string[]).includes(normalized);
}

export async function signInEditorWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutEditor(): Promise<void> {
  await signOut(auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatReadableFirestoreError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    if (parsed.error) extracted = parsed.error;
  } catch {
    // Plain error message
  }

  if (extracted.includes('Quota exceeded')) {
    return 'Daily Firebase Firestore quota exceeded. The free tier quota resets tomorrow.';
  }
  if (
    extracted.includes('Missing or insufficient permissions') ||
    extracted.includes('permission-denied')
  ) {
    return 'Permission denied: Please sign in with your authorized editor Google account (muhammadnadeemfaisal82@gmail.com or oneworldmovement6@gmail.com).';
  }
  if (extracted.includes('popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing sign-in.';
  }
  if (extracted.includes('popup-blocked')) {
    return 'Your browser blocked the sign-in popup. Please allow popups and try again.';
  }
  return extracted || 'Unable to complete Firestore request.';
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
