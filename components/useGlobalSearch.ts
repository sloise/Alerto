import { useContext } from 'react';
import { LocationContext } from '../app/_layout';
import { useAccessibility } from './AccessibilityContext';

// This hook will be used across all pages
export function useGlobalSearch() {
  const { isVoiceEnabled, isGestureEnabled, isLocationEnabled, textSizeMultiplier } = useAccessibility();
  const locationContext = useContext(LocationContext);
  
  // Safely extract location data with fallbacks
  const location = locationContext?.location || 'Unknown Location';
  const latitude = locationContext?.latitude || 0;
  const longitude = locationContext?.longitude || 0;

  const performGlobalSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Return search configuration that each page can use
    return {
      query: lowerQuery,
      filters: {
        isTyphoon: lowerQuery === "typhoon",
        isEarthquake: lowerQuery === "earthquake",
        isFlood: lowerQuery.includes("flood"),
        isFire: lowerQuery.includes("fire"),
        isEvacuation: lowerQuery.includes("evacuation") || lowerQuery.includes("center"),
        isCustom: lowerQuery !== "" && !["typhoon", "earthquake", "flood", "fire", "evacuation", "center"].some(t => lowerQuery.includes(t))
      },
      accessibility: {
        isVoiceEnabled,
        isGestureEnabled,
        isLocationEnabled,
        textSizeMultiplier
      },
      location: {
        current: location,
        latitude,
        longitude
      }
    };
  };

  return { performGlobalSearch, isVoiceEnabled, isGestureEnabled, isLocationEnabled, location, latitude, longitude };
}