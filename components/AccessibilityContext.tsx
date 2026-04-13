import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

interface InputMode {
  id: string;
  label: string;
  icon: string;
  image: any;
  enabled: boolean;
}

interface AccessibilityContextType {
  inputModes: InputMode[];
  setInputModes: (modes: InputMode[]) => void;
  isVoiceEnabled: boolean;
  isGestureEnabled: boolean;
  isLocationEnabled: boolean;
  textSizeMultiplier: number;
  setTextSizeMultiplier: (multiplier: number) => void;
  loadAccessibilitySettings: () => Promise<void>;
}

export const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [inputModes, setInputModes] = useState<InputMode[]>([
    { id: 'gesture', label: 'Gesture Recognition', icon: 'hand-right', image: null, enabled: false },
    { id: 'voice', label: 'Voice Input', icon: 'microphone', image: null, enabled: false },
    { id: 'largeText', label: 'Large Text', icon: 'text', image: null, enabled: false },
    { id: 'location', label: 'Location Services', icon: 'location', image: null, enabled: false }
  ]);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1);

  // Load accessibility settings from Firestore on app start
  const loadAccessibilitySettings = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
         const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.inputModes) setInputModes(data.inputModes);
          if (data.textSizeMultiplier) setTextSizeMultiplier(data.textSizeMultiplier);
        }
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }
  };

  // Save settings to Firestore when they change
  const saveSettings = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          inputModes,
          textSizeMultiplier,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error('Error saving accessibility settings:', error);
      }
    }
  };

  useEffect(() => {
    loadAccessibilitySettings();
  }, []);

  useEffect(() => {
    saveSettings();
  }, [inputModes, textSizeMultiplier]);

  const isVoiceEnabled = inputModes.find(m => m.id === 'voice')?.enabled ?? false;
  const isGestureEnabled = inputModes.find(m => m.id === 'gesture')?.enabled ?? false;
  const isLocationEnabled = inputModes.find(m => m.id === 'location')?.enabled ?? false;
  return (
    <AccessibilityContext.Provider
      value={{
        inputModes,
        setInputModes,
        isVoiceEnabled,
        isGestureEnabled,
        isLocationEnabled,
        textSizeMultiplier,
        setTextSizeMultiplier,
        loadAccessibilitySettings,
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