import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const saveUserData = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, 'users', userId), userData);
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUserData = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};