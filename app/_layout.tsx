// app/_layout.tsx
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createContext, useEffect, useRef, useState } from 'react';
import { AccessibilityProvider } from '../components/AccessibilityContext';
import "../firebaseConfig";
import { auth } from '../firebaseConfig';
import { fetchAndSaveEarthquakes } from "../services/earthquakeService";
import { fetchAndSaveTyphoons } from "../services/typhoonService";


export const LocationContext = createContext<{
  location: string;
  latitude: number | null;
  longitude: number | null;
}>({
  location: "Getting location...",
  latitude: null,
  longitude: null,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasFetched = useRef(false);
  const router = useRouter();
  const segments = useSegments();
  const [location, setLocation] = useState("Getting location...");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Navigation logic – only handle auth redirects.
  // Terms acceptance is already handled by the splash screen.
 useEffect(() => {
    if (loading) return;

    // DELAY THE REDIRECT CHECK
    const timer = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      const isModal = segments[0] === 'modal';
      const isTerms = segments[0] === 'terms';

      if (isModal || isTerms) return;

      if (user && inAuthGroup) {
        router.replace('/(tabs)/dashboard');
      } else if (!user && !inAuthGroup && !isTerms) {
        router.replace('/(auth)/login');
      }
    }, 2000); // Wait 2 seconds before redirecting

    return () => clearTimeout(timer);
  }, [user, loading, segments]);

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    const fetchData = async () => {
      await fetchAndSaveEarthquakes();
      await fetchAndSaveTyphoons();
      await getLocation();
    };
    
    fetchData();
  }, []);

   async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation("Location permission denied");
          return;
        }
        const coords = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });      
        setLatitude(coords.coords.latitude);
        setLongitude(coords.coords.longitude);
        const geocode = await Location.reverseGeocodeAsync({
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
        });
        if (geocode.length > 0) {
          const place = geocode[0];
          const cityName = place.city || place.district || place.subregion || "Unknown";
          const region = place.region || "";
          setLocation(`${cityName}, ${region}`);
        }
      } catch (error) {
        console.log("❌ Location error:", error);
        setLocation("Metro Manila");
      }
    }
  return (
    <AccessibilityProvider>
      <LocationContext.Provider value={{ location, latitude, longitude }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </LocationContext.Provider>
    </AccessibilityProvider>
  );
}