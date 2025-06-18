import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User } from './types';
import { SecurityManager } from './security';
import { AuthErrorHandler } from './error-handler';
import { AuthDataCache } from './cache';

export class AuthManager {
  async signInWithEmail(email: string, password: string): Promise<User> {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    };
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    if (!this.validatePassword(password)) {
      throw new Error('Password too weak');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    };
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    };
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        callback(null);
      }
    });
  }

  async getIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return await user.getIdToken();
  }

  async refreshToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return await user.getIdToken(true);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    const validation = SecurityManager.validatePasswordStrength(password);
    return validation.isValid;
  }
}