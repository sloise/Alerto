import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  const { inputModes } = useAccessibility();
  
  // Get enabled states from inputModes
  const isVoiceEnabled = inputModes.find(m => m.id === 'voice')?.enabled ?? false;
  const isGestureEnabled = inputModes.find(m => m.id === 'gesture')?.enabled ?? false;
  
  const [tab, setTab] = useState<"text" | "gesture" | "voice">("text");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      friction: 8, tension: 60, useNativeDriver: true,
    }).start();
    if (!visible) {
      setTab("text");
      setQuery("");
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [visible]);

  // Perform search and filter results
  function performSearch(q: string) {
    if (!q.trim()) {
      Alert.alert("Empty Search", "Please enter a search term");
      return;
    }

    setIsLoading(true);
    const lowerQuery = q.toLowerCase();

    // Simulate search delay
    setTimeout(() => {
      // Filter alerts and centers based on query
      const filteredAlerts = allAlerts.filter(alert => {
        const alertType = alert.type?.toLowerCase() || "";
        const alertLocation = alert.location?.toLowerCase() || "";
        const alertDesc = alert.description?.toLowerCase() || "";
        
        return alertType.includes(lowerQuery) || 
               alertLocation.includes(lowerQuery) || 
               alertDesc.includes(lowerQuery);
      });

      const filteredCenters = nearestCenters.filter(center => {
        const centerName = center.name?.toLowerCase() || "";
        const centerLocation = center.location?.toLowerCase() || "";
        
        return centerName.includes(lowerQuery) || 
               centerLocation.includes(lowerQuery);
      });

      const results = [...filteredAlerts, ...filteredCenters];
      setSearchResults(results);
      setHasSearched(true);
      setIsLoading(false);
      onSearch(q);
    }, 500);
  }

  function handleGestureResult(gestureQuery: string) {
    setQuery(gestureQuery);
    performSearch(gestureQuery);
  }

