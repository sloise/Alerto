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
  Text,
  View,
} from "react-native";

// Import the new component
import AlertDetailModal from "../AlertDetailModal";

// Mock data
import mockAlertsData from './mockAlerts.json';

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

type SeverityLevel = 'emergency' | 'warning' | 'watch' | 'advisory';

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "📋" },
  { id: "earthquake", label: "Earthquakes", icon: "🌋" },
  { id: "typhoon", label: "Typhoons", icon: "🌪️" },
  { id: "flood", label: "Floods", icon: "🌊" },
  { id: "storm", label: "Storms", icon: "⚡" },
  { id: "fire", label: "Fire", icon: "🔥" }
];

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  emergency: 4,
  warning: 3,
  watch: 2,
  advisory: 1
};

function getTypeIcon(type: AlertType): any {
  switch (type) {
    case 'flood':
      return require('../../assets/images/flood.png');
    case 'earthquake':
      return require('../../assets/images/earthquake.png');
    case 'typhoon':
      return require('../../assets/images/typhoon.png');
    default:
      return null;
  }
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>("active");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("Just now");

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
      const userLoc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(userLoc);
      return userLoc;
    } catch (error) {
      console.log("Error getting location:", error);
      const defaultLoc = { lat: 14.5995, lng: 120.9842 };
      setUserLocation(defaultLoc);
      return defaultLoc;
    }
  }, []);

  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
    if (sev === 'emergency') return "#8B0000";
    if (sev === 'warning') return "#D62828";
    if (sev === 'watch') return "#E07B39";
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
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  }

  async function loadAlerts() {
    if (!userLocation) return;

    try {
      setLoading(true);

      const earthquakes = mockAlertsData.earthquakes;
      const weatherAlerts = mockAlertsData.weatherAlerts;

      setLastUpdate("Just now");

      const earthquakeAlerts: AlertItem[] = earthquakes
        .filter(eq => eq.magnitude >= 3.5)
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
          distance: haversineDistance(userLocation.lat, userLocation.lng, eq.latitude, eq.longitude),
          isLocationBased: true,
        }));

      const weatherAlertItems: AlertItem[] = weatherAlerts
        .map((alert: any) => {
          let alertType: AlertType = alert.type as AlertType;
          let iconSource = getTypeIcon(alertType);
          if (!iconSource) {
            iconSource = null;
          }

          return {
            id: alert.id,
            type: alertType,
            level: alert.severity.toUpperCase(),
            title: alert.title,
            desc: alert.description.substring(0, 180),
            time: formatTime(alert.effective),
            color: getWeatherColor(alert.severity),
            icon: iconSource,
            raw: alert,
            distance: undefined,
            isLocationBased: true,
          };
        });

      const allAlerts = [...earthquakeAlerts, ...weatherAlertItems]
        .sort((a, b) => {
          const aLevel = a.level.toLowerCase() as SeverityLevel;
          const bLevel = b.level.toLowerCase() as SeverityLevel;
          const aSeverity = SEVERITY_ORDER[aLevel] || 0;
          const bSeverity = SEVERITY_ORDER[bLevel] || 0;
          if (aSeverity !== bSeverity) return bSeverity - aSeverity;
          if (a.distance && b.distance) return a.distance - b.distance;
          return 0;
        });

      setAlerts(allAlerts);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    getUserLocation().then(() => {
      loadAlerts();
    });
  }, []);

  useEffect(() => {
    if (userLocation) loadAlerts();
  }, [userLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (userLocation) loadAlerts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && appState !== "active") loadAlerts();
      setAppState(state);
    });
    return () => subscription.remove();
  }, [appState]);

  const onRefresh = () => {
    setRefreshing(true);
    getUserLocation().then(() => loadAlerts());
  };

  const filtered = filter === "all"
    ? alerts
    : alerts.filter(a => a.type === filter);

  const selectedCategory = CATEGORIES.find(c => c.id === filter);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0D0D0D" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerSub}>PAGASA & PHIVOLCS • Real-time Updates</Text>
          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
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
            <Text style={styles.dropdownLabel}>{selectedCategory?.label || "All Categories"}</Text>
            <Ionicons
              name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color="#0D0D0D"
            />
          </Pressable>

          {showCategoryDropdown && (
            <View style={styles.dropdownMenu}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.dropdownItem,
                    filter === cat.id && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setFilter(cat.id);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.dropdownItemText,
                    filter === cat.id && styles.dropdownItemTextActive
                  ]}>
                    {cat.label}
                  </Text>
                  {filter === cat.id && (
                    <Ionicons name="checkmark" size={18} color="#D62828" style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Alerts List */}
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#D62828" />
            <Text style={styles.emptyText}>Fetching hazard data from PAGASA & PHIVOLCS...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.emptyTitle}>No Active Alerts</Text>
            <Text style={styles.emptyText}>Your area is currently safe. Keep monitoring for updates.</Text>
          </View>
        ) : (
          <View style={styles.alertsList}>
            <Text style={styles.alertsCount}>{filtered.length} active alert{filtered.length !== 1 ? 's' : ''}</Text>
            {filtered.map((alert) => (
              <Pressable
                key={alert.id}
                style={styles.alertCard}
                onPress={() => setSelected(alert)}
              >
                <View style={styles.alertHeaderRow}>
                  <View style={[styles.levelBadge, { backgroundColor: alert.color }]}>
                    <Text style={styles.levelText}>{alert.level}</Text>
                  </View>
                  <Text style={styles.alertTime}>{alert.time}</Text>
                </View>

                <View style={styles.titleRow}>
                  {alert.icon && (
                    <Image source={alert.icon} style={styles.alertIcon} />
                  )}
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                </View>

                <Text style={styles.alertDesc} numberOfLines={3}>{alert.desc}</Text>

                {alert.distance !== undefined && (
                  <Text style={styles.distanceText}>{alert.distance.toFixed(1)} km from you</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal for detailed view - UPDATED */}
      {selected && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelected(null)}
        >
          <AlertDetailModal 
            alert={selected} 
            onClose={() => setSelected(null)} 
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Styles remain the same as your original component
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F7F7"
  },
  content: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0D0D0D"
  },
  headerSub: {
    fontSize: 11,
    color: "#888",
    marginTop: 2
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFE0E0",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D62828"
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D62828",
    letterSpacing: 0.5
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
  dropdownLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0D0D0D",
  },
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
  dropdownItemActive: {
    backgroundColor: "#FFF5F5",
  },
  dropdownItemIcon: {
    fontSize: 18,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    flex: 1,
  },
  dropdownItemTextActive: {
    color: "#D62828",
    fontWeight: "600",
  },
  alertsList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  alertsCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 10,
  },
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
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D0D0D",
    flex: 1,
  },
  alertDesc: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 11,
    color: "#D62828",
    fontWeight: "600",
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D0D0D",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});