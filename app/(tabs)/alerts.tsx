import { Ionicons } from '@expo/vector-icons';
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useAlerts } from '../AlertsContext';
import { ScaledText } from "../ScaledText";

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

const CATEGORIES = [
  { id: "all",        label: "All Categories" },
  { id: "earthquake", label: "Earthquakes"    },
  { id: "typhoon",    label: "Typhoons"        },
  { id: "flood",      label: "Floods"          },
  { id: "storm",      label: "Storms"          },
  { id: "fire",       label: "Fire"            },
];

export default function Alerts() {
  const {
    alerts,
    loading,
    mode,
    setMode,
    liveError,
    refresh,
  } = useAlerts();

  const [refreshing, setRefreshing]               = useState(false);
  const [filter, setFilter]                       = useState("all");
  const [selected, setSelected]                   = useState<AlertItem | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filtered         = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const selectedCategory = CATEGORIES.find(c => c.id === filter);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ScaledText variant="h1" style={styles.headerTitle}>Alerts</ScaledText>
          <ScaledText variant="caption" style={styles.headerSub}>
            PAGASA & PHIVOLCS • {mode === 'live' ? 'Real-time' : 'Demo'} Updates
          </ScaledText>
        </View>

        {/* DEMO / LIVE Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'demo' && styles.modeBtnActive]}
            onPress={() => setMode('demo')}
          >
            <ScaledText variant="label" style={[styles.modeBtnText, mode === 'demo' && styles.modeBtnTextActive]}>
              DEMO
            </ScaledText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'live' && styles.modeBtnLiveActive]}
            onPress={() => setMode('live')}
          >
            {mode === 'live' && <View style={styles.liveDot} />}
            <ScaledText variant="label" style={[styles.modeBtnText, mode === 'live' && styles.modeBtnTextActive]}>
              LIVE
            </ScaledText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D62828" />
        }
      >
        {/* Category Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <ScaledText variant="body" style={styles.dropdownLabel}>
              {selectedCategory?.label || "All Categories"}
            </ScaledText>
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
                  style={[styles.dropdownItem, filter === cat.id && styles.dropdownItemActive]}
                  onPress={() => { setFilter(cat.id); setShowCategoryDropdown(false); }}
                >
                  <ScaledText
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

        {/* Mode info banners */}
        {mode === 'demo' && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <ScaledText variant="caption" style={styles.infoBannerText}>
              Showing sample data. Switch to LIVE for real-time alerts.
            </ScaledText>
          </View>
        )}

        {mode === 'live' && liveError && (
          <View style={[styles.infoBanner, styles.errorBanner]}>
            <Ionicons name="warning-outline" size={16} color="#D62828" />
            <ScaledText variant="caption" style={[styles.infoBannerText, { color: '#D62828' }]}>
              {liveError}
            </ScaledText>
          </View>
        )}

        {/* Alerts List */}
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#D62828" />
            <ScaledText variant="body" style={styles.emptyText}>
              {mode === 'live'
                ? 'Fetching live data from USGS & OpenWeatherMap...'
                : 'Loading demo alerts...'}
            </ScaledText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <ScaledText variant="h4" style={styles.emptyTitle}>No Active Alerts</ScaledText>
            <ScaledText variant="body" style={styles.emptyText}>
              Your area is currently safe. Keep monitoring for updates.
            </ScaledText>
          </View>
        ) : (
          <View style={styles.alertsList}>
            <ScaledText variant="label" style={styles.alertsCount}>
              {filtered.length} active alert{filtered.length !== 1 ? 's' : ''}
            </ScaledText>
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

                <ScaledText variant="body" style={styles.alertDesc} numberOfLines={3}>
                  {alert.desc}
                </ScaledText>

                {alert.distance !== undefined && (
                  <ScaledText variant="caption" style={styles.distanceText}>
                    {alert.distance.toFixed(1)} km from you
                  </ScaledText>
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
  modeBtnLiveActive: { backgroundColor: "#D62828" },
  modeBtnText: { color: "#888", letterSpacing: 0.5 },
  modeBtnTextActive: { color: "#0D0D0D" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },

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
  errorBanner: { backgroundColor: "#FFF5F5", borderColor: "#FFE0E0" },
  infoBannerText: { color: "#666", flex: 1 },

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