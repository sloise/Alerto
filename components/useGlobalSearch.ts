import { useContext } from 'react';
import { LocationContext } from '../app/_layout';
import { useAccessibility } from './AccessibilityContext';

export interface SearchResult {
  id?: string;
  type?: string;
  name?: string;
  location?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  severity?: string;
}

export interface SearchConfig {
  query: string;
  filters: {
    isTyphoon: boolean;
    isEarthquake: boolean;
    isFlood: boolean;
    isFire: boolean;
    isEvacuation: boolean;
    isCustom: boolean;
  };
  accessibility: {
    isVoiceEnabled: boolean;
    isGestureEnabled: boolean;
    isLocationEnabled: boolean;
    textSizeMultiplier: number;
  };
  location: {
    current: string;
    latitude: number;
    longitude: number;
  };
}

// This hook will be used across all pages
export function useGlobalSearch() {
  const { inputModes, textSizeMultiplier } = useAccessibility();
  const locationContext = useContext(LocationContext);
  
  // Get enabled states from inputModes
  const isVoiceEnabled = inputModes.find(m => m.id === 'voice')?.enabled ?? false;
  const isGestureEnabled = inputModes.find(m => m.id === 'gesture')?.enabled ?? false;
  const isLocationEnabled = inputModes.find(m => m.id === 'location')?.enabled ?? false;
  
  // Safely extract location data with fallbacks
  const location = locationContext?.location || 'Unknown Location';
  const latitude = locationContext?.latitude || 0;
  const longitude = locationContext?.longitude || 0;

  const performGlobalSearch = (query: string, alerts: any[] = [], centers: any[] = []): { config: SearchConfig; results: SearchResult[] } => {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return {
        config: getSearchConfig(lowerQuery),
        results: []
      };
    }

    // Filter alerts based on query
    const filteredAlerts = alerts.filter(alert => {
      const alertType = alert.type?.toLowerCase() || "";
      const alertLocation = alert.location?.toLowerCase() || "";
      const alertDesc = alert.description?.toLowerCase() || "";
      const alertProvince = alert.province?.toLowerCase() || "";
      
      return (
        alertType.includes(lowerQuery) || 
        alertLocation.includes(lowerQuery) || 
        alertDesc.includes(lowerQuery) ||
        alertProvince.includes(lowerQuery)
      );
    });

    // Filter evacuation centers based on query
    const filteredCenters = centers.filter(center => {
      const centerName = center.name?.toLowerCase() || "";
      const centerLocation = center.location?.toLowerCase() || "";
      const centerAddress = center.address?.toLowerCase() || "";
      
      return (
        centerName.includes(lowerQuery) || 
        centerLocation.includes(lowerQuery) ||
        centerAddress.includes(lowerQuery)
      );
    });

    // Combine and sort results - prioritize closest matches
    const results = sortResultsByRelevance([...filteredAlerts, ...filteredCenters], lowerQuery);

    return {
      config: getSearchConfig(lowerQuery),
      results: results as SearchResult[]
    };
  };

  const sortResultsByRelevance = (results: any[], query: string): any[] => {
    return results.sort((a, b) => {
      const aType = a.type || a.name || "";
      const bType = b.type || b.name || "";
      
      // Exact match gets priority
      if (aType.toLowerCase() === query) return -1;
      if (bType.toLowerCase() === query) return 1;
      
      // Starts with query gets priority
      if (aType.toLowerCase().startsWith(query)) return -1;
      if (bType.toLowerCase().startsWith(query)) return 1;
      
      return 0;
    });
  };

  const getSearchConfig = (lowerQuery: string): SearchConfig => {
    return {
      query: lowerQuery,
      filters: {
        isTyphoon: lowerQuery.includes("typhoon") || lowerQuery.includes("tropical"),
        isEarthquake: lowerQuery.includes("earthquake") || lowerQuery.includes("quake"),
        isFlood: lowerQuery.includes("flood") || lowerQuery.includes("flooding"),
        isFire: lowerQuery.includes("fire") || lowerQuery.includes("wildfire"),
        isEvacuation: lowerQuery.includes("evacuation") || lowerQuery.includes("center") || lowerQuery.includes("shelter"),
        isCustom: lowerQuery !== "" && !["typhoon", "earthquake", "flood", "fire", "evacuation", "center", "tropical", "quake", "shelter", "wildfire"].some(t => lowerQuery.includes(t))
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

  return { 
    performGlobalSearch,
    isVoiceEnabled, 
    isGestureEnabled, 
    isLocationEnabled,
    textSizeMultiplier,
    location, 
    latitude, 
    longitude 
  };
}