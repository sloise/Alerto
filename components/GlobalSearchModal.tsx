import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View
} from "react-native";
import { useAccessibility } from './AccessibilityContext';
import { GestureRecognition } from './GestureRecognition';
import { VoiceRecognition, VoiceResult } from './VoiceRecognition';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Reusable Global Search Modal ──────────────────────────────────────
export function GlobalSearchModal({ 
  visible, 
  onClose, 
  onSearch,
  onVoiceResults,
  allAlerts = [],
  nearestCenters = []
}: {
  visible: boolean;
  onClose: () => void;
  onSearch: (q: string) => void;
  onVoiceResults?: (query: string, results: VoiceResult[] | undefined) => void;
  allAlerts?: any[];
  nearestCenters?: any[];
}) {
  const { isVoiceEnabled, isGestureEnabled } = useAccessibility();
  const [tab, setTab] = useState<"text" | "gesture" | "voice">("text");
  const [query, setQuery] = useState("");
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      friction: 8, tension: 60, useNativeDriver: true,
    }).start();
    if (!visible) setTab("text");
  }, [visible]);

  function submit(q: string) {
    if (!q.trim()) {
      Alert.alert("Empty Search", "Please enter a search term");
      return;
    }
    onSearch(q);
    setQuery("");
    onClose();
  }

  // Handle voice results
  function handleVoiceResult(query: string, results?: VoiceResult[]) {
    if (onVoiceResults) {
      onVoiceResults(query, results);
    }
    setQuery("");
  }

  // Filter available tabs based on accessibility settings
  const availableTabs = ["text"];
  if (isGestureEnabled) availableTabs.push("gesture");
  if (isVoiceEnabled) availableTabs.push("voice");

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={smStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[smStyles.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={smStyles.handle} />
        <Text style={smStyles.title}>Search Alerto</Text>

        <View style={smStyles.tabsContainer}>
          {(["text", "gesture", "voice"] as const).map((t) => {
            const isAvailable = availableTabs.includes(t);
            return (
              <TouchableOpacity 
                key={t} 
                style={[smStyles.tab, tab === t && smStyles.tabActive, !isAvailable && smStyles.tabDisabled]} 
                onPress={() => isAvailable && setTab(t)}
                disabled={!isAvailable}
              >
                <Image
                  source={
                    t === "text" 
                      ? require("../assets/images/text.png")
                      : t === "gesture"
                      ? require("../assets/images/gesture.png")
                      : require("../assets/images/voice.png")
                  }
                  style={[smStyles.tabIcon, !isAvailable && smStyles.tabIconDisabled]}
                />
                <Text style={[smStyles.tabTxt, tab === t && smStyles.tabTxtActive, !isAvailable && smStyles.tabTxtDisabled]}>
                  {t === "text" ? "Text" : t === "gesture" ? "Gesture" : "Voice"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === "text" && (
          <View style={smStyles.textContent}>
            <View style={smStyles.inputRow}>
              <TextInput
                style={smStyles.input}
                placeholder="Search alerts"
                placeholderTextColor="#999"
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => submit(query)}
              />
              <TouchableOpacity 
                style={[smStyles.goBtn, !query && smStyles.goBtnDisabled]} 
                onPress={() => submit(query)}
                disabled={!query.trim()}
              >
                <Text style={smStyles.goBtnTxt}>Go</Text>
              </TouchableOpacity>
            </View>

            <Text style={smStyles.suggestionsTitle}>SUGGESTIONS</Text>
            {["Typhoon", "Earthquake", "Flood", "Fire", "Evacuation Center"].map((s) => (
              <TouchableOpacity 
                key={s} 
                style={smStyles.suggestionRow} 
                onPress={() => submit(s.toLowerCase())}
              >
                <Text style={smStyles.suggestionIcon}>🔍</Text>
                <Text style={smStyles.suggestionTxt}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === "gesture" && <GestureRecognition onResult={(q: string) => submit(q)} isEnabled={isGestureEnabled} />}
        {tab === "voice" && (
          <VoiceRecognition 
            onResult={handleVoiceResult}
            isEnabled={isVoiceEnabled}
            allAlerts={allAlerts}
            nearestCenters={nearestCenters}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const smStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: SCREEN_HEIGHT * 0.92 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#0D0D0D", marginBottom: 18 },
  tabsContainer: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F3F3", alignItems: "center", borderWidth: 1, borderColor: "#E8E8E8", flexDirection: "row", justifyContent: "center", gap: 6 },
  tabActive: { backgroundColor: "#E8E8E8", borderColor: "#D0D0D0" },
  tabDisabled: { opacity: 0.4 },
  tabIcon: { width: 18, height: 18, resizeMode: "contain" },
  tabIconDisabled: { tintColor: "#CCC" },
  tabTxt: { fontSize: 13, fontWeight: "700", color: "#666" },
  tabTxtActive: { color: "#0D0D0D" },
  tabTxtDisabled: { color: "#999" },
  textContent: { gap: 0 },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  input: { flex: 1, height: 48, borderWidth: 1, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: "#0D0D0D", backgroundColor: "#F8F8F8" },
  goBtn: { width: 48, height: 48, backgroundColor: "#D62828", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goBtnDisabled: { backgroundColor: "#E8B4B4", opacity: 0.6 },
  goBtnTxt: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  suggestionsTitle: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F3F3" },
  suggestionIcon: { fontSize: 16 },
  suggestionTxt: { fontSize: 14, color: "#333", fontWeight: "500" },
});