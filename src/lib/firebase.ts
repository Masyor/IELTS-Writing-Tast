import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

// Try to use environment variables first, then fallback to config file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
};

// If env vars are missing, try to load from the local config file
// Note: We avoid top-level await for better environment compatibility
let finalConfig = firebaseConfig;
if (!firebaseConfig.apiKey) {
  // In a real environment with top-level await disabled, 
  // you might need to initialize firebase inside an async function.
  // For this app, we'll try to check if we can get it or just console warn.
  console.warn("Firebase configuration environment variables not found. Falling back to default if available.");
}

const app = finalConfig.apiKey ? initializeApp(finalConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = (app && finalConfig.firestoreDatabaseId) 
  ? getFirestore(app, finalConfig.firestoreDatabaseId) 
  : null;

// Teacher configuration
export const TEACHER_CONFIG = {
  DOMAIN: 'acecambodia.org', // Replace with your school domain, e.g., 'school.edu'
  WHITELIST: ['matt.longthorne@gmail.com'] // Specific emails that are always teachers
};

export const isTeacher = (user: any) => {
  if (!user || !user.email) return false;
  
  // Check whitelist first
  if (TEACHER_CONFIG.WHITELIST.includes(user.email)) return true;
  
  // Check domain wildcard (ensure email is verified in a real env)
  if (TEACHER_CONFIG.DOMAIN && user.email.endsWith(`@${TEACHER_CONFIG.DOMAIN}`)) {
    // For safety, you might want to check user.emailVerified === true here
    return true;
  }
  
  return user.role === 'teacher';
};

import { getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) {
    console.warn("Firebase Auth not initialized. Using mock login.");
    // Mock login for development if firebase setup failed
    const mockUser = {
      uid: 'mock-user-123',
      email: 'student@example.com',
      displayName: 'Mock Student',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    return mockUser;
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Auth Error:", error.code, error.message);
    if (error.code === 'auth/unauthorized-domain') {
      alert("This domain is not authorized in your Firebase Project. Please add your GitHub Pages URL to 'Authorized domains' in the Firebase Console (Authentication > Settings).");
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.log("The user closed the popup before finishing sign in.");
    } else {
      alert(`Login failed: ${error.message}`);
    }
    throw error;
  }
};

// Error handling helper as per instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-memory/localStorage mock if DB is not available
const mockStore: Record<string, any> = JSON.parse(localStorage.getItem('ielts_mock_store') || '{}');

const saveMock = () => {
  localStorage.setItem('ielts_mock_store', JSON.stringify(mockStore));
};

export const dbService = {
  async saveSubmission(submission: any) {
    if (db) {
      try {
        await setDoc(doc(db, 'submissions', submission.id), {
          ...submission,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `submissions/${submission.id}`);
      }
    } else {
      mockStore[submission.id] = submission;
      saveMock();
    }
  },

  async updateSubmission(id: string, updates: any) {
    if (db) {
      try {
        await updateDoc(doc(db, 'submissions', id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `submissions/${id}`);
      }
    } else {
      if (mockStore[id]) {
        mockStore[id] = { ...mockStore[id], ...updates };
        saveMock();
      }
    }
  },

  async getSubmissions(userId?: string) {
    if (db) {
      try {
        const q = userId 
          ? query(collection(db, 'submissions'), where('userId', '==', userId), orderBy('startedAt', 'desc'))
          : query(collection(db, 'submissions'), orderBy('startedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'submissions');
      }
    } else {
      const all = Object.values(mockStore);
      return userId ? all.filter(s => s.userId === userId) : all;
    }
    return [];
  },

  async getSubmission(id: string) {
    if (db) {
      try {
        const docRef = doc(db, 'submissions', id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `submissions/${id}`);
      }
    } else {
      return mockStore[id] || null;
    }
  },

  async deleteSubmission(id: string) {
    if (db) {
      try {
        const docRef = doc(db, 'submissions', id);
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `submissions/${id}`);
      }
    } else {
      delete mockStore[id];
      saveMock();
    }
  },

  async getUser(id: string) {
    if (db) {
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        return docSnap.exists() ? docSnap.data() : null;
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${id}`);
      }
    } else {
      return mockStore[`user_${id}`] || null;
    }
  },

  async createClass(teacherId: string, name: string) {
    const code = Math.random().toString(36).substring(2, 9).toUpperCase();
    const classData = {
      id: code,
      code,
      name,
      teacherId,
      createdAt: new Date().toISOString(),
      active: true
    };
    if (db) {
      try {
        await setDoc(doc(db, 'classes', code), classData);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `classes/${code}`);
      }
    } else {
      mockStore[`class_${code}`] = classData;
      saveMock();
    }
    return classData;
  },

  async joinClass(userId: string, code: string) {
    if (db) {
      try {
        const classRef = doc(db, 'classes', code);
        const classSnap = await getDoc(classRef);
        if (!classSnap.exists()) throw new Error('Invalid class code');
        if (classSnap.data().active === false) throw new Error('This class code has been retired');
        
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const currentClasses = userSnap.exists() && userData ? (userData.activeClassCodes || []) : [];
        if (!currentClasses.includes(code)) {
          await updateDoc(userRef, {
            activeClassCodes: [...currentClasses, code]
          });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
      }
    } else {
      const cls = mockStore[`class_${code}`];
      if (cls) {
        if (cls.active === false) throw new Error('This class code has been retired');
        const userKey = `user_${userId}`;
        const user = mockStore[userKey] || { uid: userId, activeClassCodes: [] };
        if (!user.activeClassCodes.includes(code)) {
          user.activeClassCodes = [...(user.activeClassCodes || []), code];
          mockStore[userKey] = user;
          saveMock();
        }
      } else {
        throw new Error('Invalid class code');
      }
    }
  },

  async getTeacherClasses(teacherId: string) {
    if (db) {
      try {
        const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'classes');
      }
    } else {
      return Object.values(mockStore).filter((item: any) => item.teacherId === teacherId && item.code);
    }
    return [];
  },

  async getSubmissionsByClasses(classCodes: string[]) {
    if (classCodes.length === 0) return [];
    if (db) {
      try {
        const q = query(collection(db, 'submissions'), where('classCode', 'in', classCodes), orderBy('startedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'submissions');
      }
    } else {
      return Object.values(mockStore).filter((item: any) => item.classCode && classCodes.includes(item.classCode) && item.testPackId);
    }
    return [];
  },

  async updateClass(id: string, updates: any) {
    if (db) {
      try {
        await updateDoc(doc(db, 'classes', id), updates);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `classes/${id}`);
      }
    } else {
      if (mockStore[`class_${id}`]) {
        mockStore[`class_${id}`] = { ...mockStore[`class_${id}`], ...updates };
        saveMock();
      }
    }
  }
};
