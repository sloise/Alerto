import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import * as SecureStore from 'expo-secure-store';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  createdAt: Date;
}

// Sign Up
export const signUp = async (email: string, password: string, name: string) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with name
    await updateProfile(user, { displayName: name });
    
    // Save additional user data to Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email!,
      name: name,
      createdAt: new Date(),
    };
    
    await setDoc(doc(db, "users", user.uid), userData);
    
    // Store user session
    await SecureStore.setItemAsync('userSession', JSON.stringify(userData));
    
    return { success: true, user: userData };
  } catch (error: any) {
    console.error("Sign up error:", error);
    let message = "Sign up failed";
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = "Email already registered";
        break;
      case 'auth/invalid-email':
        message = "Invalid email format";
        break;
      case 'auth/weak-password':
        message = "Password should be at least 6 characters";
        break;
      default:
        message = error.message;
    }
    
    return { success: false, error: message };
  }
};

// Sign In
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data() as UserData;
    
    // Store user session
    await SecureStore.setItemAsync('userSession', JSON.stringify(userData));
    
    return { success: true, user: userData };
  } catch (error: any) {
    console.error("Sign in error:", error);
    let message = "Sign in failed";
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = "User not found";
        break;
      case 'auth/wrong-password':
        message = "Wrong password";
        break;
      case 'auth/invalid-email':
        message = "Invalid email format";
        break;
      case 'auth/too-many-requests':
        message = "Too many attempts. Try again later";
        break;
      default:
        message = error.message;
    }
    
    return { success: false, error: message };
  }
};

// Sign Out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    await SecureStore.deleteItemAsync('userSession');
    return { success: true };
  } catch (error: any) {
    console.error("Sign out error:", error);
    return { success: false, error: error.message };
  }
};

// Get Current User
export const getCurrentUser = async () => {
  try {
    const session = await SecureStore.getItemAsync('userSession');
    if (session) {
      return JSON.parse(session);
    }
    
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      return userDoc.data();
    }
    
    return null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

// Reset Password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent" };
  } catch (error: any) {
    console.error("Reset password error:", error);
    let message = "Failed to send reset email";
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = "User not found";
        break;
      default:
        message = error.message;
    }
    
    return { success: false, error: message };
  }
};