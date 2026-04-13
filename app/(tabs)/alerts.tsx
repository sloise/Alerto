import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import AlertDetailModal from "../AlertDetailModal";
import { ScaledText } from "../ScaledText"; 
import mockAlertsData from './mockAlerts.json';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

type AlertType = "earthquake" | "typhoon" | "flood" | "storm" | "fire" | "rain" | "heat";

type AlertItem = {
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

type SeverityLevel = 'emergency' | 'warning' | 'watch' | 'advisory' | 'severe' | 'minor' | 'moderate' | 'strong' | 'light';

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "📋" },
  { id: "earthquake", label: "Earthquakes", icon: "🌋" },
  { id: "typhoon", label: "Typhoons", icon: "🌪️" },
  { id: "flood", label: "Floods", icon: "🌊" },
  { id: "storm", label: "Storms", icon: "⚡" },
  { id: "fire", label: "Fire", icon: "🔥" }
];

const SEVERITY_ORDER: Record<string, number> = {
  emergency: 5,
  severe: 4,
  warning: 3,
  strong: 3,
  watch: 2,
  moderate: 2,
  advisory: 1,
  minor: 1,
  light: 1,
};

function getTypeIcon(type: AlertType): any {
  switch (type) {
    case 'flood': return require('../../assets/images/flood.png');
    case 'earthquake': return require('../../assets/images/earthquake.png');
    case 'typhoon': return require('../../assets/images/typhoon.png');
    default: return null;
  }
}

function getEarthquakeLevel(magnitude: number): string {
  if (magnitude >= 7) return "SEVERE";
  if (magnitude >= 6) return "STRONG";
  if (magnitude >= 5) return "MODERATE";
  if (magnitude >= 4) return "LIGHT";
  return "MINOR";
}

function getEarthquakeColor(magnitude: number): string {
  if (magnitude >= 7) return "#8B0000";
  if (magnitude >= 6) return "#B71C1C";
  if (magnitude >= 5) return "#D62828";
  if (magnitude >= 4) return "#E07B39";
  return "#F9A825";
}