function handleVoiceResult(voiceQuery: string, results?: VoiceResult[]) {
  setQuery(voiceQuery);
  // Close modal FIRST, then pass results up
  onClose();
  if (onVoiceResults) {
    onVoiceResults(voiceQuery, results);
  }
}

  function handleTextSubmit() {
    performSearch(query);
  }

  // Filter available tabs based on accessibility settings
  const availableTabs = ["text"];
  if (isGestureEnabled) availableTabs.push("gesture");
  if (isVoiceEnabled) availableTabs.push("voice");

  const hasResults = searchResults.length > 0;
  const showSuggestions = !hasSearched && tab === "text";

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

        <ScrollView style={smStyles.content} showsVerticalScrollIndicator={false}>
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
                  onSubmitEditing={handleTextSubmit}
                />
                <TouchableOpacity 
                  style={[smStyles.goBtn, (!query || isLoading) && smStyles.goBtnDisabled]} 
                  onPress={handleTextSubmit}
                  disabled={!query.trim() || isLoading}
                >
                  <Text style={smStyles.goBtnTxt}>{isLoading ? "..." : "Go"}</Text>
                </TouchableOpacity>
              </View>

              {/* Show results or suggestions or no results message */}
              {hasSearched && (
                <View style={smStyles.resultsContainer}>
                  {hasResults ? (
                    <>
                      <Text style={smStyles.resultsTitle}>
                        {searchResults.length} RESULT{searchResults.length !== 1 ? "S" : ""}
                      </Text>
                      {searchResults.map((result, idx) => (
                        <View key={idx} style={smStyles.resultItem}>
                          <View style={smStyles.resultIcon}>
                            <Image
                              source={require("../assets/images/search.png")}
                              style={smStyles.resultIconImg}
                            />
                          </View>
                          <View style={smStyles.resultInfo}>
                            <Text style={smStyles.resultTitle}>
                              {result.type || result.name || "Alert"}
                            </Text>
                            <Text style={smStyles.resultSubtitle} numberOfLines={1}>
                              {result.location || result.description || "No description"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={smStyles.noResultsContainer}>
                      <Image
                        source={require("../assets/images/search.png")}
                        style={smStyles.noResultsIcon}
                      />
                      <Text style={smStyles.noResultsText}>
                        No results found for "{query}"
                      </Text>
                      <Text style={smStyles.noResultsSubtext}>
                        Try a different search term
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {showSuggestions && (
                <>
                  <Text style={smStyles.suggestionsTitle}>SUGGESTIONS</Text>
                  {["Typhoon", "Earthquake", "Flood", "Fire", "Evacuation Center"].map((s) => (
                    <TouchableOpacity 
                      key={s} 
                      style={smStyles.suggestionRow} 
                      onPress={() => {
                        setQuery(s.toLowerCase());
                        performSearch(s.toLowerCase());
                      }}
                    >
                      <Image
                        source={require("../assets/images/search.png")}
                        style={smStyles.suggestionIcon}
                      />
                      <Text style={smStyles.suggestionTxt}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}

          {tab === "gesture" && (
            <GestureRecognition 
              onResult={handleGestureResult}
              isEnabled={isGestureEnabled} 
            />
          )}

          {tab === "voice" && (
            <VoiceRecognition 
              onResult={handleVoiceResult}
              isEnabled={isVoiceEnabled}
              allAlerts={allAlerts}
              nearestCenters={nearestCenters}
            />
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const smStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: "#FFF", 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 40, 
    maxHeight: SCREEN_HEIGHT * 0.92,
    display: "flex",
    flexDirection: "column"
  },
  handle: { 
    width: 40, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: "#E0E0E0", 
    alignSelf: "center", 
    marginBottom: 14 
  },
  title: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#0D0D0D", 
    marginBottom: 18 
  },
  tabsContainer: { 
    flexDirection: "row", 
    gap: 8, 
    marginBottom: 20 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 10, 
    backgroundColor: "#F3F3F3", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#E8E8E8", 
    flexDirection: "row", 
    justifyContent: "center", 
    gap: 6 
  },
  tabActive: { 
    backgroundColor: "#E8E8E8", 
    borderColor: "#D0D0D0" 
  },
  tabDisabled: { 
    opacity: 0.4 
  },
  tabIcon: { 
    width: 18, 
    height: 18, 
    resizeMode: "contain" 
  },
  tabIconDisabled: { 
    tintColor: "#CCC" 
  },
  tabTxt: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: "#666" 
  },
  tabTxtActive: { 
    color: "#0D0D0D" 
  },
  tabTxtDisabled: { 
    color: "#999" 
  },
  content: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.65
  },
  textContent: { 
    gap: 0 
  },
  inputRow: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 18 
  },
  input: { 
    flex: 1, 
    height: 48, 
    borderWidth: 1, 
    borderColor: "#E8E8E8", 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    fontSize: 14, 
    color: "#0D0D0D", 
    backgroundColor: "#F8F8F8" 
  },
  goBtn: { 
    width: 48, 
    height: 48, 
    backgroundColor: "#D62828", 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  goBtnDisabled: { 
    backgroundColor: "#E8B4B4", 
    opacity: 0.6 
  },
  goBtnTxt: { 
    color: "#FFF", 
    fontWeight: "800", 
    fontSize: 14 
  },
  resultsContainer: {
    marginTop: 8,
    marginBottom: 20
  },
  resultsTitle: { 
    fontSize: 11, 
    fontWeight: "700", 
    color: "#999", 
    letterSpacing: 0.8, 
    marginBottom: 12,
    marginTop: 4
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    marginBottom: 8
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center"
  },
  resultIconImg: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    tintColor: "#D62828"
  },
  resultInfo: {
    flex: 1,
    gap: 2
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0D0D0D"
  },
  resultSubtitle: {
    fontSize: 12,
    color: "#666"
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12
  },
  noResultsIcon: {
    width: 48,
    height: 48,
    resizeMode: "contain",
    tintColor: "#CCC",
    marginBottom: 8
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333"
  },
  noResultsSubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center"
  },
  suggestionsTitle: { 
    fontSize: 11, 
    fontWeight: "700", 
    color: "#999", 
    letterSpacing: 0.8, 
    marginBottom: 10, 
    marginTop: 4 
  },
  suggestionRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F3F3F3" 
  },
  suggestionIcon: { 
    width: 16, 
    height: 16, 
    resizeMode: "contain", 
    tintColor: "#999" 
  },
  suggestionTxt: { 
    fontSize: 14, 
    color: "#333", 
    fontWeight: "500" 
  },
});