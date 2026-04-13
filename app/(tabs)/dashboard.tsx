import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity, 
  View
} from "react-native";
import { ScaledText } from "../ScaledText"; // 👈 ADD THIS IMPORT
import { GlobalSearchModal } from '../../components/GlobalSearchModal';
import { useGlobalSearch } from '../../components/useGlobalSearch';
import { VoiceResult } from '../../components/VoiceRecognition';
import { auth, db } from '../../firebaseConfig';
import { getEarthquakesFromFirestore } from '../../services/earthquakeService';
import { getTyphooonsFromFirestore } from '../../services/typhoonService';
import { LocationContext } from '../_layout';

const QUICK_ACCESS = [
  { id: 1, icon: "siren1.png", label: "Alerts", isImage: true },
  { id: 2, icon: "location-city", label: "Evacuation Centers", isImage: false, isMaterialIcon: true },
  { id: 3, icon: "hotlines.png", label: "Emergency Hotlines", isImage: true },
  { id: 4, icon: "checklist.png", label: "Go-Bag Checklist", isImage: true },
];

export default function Dashboard() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [voiceResults, setVoiceResults] = useState<VoiceResult[]>([]);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { location, latitude, longitude } = useContext(LocationContext);
  const [nearestCenters, setNearestCenters] = useState<any[]>([]);
  const [userName, setUserName] = useState('User');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Import global search hook
  const { performGlobalSearch, isLocationEnabled } = useGlobalSearch();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (currentUser.displayName) {
        setUserName(currentUser.displayName);
      } else if (currentUser.email) {
        setUserName(currentUser.email.split('@')[0]);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  useEffect(() => {
    async function loadAlerts() {
      try {
        const earthquakes = await getEarthquakesFromFirestore();
        const typhoons = await getTyphooonsFromFirestore();

        const earthquakeAlerts = earthquakes.map((eq: any) => ({
          id: eq.id,
          type: "earthquake",
          level: `M ${eq.magnitude}`,
          title: eq.title,
          desc: `Depth: ${eq.depth} km • ${eq.location}`,
          time: new Date(eq.timestamp).toLocaleDateString(),
          color: eq.magnitude >= 5 ? "#E8802F" : "#E8802F",
        }));

        const typhoonAlerts = typhoons.map((ty: any) => ({
          id: ty.id,
          type: "typhoon",
          level: ty.severity?.toUpperCase() || "ADVISORY",
          title: ty.title,
          desc: ty.description,
          time: new Date(ty.timestamp).toLocaleDateString(),
          color: "#E8802F",
        }));

        const allAlerts = [...typhoonAlerts, ...earthquakeAlerts];
        setAlerts(allAlerts);
        setFilteredAlerts(allAlerts);
      } catch (error) {
        console.log("❌ Error loading alerts:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  useEffect(() => {
    async function loadNearestCenters() {
      try {
        const snapshot = await getDocs(collection(db, "evacuation_centers"));
        const allCenters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

        if (latitude && longitude) {
          const withDistance = allCenters.map((center) => {
            const dist = getDistance(latitude, longitude, center.latitude, center.longitude);
            return { ...center, distance: dist };
          });
          withDistance.sort((a, b) => a.distance - b.distance);
          setNearestCenters(withDistance.slice(0, 3));
        } else {
          setNearestCenters(allCenters.slice(0, 3));
        }
      } catch (error) {
        console.log("❌ Error loading centers:", error);
      }
    }
    loadNearestCenters();
  }, [latitude, longitude]);

  // Handle voice results from modal
  const handleVoiceResults = (query: string, results: VoiceResult[] | undefined) => {
    setVoiceQuery(query);
    if (results && results.length > 0) {
      setVoiceResults(results);
    }
    setModalVisible(false);
  };

  // Handle search with global search functionality
  const performSearch = (query: string) => {
    const searchConfig = performGlobalSearch(query);
    const lowerQuery = query.toLowerCase();
    setSearchQuery(query);
    setVoiceResults([]);
    setVoiceQuery("");
    
    let filtered = [...alerts];
    
    // Apply filters based on search config
    if (searchConfig.filters.isTyphoon) {
      filtered = alerts.filter(alert => alert.type === "typhoon");
    } 
    else if (searchConfig.filters.isEarthquake) {
      filtered = alerts.filter(alert => alert.type === "earthquake");
    }
    else if (searchConfig.filters.isFlood) {
      filtered = alerts.filter(alert => 
        alert.title.toLowerCase().includes("flood") || 
        alert.desc.toLowerCase().includes("flood")
      );
    }
    else if (searchConfig.filters.isFire) {
      filtered = alerts.filter(alert => 
        alert.title.toLowerCase().includes("fire") || 
        alert.desc.toLowerCase().includes("fire")
      );
    }
    else if (searchConfig.filters.isEvacuation) {
      router.push("/hazard-map");
      setModalVisible(false);
      return;
    }
    else if (searchConfig.filters.isCustom) {
      filtered = alerts.filter(alert => 
        alert.title.toLowerCase().includes(lowerQuery) ||
        alert.desc.toLowerCase().includes(lowerQuery) ||
        alert.type.toLowerCase().includes(lowerQuery)
      );
    }
    
    setFilteredAlerts(filtered);
    
    if (filtered.length === 0 && lowerQuery !== "") {
      Alert.alert("No Results", `No alerts found for "${query}"`);
    } else if (filtered.length > 0 && lowerQuery !== "") {
      Alert.alert("Search Results", `Found ${filtered.length} alert(s) for "${query}"`);
    }
    
    setModalVisible(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFilteredAlerts(alerts);
  };

  const clearVoiceResults = () => {
    setVoiceResults([]);
    setVoiceQuery("");
  };

  const handleVoiceResultTap = (result: VoiceResult) => {
    if (result.type === 'hotline') {
      router.push("/hotlines");
    } else if (result.type === 'checklist') {
      router.push("/prep-guide");
    } else if (result.type === 'center') {
      router.push("/hazard-map");
    } else if (result.type === 'alert') {
      // Filter to show this specific alert
      const filtered = alerts.filter(a => a.id === result.id);
      setFilteredAlerts(filtered);
      setVoiceResults([]);
      setVoiceQuery("");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.searchBar} onPress={() => setModalVisible(true)}>
<ScaledText style={[searchQuery ? styles.searchTxt : styles.searchPlaceholder, { fontSize: 14 }]}>

              {searchQuery || "Search alerts..."}
            </ScaledText>
          </TouchableOpacity>
          {searchQuery ? (
            <TouchableOpacity style={[styles.searchBtn, { backgroundColor: "#666" }]} onPress={clearSearch}>
<ScaledText style={[styles.searchBtnIcon, { fontSize: 18 }]}>✕</ScaledText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.searchBtn} onPress={() => setModalVisible(true)}>
              <Image
                source={require("../../assets/images/search.png")}
                style={styles.searchIcon}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.welcomeCard}>
          <ScaledText variant="h2" style={styles.userName}>Welcome, {userName}!</ScaledText>
          <ScaledText variant="label" style={styles.welcomeSub}>{location}</ScaledText>
          <ScaledText variant="body" style={styles.dateDisplay}>{formatDate(currentDate)}</ScaledText>
          <ScaledText variant="label" style={styles.timeDisplay}>{formatTime(currentDate)}</ScaledText>
          <TouchableOpacity style={styles.alertPill}>
            <ScaledText variant="label" style={styles.alertPillTxt}>
              {alerts.length > 0 ? alerts[0].title : "No active alerts"}
            </ScaledText>
            <ScaledText variant="label" style={styles.alertPillArrow}>›</ScaledText>
          </TouchableOpacity>
        </View>

        <ScaledText variant="h3" style={styles.sectionTitle}>Quick access</ScaledText>
        <View style={styles.quickRow}>
          {QUICK_ACCESS.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.quickTile} 
              onPress={() => {
                if (item.label === "Evacuation Centers") router.push("/hazard-map");
                if (item.label === "Alerts") router.push("/alerts");
                if (item.label === "Go-Bag Checklist") router.push("/prep-guide");
                if (item.label === "Emergency Hotlines") router.push("/hotlines");
              }}
            >
              {item.isMaterialIcon ? (
                <MaterialIcons name={item.icon as any} size={28} color="#0D0D0D" style={styles.quickIconMaterial} />
              ) : (
                <Image
                  source={
                    item.icon === "siren1.png"
                      ? require("../../assets/images/siren1.png")
                      : item.icon === "hotlines.png"
                      ? require("../../assets/images/hotlines.png")
                      : require("../../assets/images/checklist.png")
                  }
                  style={styles.quickIconImage}
                />
              )}
              <ScaledText variant="caption" style={styles.quickLabel}>{item.label}</ScaledText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Results Section */}
        {voiceResults.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <ScaledText variant="h3" style={styles.sectionTitle}>
                Results for "{voiceQuery}"
              </ScaledText>
              <TouchableOpacity onPress={clearVoiceResults}>
                <ScaledText variant="label" style={styles.seeAll}>Clear</ScaledText>
              </TouchableOpacity>
            </View>

            {voiceResults.map((result, idx) => {
              if (result.type === 'alert') {
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.alertCard, { backgroundColor: result.color || "#E8802F" }]}
                    onPress={() => handleVoiceResultTap(result)}
                  >
                    <View style={styles.alertTop}>
                      <View style={styles.levelBadge}>
                        <ScaledText variant="label" style={styles.levelTxt}>{result.source}</ScaledText>
                      </View>
                      <ScaledText variant="caption" style={styles.alertTime}>{result.icon}</ScaledText>
                    </View>
                    <ScaledText variant="h4" style={styles.alertTitle}>{result.title}</ScaledText>
                    <ScaledText variant="body" style={styles.alertDesc}>{result.desc}</ScaledText>
                  </TouchableOpacity>
                );
              } else if (result.type === 'center') {
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.centerCard}
                    onPress={() => handleVoiceResultTap(result)}
                  >
                    <View style={styles.centerIcon}>
<ScaledText style={{ fontSize: 20 }}>{result.icon}</ScaledText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ScaledText variant="body" style={styles.centerName}>{result.title}</ScaledText>
                      <ScaledText variant="caption" style={styles.centerType}>{result.desc}</ScaledText>
                    </View>
                    <ScaledText variant="h4" style={styles.centerDist}>›</ScaledText>
                  </TouchableOpacity>
                );
              } else {
                // Hotline or Checklist
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.actionCard]}
                    onPress={() => handleVoiceResultTap(result)}
                  >
<ScaledText style={[styles.actionIcon, { fontSize: 28 }]}>{result.icon}</ScaledText>
                    <View style={{ flex: 1 }}>
                      <ScaledText variant="body" style={styles.actionTitle}>{result.title}</ScaledText>
                      <ScaledText variant="caption" style={styles.actionDesc}>{result.desc}</ScaledText>
                    </View>
                    <ScaledText variant="h4" style={styles.actionArrow}>›</ScaledText>
                  </TouchableOpacity>
                );
              }
            })}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ScaledText variant="h3" style={styles.sectionTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : "Active alerts"}
          </ScaledText>
          {searchQuery && (
            <TouchableOpacity onPress={clearSearch}>
              <ScaledText variant="label" style={styles.seeAll}>Clear</ScaledText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ScaledText variant="body" style={{ color: "#888", marginBottom: 12 }}>Loading alerts...</ScaledText>
        ) : filteredAlerts.length === 0 ? (
          <ScaledText variant="body" style={{ color: "#888", marginBottom: 12 }}>
            {searchQuery ? `No alerts found for "${searchQuery}"` : "No active alerts"}
          </ScaledText>
        ) : (
          filteredAlerts.slice(0, 5).map((a) => (
            <TouchableOpacity key={a.id} style={[styles.alertCard, { backgroundColor: a.color }]}>
              <View style={styles.alertTop}>
                <View style={styles.levelBadge}><ScaledText variant="label" style={styles.levelTxt}>{a.level}</ScaledText></View>
                <ScaledText variant="caption" style={styles.alertTime}>{a.time}</ScaledText>
              </View>
              <ScaledText variant="h4" style={styles.alertTitle}>{a.title}</ScaledText>
              <ScaledText variant="body" style={styles.alertDesc}>{a.desc}</ScaledText>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.sectionHeader}>
          <ScaledText variant="h3" style={styles.sectionTitle}>Nearest Center</ScaledText>
          <TouchableOpacity onPress={() => router.push("/hazard-map")}>
            <ScaledText variant="label" style={styles.seeAll}>View all</ScaledText>
          </TouchableOpacity>
        </View>
        {nearestCenters.map((c) => (
          <TouchableOpacity key={c.id} style={styles.centerCard} onPress={() => router.push("/hazard-map")}>
<ScaledText style={{ fontSize: 20 }}>🏫</ScaledText>
            <View style={{ flex: 1 }}>
              <ScaledText variant="body" style={styles.centerName}>{c.name}</ScaledText>
              <ScaledText variant="caption" style={styles.centerType}>{c.type || "Evacuation Center"}</ScaledText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <ScaledText variant="label" style={styles.centerDist}>{c.distance ? `${c.distance.toFixed(1)} km` : "—"}</ScaledText>
              <View style={styles.centerDot} />
              <ScaledText variant="caption" style={styles.centerStatus}>Open</ScaledText>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Global Search Modal */}
      <GlobalSearchModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSearch={performSearch}
        onVoiceResults={handleVoiceResults}
        allAlerts={alerts}
        nearestCenters={nearestCenters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F7" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  searchBar: { flex: 1, height: 46, backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1, borderColor: "#E8E8E8" },
  searchPlaceholder: { color: "#AAA" },
  searchTxt: { color: "#0D0D0D" },
  searchBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8E8E8" },
  searchIcon: { width: 22, height: 22, resizeMode: "contain", tintColor: "#0D0D0D" },
  searchBtnIcon: { color: "#FFF" },
  welcomeCard: { backgroundColor: "#D62828", borderRadius: 18, padding: 16, marginBottom: 24, position: "relative", overflow: "hidden" },
  userName: { color: "#FFF", marginBottom: 2 },
  welcomeSub: { color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  dateDisplay: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginBottom: 2, marginTop: 6 },
  timeDisplay: { color: "rgba(255,255,255,0.8)", marginBottom: 12 },
  alertPill: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  alertPillTxt: { color: "#FFF", flex: 1 },
  alertPillArrow: { color: "#FFF", marginLeft: 8 },
  sectionTitle: { color: "#0D0D0D", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { color: "#D62828" },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickTile: { flex: 1, aspectRatio: 1, backgroundColor: "#FFF", borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#E0E0E0" },
  quickIconImage: { width: 28, height: 28, marginBottom: 6, resizeMode: "contain" },
  quickIconMaterial: { marginBottom: 6 },
  quickLabel: { color: "#555", textAlign: "center" },
  alertCard: { borderRadius: 16, padding: 18, marginBottom: 12 },
  alertTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  levelBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  levelTxt: { color: "#FFF", letterSpacing: 0.5 },
  alertTime: { color: "rgba(255,255,255,0.8)" },
  alertTitle: { color: "#FFF", marginBottom: 6 },
  alertDesc: { color: "rgba(255,255,255,0.9)", lineHeight: 19 },
  centerCard: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#E8E8E8" },
  centerIcon: { width: 40, height: 40, backgroundColor: "#E8E8E8", borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  centerName: { color: "#0D0D0D", marginBottom: 2 },
  centerType: { color: "#888" },
  centerDist: { color: "#D62828" },
  centerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#2ECC71", marginVertical: 2 },
  centerStatus: { color: "#2ECC71" },
  
  actionCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FFF", 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: "#E8E8E8" 
  },
  actionIcon: { marginRight: 12 },
  actionTitle: { color: "#0D0D0D", marginBottom: 2 },
  actionDesc: { color: "#888" },
  actionArrow: { color: "#D62828" },
});