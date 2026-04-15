import * as Location from "expo-location";
import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export type AlertType = "earthquake" | "typhoon" | "flood" | "storm" | "fire" | "rain" | "heat";

export type AlertItem = {
  id: string;
  type: AlertType;
  level: string;
  title: string;
  desc: string;
  time: string;
  color: string;
  icon: any;
  raw: any;
  distance?: number;
  isLocationBased?: boolean;
};

export type AlertsContextType = {
  alerts: AlertItem[];
  filteredAlerts: AlertItem[];
  loading: boolean;
  mode: 'demo' | 'live';
  setMode: (mode: 'demo' | 'live') => void;
  setAlerts: (alerts: AlertItem[]) => void;
  setFilteredAlerts: (alerts: AlertItem[]) => void;
  setLoading: (loading: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  topAlerts: AlertItem[];
  lastRefresh: Date | null;
  liveError: string | null;
  refresh: () => void;
};

export const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  emergency: 5, severe: 4, warning: 3, strong: 3,
  watch: 2, moderate: 2, advisory: 1, minor: 1, light: 1,
};

function getTypeIcon(type: AlertType): any {
  switch (type) {
    case 'flood':      return require('../assets/images/flood.png');
    case 'earthquake': return require('../assets/images/earthquake.png');
    case 'typhoon':    return require('../assets/images/typhoon.png');
    default:           return null;
  }
}

function getEarthquakeLevel(mag: number): string {
  if (mag >= 7) return "SEVERE";
  if (mag >= 6) return "STRONG";
  if (mag >= 5) return "MODERATE";
  if (mag >= 4) return "LIGHT";
  return "MINOR";
}

function getEarthquakeColor(mag: number): string {
  if (mag >= 7) return "#8B0000";
  if (mag >= 6) return "#B71C1C";
  if (mag >= 5) return "#D62828";
  if (mag >= 4) return "#E07B39";
  return "#F9A825";
}

function getWeatherColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'emergency' || s === 'extreme') return "#8B0000";
  if (s === 'severe'    || s === 'warning') return "#D62828";
  if (s === 'watch'     || s === 'moderate') return "#E07B39";
  return "#F9A825";
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1)    return "Just now";
    if (diffMinutes < 60)   return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "Recently"; }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Provider ───────────────────────────────────────────────────────────────

