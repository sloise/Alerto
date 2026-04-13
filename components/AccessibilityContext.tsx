import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

export interface InputMode {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

interface AccessibilityContextType {
  inputModes: InputMode[];
  setInputModes: (modes: InputMode[]) => void;
  textSizeMultiplier: number;
  setTextSizeMultiplier: (multiplier: number) => void;
  isLoading: boolean;
  isLocationEnabled: boolean;
}

const defaultValue: AccessibilityContextType = {
  inputModes: [
    { id: 'gesture', label: 'Gesture Control', icon: 'gesture', enabled: false },
    { id: 'voice', label: 'Voice Control', icon: 'voice', enabled: false },
    { id: 'largeText', label: 'Large Text', icon: 'large-text', enabled: false },
    { id: 'location', label: 'Location Services', icon: 'location', enabled: false },
  ],
  setInputModes: () => {},
  textSizeMultiplier: 1,
  setTextSizeMultiplier: () => {},
  isLoading: true,
  isLocationEnabled: false,
};

const AccessibilityContext = createContext<AccessibilityContextType>(defaultValue);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [inputModes, setInputModes] = useState<InputMode[]>(defaultValue.inputModes);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const isLocationEnabled = inputModes.find(m => m.id === 'location')?.enabled ?? false;

  // Load accessibility settings from Firebase on mount
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();

          if (data.inputModes && Array.isArray(data.inputModes)) {
            setInputModes(data.inputModes);
          }

          if (data.textSizeMultiplier) {
            const multiplier = Math.max(0.8, Math.min(1.5, data.textSizeMultiplier));
            setTextSizeMultiplier(multiplier);
          }
        }
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessibilitySettings();
  }, []);

  // Auto-save input modes to Firebase when they change
  useEffect(() => {
    const saveInputModes = async () => {
      const user = auth.currentUser;
      if (!user || isLoading) return;

      try {
        await setDoc(
          doc(db, 'users', user.uid),
          { inputModes, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (error) {
        console.warn('Failed to save input modes:', error);
      }
    };

    saveInputModes();
  }, [inputModes, isLoading]);

  // Auto-save text size multiplier to Firebase when it changes
  useEffect(() => {
    const saveTextSize = async () => {
      const user = auth.currentUser;
      if (!user || isLoading) return;

      try {
        await setDoc(
          doc(db, 'users', user.uid),
          { textSizeMultiplier, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (error) {
        console.warn('Failed to save text size multiplier:', error);
      }
    };

    saveTextSize();
  }, [textSizeMultiplier, isLoading]);

  return (
    <AccessibilityContext.Provider
      value={{
        inputModes,
        setInputModes,
        textSizeMultiplier,
        setTextSizeMultiplier,
        isLoading,
        isLocationEnabled,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }

  return context;
}

export default AccessibilityContext;