function getWeatherColor(severity: string): string {
  const sev = severity.toLowerCase();
  if (sev === 'emergency' || sev === 'extreme') return "#8B0000";
  if (sev === 'severe' || sev === 'warning') return "#D62828";
  if (sev === 'watch' || sev === 'moderate') return "#E07B39";
  return "#F9A825";
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString("en-PH", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Alerts() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>("active");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const defaultLoc = { lat: 14.5995, lng: 120.9842 };
        setUserLocation(defaultLoc);
        return defaultLoc;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const userLoc = { lat: location.coords.latitude, lng: location.coords.longitude };
      setUserLocation(userLoc);
      return userLoc;
    } catch {
      const defaultLoc = { lat: 14.5995, lng: 120.9842 };
      setUserLocation(defaultLoc);
      return defaultLoc;
    }
  }, []);

  // ── DEMO MODE ─────────────────────────────────────────────────────────────
  function loadDemoAlerts(loc: { lat: number; lng: number }) {
    setLoading(true);
    setLiveError(null);
    try {
      const earthquakeAlerts: AlertItem[] = mockAlertsData.earthquakes
        .filter((eq: any) => eq.magnitude >= 3.5)
        .map((eq: any) => ({
          id: `eq_${eq.id}`,
          type: "earthquake" as AlertType,
          level: getEarthquakeLevel(eq.magnitude),
          title: `M${eq.magnitude.toFixed(1)} Earthquake - ${eq.location}`,
          desc: `Depth: ${eq.depth.toFixed(1)} km • ${eq.location}`,
          time: formatTime(eq.timestamp),
          color: getEarthquakeColor(eq.magnitude),
          icon: getTypeIcon('earthquake'),
          raw: eq,
          distance: haversineDistance(loc.lat, loc.lng, eq.latitude, eq.longitude),
          isLocationBased: true,
        }));

      const weatherAlerts: AlertItem[] = mockAlertsData.weatherAlerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type as AlertType,
        level: alert.severity.toUpperCase(),
        title: alert.title,
        desc: alert.description.substring(0, 180),
        time: formatTime(alert.effective),
        color: getWeatherColor(alert.severity),
        icon: getTypeIcon(alert.type as AlertType),
        raw: alert,
        isLocationBased: true,
      }));

      const all = [...earthquakeAlerts, ...weatherAlerts].sort((a, b) => {
        const aSev = SEVERITY_ORDER[a.level.toLowerCase()] || 0;
        const bSev = SEVERITY_ORDER[b.level.toLowerCase()] || 0;
        if (aSev !== bSev) return bSev - aSev;
        if (a.distance && b.distance) return a.distance - b.distance;
        return 0;
      });

      setAlerts(all);
    } catch (e) {
      console.error("Demo load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── LIVE MODE ─────────────────────────────────────────────────────────────
  async function loadLiveAlerts(loc: { lat: number; lng: number }) {
    setLoading(true);
    setLiveError(null);
    try {
      // 1. USGS Earthquakes — Philippines bounding box
      const usgsUrl =
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
        `&minmagnitude=3.5&minlatitude=4&maxlatitude=21` +
        `&minlongitude=116&maxlongitude=127&limit=20&orderby=time`;

      const usgsRes = await fetch(usgsUrl);
      const usgsData = await usgsRes.json();

      const earthquakeAlerts: AlertItem[] = (usgsData.features || []).map((f: any) => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const mag = p.mag ?? 0;
        return {
          id: `usgs_${f.id}`,
          type: "earthquake" as AlertType,
          level: getEarthquakeLevel(mag),
          title: `M${mag.toFixed(1)} Earthquake - ${p.place}`,
          desc: `Depth: ${(f.geometry.coordinates[2] ?? 0).toFixed(1)} km • ${p.place}`,
          time: formatTime(new Date(p.time).toISOString()),
          color: getEarthquakeColor(mag),
          icon: getTypeIcon('earthquake'),
          raw: f,
          distance: haversineDistance(loc.lat, loc.lng, lat, lng),
          isLocationBased: true,
        };
      });

      // 2. OpenWeatherMap Alerts — centered on Philippines
      let weatherAlerts: AlertItem[] = [];
      if (OPENWEATHER_API_KEY) {
        const owmUrl =
          `https://api.openweathermap.org/data/3.0/onecall?` +
          `lat=${loc.lat}&lon=${loc.lng}&exclude=minutely,hourly,daily` +
          `&appid=${OPENWEATHER_API_KEY}`;

        const owmRes = await fetch(owmUrl);
        const owmData = await owmRes.json();

        if (owmData.alerts && owmData.alerts.length > 0) {
          weatherAlerts = owmData.alerts.map((alert: any, i: number) => {
            const desc = alert.description?.toLowerCase() ?? '';
            let type: AlertType = 'storm';
            if (desc.includes('flood')) type = 'flood';
            else if (desc.includes('typhoon') || desc.includes('tropical')) type = 'typhoon';
            else if (desc.includes('fire')) type = 'fire';
            else if (desc.includes('rain')) type = 'rain';

            return {
              id: `owm_${i}_${alert.start}`,
              type,
              level: 'WARNING',
              title: alert.event,
              desc: alert.description?.substring(0, 180) ?? '',
              time: formatTime(new Date(alert.start * 1000).toISOString()),
              color: getWeatherColor('warning'),
              icon: getTypeIcon(type),
              raw: alert,
              isLocationBased: true,
            };
          });
        }
      }

      const all = [...earthquakeAlerts, ...weatherAlerts].sort((a, b) => {
        const aSev = SEVERITY_ORDER[a.level.toLowerCase()] || 0;
        const bSev = SEVERITY_ORDER[b.level.toLowerCase()] || 0;
        if (aSev !== bSev) return bSev - aSev;
        if (a.distance && b.distance) return a.distance - b.distance;
        return 0;
      });

      setAlerts(all);
    } catch (e) {
      console.error("Live load error:", e);
      setLiveError("Could not fetch live data. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── LOAD ON MOUNT & MODE CHANGE ───────────────────────────────────────────
  useEffect(() => {
    getUserLocation().then((loc) => {
      if (!loc) return;
      if (mode === 'demo') loadDemoAlerts(loc);
      else loadLiveAlerts(loc);
    });
  }, [mode]);

  useEffect(() => {
    if (!userLocation) return;
    const interval = setInterval(() => {
      if (mode === 'live') loadLiveAlerts(userLocation);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userLocation, mode]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && appState !== "active" && userLocation && mode === 'live') {
        loadLiveAlerts(userLocation);
      }
      setAppState(state);
    });
    return () => subscription.remove();
  }, [appState, userLocation, mode]);

  const onRefresh = () => {
    setRefreshing(true);
    if (!userLocation) return;
    if (mode === 'demo') loadDemoAlerts(userLocation);
    else loadLiveAlerts(userLocation);
  };

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const selectedCategory = CATEGORIES.find(c => c.id === filter);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <ScaledText variant="h1" style={styles.headerTitle}>Alerts</ScaledText>
            <ScaledText variant="caption" style={styles.headerSub}>PAGASA & PHIVOLCS • {mode === 'live' ? 'Real-time' : 'Demo'} Updates</ScaledText>
          </View>
        </View>

        {/* DEMO / LIVE Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'demo' && styles.modeBtnActive]}
            onPress={() => setMode('demo')}
          >
            <ScaledText variant="label" style={[styles.modeBtnText, mode === 'demo' && styles.modeBtnTextActive]}>DEMO</ScaledText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'live' && styles.modeBtnLiveActive]}
            onPress={() => setMode('live')}
          >
            {mode === 'live' && <View style={styles.liveDot} />}
            <ScaledText variant="label" style={[styles.modeBtnText, mode === 'live' && styles.modeBtnTextActive]}>LIVE</ScaledText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D62828" />}
      >
        {/* Category Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <ScaledText variant="body" style={styles.dropdownLabel}>{selectedCategory?.label || "All Categories"}</ScaledText>
            <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#0D0D0D" />
          </Pressable>

          {showCategoryDropdown && (
            <View style={styles.dropdownMenu}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.dropdownItem, filter === cat.id && styles.dropdownItemActive]}
                  onPress={() => { setFilter(cat.id); setShowCategoryDropdown(false); }}
                >
                  <ScaledText style={[styles.dropdownItemIcon, { fontSize: 18 }]}>{cat.icon}</ScaledText>                  <ScaledText 
                    variant="body"
                    style={[styles.dropdownItemText, filter === cat.id && styles.dropdownItemTextActive]}
                  >
                    {cat.label}
                  </ScaledText>
                  {filter === cat.id && (
                    <Ionicons name="checkmark" size={18} color="#D62828" style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Mode info banner */}
        {mode === 'demo' && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <ScaledText variant="caption" style={styles.infoBannerText}>Showing sample data. Switch to LIVE for real-time alerts.</ScaledText>
          </View>
        )}

        {mode === 'live' && liveError && (
          <View style={[styles.infoBanner, styles.errorBanner]}>
            <Ionicons name="warning-outline" size={16} color="#D62828" />
            <ScaledText variant="caption" style={[styles.infoBannerText, { color: '#D62828' }]}>{liveError}</ScaledText>
          </View>
        )}

        {/* Alerts List */}
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#D62828" />
            <ScaledText variant="body" style={styles.emptyText}>
              {mode === 'live' ? 'Fetching live data from USGS & OpenWeatherMap...' : 'Loading demo alerts...'}
            </ScaledText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <ScaledText variant="h4" style={styles.emptyTitle}>No Active Alerts</ScaledText>
            <ScaledText variant="body" style={styles.emptyText}>Your area is currently safe. Keep monitoring for updates.</ScaledText>
          </View>
        ) : (
          <View style={styles.alertsList}>
            <ScaledText variant="label" style={styles.alertsCount}>{filtered.length} active alert{filtered.length !== 1 ? 's' : ''}</ScaledText>
            {filtered.map((alert) => (
              <Pressable key={alert.id} style={styles.alertCard} onPress={() => setSelected(alert)}>
                <View style={styles.alertHeaderRow}>
                  <View style={[styles.levelBadge, { backgroundColor: alert.color }]}>
                    <ScaledText variant="label" style={styles.levelText}>{alert.level}</ScaledText>
                  </View>
                  <ScaledText variant="caption" style={styles.alertTime}>{alert.time}</ScaledText>
                </View>

                <View style={styles.titleRow}>
                  {alert.icon && <Image source={alert.icon} style={styles.alertIcon} />}
                  <ScaledText variant="h4" style={styles.alertTitle}>{alert.title}</ScaledText>
                </View>

                <ScaledText variant="body" style={styles.alertDesc} numberOfLines={3}>{alert.desc}</ScaledText>

                {alert.distance !== undefined && (
                  <ScaledText variant="caption" style={styles.distanceText}>{alert.distance.toFixed(1)} km from you</ScaledText>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {selected && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelected(null)}
        >
          <AlertDetailModal alert={selected} onClose={() => setSelected(null)} />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F7" },
  content: { flex: 1, backgroundColor: "#F7F7F7" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: { flex: 1 },
  headerTitle: { color: "#0D0D0D" },
  headerSub: { color: "#888", marginTop: 2 },

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  modeBtnLiveActive: {
    backgroundColor: "#D62828",
  },
  modeBtnText: {
    color: "#888",
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: "#0D0D0D",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },

  // Info banners
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  errorBanner: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FFE0E0",
  },
  infoBannerText: {
    color: "#666",
    flex: 1,
  },

  dropdownWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  dropdownLabel: { color: "#0D0D0D" },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemActive: { backgroundColor: "#FFF5F5" },
  dropdownItemIcon: {},
  dropdownItemText: { color: "#666", flex: 1 },
  dropdownItemTextActive: { color: "#D62828" },

  alertsList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  alertsCount: { color: "#888", marginBottom: 10 },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  alertHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelText: { color: "#FFFFFF", letterSpacing: 0.5 },
  alertTime: { color: "#999" },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 12 },
  alertIcon: { width: 36, height: 36, resizeMode: "contain" },
  alertTitle: { color: "#0D0D0D", flex: 1 },
  alertDesc: { color: "#555", lineHeight: 20, marginBottom: 8 },
  distanceText: { color: "#D62828", marginTop: 4 },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingBottom: 40 },
  emptyTitle: { color: "#0D0D0D", marginTop: 16, marginBottom: 8 },
  emptyText: { color: "#888", textAlign: "center", paddingHorizontal: 20 },
});