export const AlertsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts]               = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [mode, setMode]                   = useState<'demo' | 'live'>('live');
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [lastRefresh, setLastRefresh]     = useState<Date | null>(null);
  const [liveError, setLiveError]         = useState<string | null>(null);

  const topAlerts = alerts.slice(0, 3);

  // ── Get user location ────────────────────────────────────────────────────
  const getUserLocation = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Permission denied");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(result);
      return result;
    } catch {
      const fallback = { lat: 14.5995, lng: 120.9842 };
      setUserLocation(fallback);
      return fallback;
    }
  }, []);

  // ── Live fetch ───────────────────────────────────────────────────────────
  const loadLiveAlerts = useCallback(async (loc: { lat: number; lng: number }) => {
    setLoading(true);
    setLiveError(null);
    try {
      // 1. USGS Earthquakes
      const usgsUrl =
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
        `&minmagnitude=3.5&minlatitude=4&maxlatitude=21` +
        `&minlongitude=116&maxlongitude=127&limit=20&orderby=time`;
      const usgsRes  = await fetch(usgsUrl);
      const usgsData = await usgsRes.json();

      const earthquakeAlerts: AlertItem[] = (usgsData.features || []).map((f: any) => {
        const p   = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const mag = p.mag ?? 0;
        return {
          id:             `usgs_${f.id}`,
          type:           "earthquake" as AlertType,
          level:          getEarthquakeLevel(mag),
          title:          `M${mag.toFixed(1)} Earthquake - ${p.place}`,
          desc:           `Depth: ${(f.geometry.coordinates[2] ?? 0).toFixed(1)} km • ${p.place}`,
          time:           formatTime(new Date(p.time).toISOString()),
          color:          getEarthquakeColor(mag),
          icon:           getTypeIcon('earthquake'),
          raw:            f,
          distance:       haversineDistance(loc.lat, loc.lng, lat, lng),
          isLocationBased: true,
        };
      });

      // 2. OpenWeatherMap Alerts
      let weatherAlerts: AlertItem[] = [];
      if (OPENWEATHER_API_KEY) {
        const owmUrl =
          `https://api.openweathermap.org/data/3.0/onecall?` +
          `lat=${loc.lat}&lon=${loc.lng}&exclude=minutely,hourly,daily&appid=${OPENWEATHER_API_KEY}`;
        const owmRes  = await fetch(owmUrl);
        const owmData = await owmRes.json();

        if (owmData.alerts?.length) {
          weatherAlerts = owmData.alerts.map((alert: any, i: number) => {
            const desc = alert.description?.toLowerCase() ?? '';
            let type: AlertType = 'storm';
            if (desc.includes('flood'))                        type = 'flood';
            else if (desc.includes('typhoon') || desc.includes('tropical')) type = 'typhoon';
            else if (desc.includes('fire'))                    type = 'fire';
            else if (desc.includes('rain'))                    type = 'rain';
            return {
              id:             `owm_${i}_${alert.start}`,
              type,
              level:          'WARNING',
              title:          alert.event,
              desc:           alert.description?.substring(0, 180) ?? '',
              time:           formatTime(new Date(alert.start * 1000).toISOString()),
              color:          getWeatherColor('warning'),
              icon:           getTypeIcon(type),
              raw:            alert,
              isLocationBased: true,
            };
          });
        }
      }

      const all = [...earthquakeAlerts, ...weatherAlerts].sort((a, b) => {
        const aDiff = SEVERITY_ORDER[a.level.toLowerCase()] || 0;
        const bDiff = SEVERITY_ORDER[b.level.toLowerCase()] || 0;
        if (aDiff !== bDiff) return bDiff - aDiff;
        if (a.distance && b.distance) return a.distance - b.distance;
        return 0;
      });

      setAlerts(all);
      setFilteredAlerts(all);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Live load error:", e);
      setLiveError("Could not fetch live data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Demo fetch ───────────────────────────────────────────────────────────
  const loadDemoAlerts = useCallback(async (loc: { lat: number; lng: number }) => {
    setLoading(true);
    setLiveError(null);
    try {
      // Dynamic import so the JSON is only loaded when needed
      const mockAlertsData = require('./(tabs)/mockAlerts.json');

      const earthquakeAlerts: AlertItem[] = mockAlertsData.earthquakes
        .filter((eq: any) => eq.magnitude >= 3.5)
        .map((eq: any) => ({
          id:             `eq_${eq.id}`,
          type:           "earthquake" as AlertType,
          level:          getEarthquakeLevel(eq.magnitude),
          title:          `M${eq.magnitude.toFixed(1)} Earthquake - ${eq.location}`,
          desc:           `Depth: ${eq.depth.toFixed(1)} km • ${eq.location}`,
          time:           formatTime(eq.timestamp),
          color:          getEarthquakeColor(eq.magnitude),
          icon:           getTypeIcon('earthquake'),
          raw:            eq,
          distance:       haversineDistance(loc.lat, loc.lng, eq.latitude, eq.longitude),
          isLocationBased: true,
        }));

      const weatherAlerts: AlertItem[] = mockAlertsData.weatherAlerts.map((alert: any) => ({
        id:             alert.id,
        type:           alert.type as AlertType,
        level:          alert.severity.toUpperCase(),
        title:          alert.title,
        desc:           alert.description.substring(0, 180),
        time:           formatTime(alert.effective),
        color:          getWeatherColor(alert.severity),
        icon:           getTypeIcon(alert.type as AlertType),
        raw:            alert,
        isLocationBased: true,
      }));

      const all = [...earthquakeAlerts, ...weatherAlerts].sort((a, b) => {
        const aDiff = SEVERITY_ORDER[a.level.toLowerCase()] || 0;
        const bDiff = SEVERITY_ORDER[b.level.toLowerCase()] || 0;
        if (aDiff !== bDiff) return bDiff - aDiff;
        if (a.distance && b.distance) return a.distance - b.distance;
        return 0;
      });

      setAlerts(all);
      setFilteredAlerts(all);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Demo load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Unified refresh ──────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const loc = userLocation ?? await getUserLocation();
    if (mode === 'demo') loadDemoAlerts(loc);
    else loadLiveAlerts(loc);
  }, [userLocation, mode, loadDemoAlerts, loadLiveAlerts, getUserLocation]);

  // ── Boot: fetch on mount ─────────────────────────────────────────────────
  useEffect(() => {
    getUserLocation().then((loc) => {
      if (mode === 'demo') loadDemoAlerts(loc);
      else loadLiveAlerts(loc);
    });
  }, []);

  // ── Re-fetch when mode changes ───────────────────────────────────────────
  useEffect(() => {
    if (!userLocation) return;
    if (mode === 'demo') loadDemoAlerts(userLocation);
    else loadLiveAlerts(userLocation);
  }, [mode]);

  // ── Auto-refresh every 5 min in live mode ────────────────────────────────
  useEffect(() => {
    if (!userLocation || mode !== 'live') return;
    const interval = setInterval(() => loadLiveAlerts(userLocation), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userLocation, mode]);

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        filteredAlerts,
        loading,
        mode,
        setMode,
        setAlerts,
        setFilteredAlerts,
        setLoading,
        userLocation,
        setUserLocation,
        topAlerts,
        lastRefresh,
        liveError,
        refresh,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = (): AlertsContextType => {
  const context = React.useContext(AlertsContext);
  if (!context) throw new Error('useAlerts must be used within AlertsProvider');
  return context;
};