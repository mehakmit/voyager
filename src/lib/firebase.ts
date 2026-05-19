import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCQ9fvZTquT0b3jHsC8nARun1nRqu97XGU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'voyager-301a2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'voyager-301a2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'voyager-301a2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '947837806868',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:947837806868:web:6405c9b0373d9c1796ba01',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
