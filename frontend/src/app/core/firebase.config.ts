export interface FirebaseWebConfig {
  projectId: string;
  appId: string;
  storageBucket: string;
  apiKey?: string;
  authDomain: string;
  messagingSenderId: string;
}

/**
 * Firebase Web App metadata (non-sensitive identifiers).
 * Any runtime API key is loaded dynamically from /api/rpc/cloud.firebaseConfig
 * or backend/.env so no key string is ever committed to GitHub.
 */
export const firebaseConfig: FirebaseWebConfig = {
  projectId: 'omnira-studio-11041651',
  appId: '1:309309845834:web:ed15160fa9145b561451b3',
  storageBucket: 'omnira-studio-11041651.firebasestorage.app',
  authDomain: 'omnira-studio-11041651.firebaseapp.com',
  messagingSenderId: '309309845834',
};
