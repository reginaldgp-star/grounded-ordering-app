import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 1) Create a Firebase project
// 2) Add a Web App
// 3) Replace the values below with your firebaseConfig
const firebaseConfig = {
  apiKey: 'PASTE_API_KEY_HERE',
  authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_PROJECT_ID.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
