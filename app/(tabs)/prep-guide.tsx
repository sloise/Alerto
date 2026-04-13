import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Go-Bag Data ─────────────────────────────────────────────────────────────
const GO_BAG_SECTIONS = [
  {
    id: "water",
    icon: "water-outline",
    name: "Water & Food",
    items: [
      "3-day water supply (1 liter/person/day)",
      "Non-perishable food (3-day supply)",
      "Manual can opener & utensils",
    ],
  },
  {
    id: "docs",
    icon: "document-text-outline",
    name: "Documents & Cash",
    items: [
      "Government IDs & birth certificates (copies)",
      "Insurance documents",
      "Emergency contact list",
      "Cash (small bills)",
    ],
  },
  {
    id: "medical",
    icon: "medkit-outline",
    name: "First Aid & Medicines",
    items: [
      "First aid kit",
      "Prescription medicines (7-day supply)",
      "Face masks & alcohol wipes",
      "Personal hygiene items",
    ],
  },
  {
    id: "tools",
    icon: "flashlight-outline",
    name: "Tools & Safety",
    items: [
      "Flashlight with extra batteries",
      "Battery-powered radio",
      "Whistle & multi-tool",
      "Waterproof bags",
    ],
  },
  {
    id: "clothes",
    icon: "shirt-outline",
    name: "Clothing & Shelter",
    items: [
      "Change of clothes per person",
      "Rain poncho & sturdy shoes",
      "Emergency blanket",
    ],
  },
  {
    id: "comms",
    icon: "battery-charging-outline",
    name: "Power & Communication",
    items: [
      "Fully charged power bank",
      "Phone charger & cables",
      "Written emergency numbers",
    ],
  },
];

const TOTAL_ITEMS = GO_BAG_SECTIONS.reduce((acc, s) => acc + s.items.length, 0);

// ─── Disaster Data ───────────────────────────────────────────────────────────────
const DISASTERS = [
  {
    id: "typhoon",
    label: "Typhoon",
    color: "#1565C0",
    iconColor: "#1565C0",
    image: require("../../assets/images/typhoon.png"), 
    bg: "#E3F2FD",
    videos: {
      BEFORE: require("../../assets/videos/Before a Typhoon.mp4"),
      DURING: require("../../assets/videos/During a Typhoon.mp4"),
      AFTER: require("../../assets/videos/After a Typhoon.mp4"),
    },
    steps: [
      {
        phase: "BEFORE",
        items: [
          "Monitor PAGASA weather bulletins regularly.",
          "Secure or bring indoors loose outdoor items.",
          "Prepare a go-bag: water, food, medicines, documents.",
          "Know your evacuation route and nearest evacuation center.",
          "Charge all devices and power banks.",
        ],
      },
      {
        phase: "DURING",
        items: [
          "Stay indoors and away from windows.",
          "Do not cross flooded roads or bridges.",
          "Turn off electrical appliances if flooding starts.",
          "Keep listening to emergency broadcasts.",
          "If told to evacuate, leave immediately.",
        ],
      },
      {
        phase: "AFTER",
        items: [
          "Do not go outside until authorities say it's safe.",
          "Check for structural damage before re-entering.",
          "Boil water before drinking — water may be contaminated.",
          "Document damage for insurance or relief claims.",
          "Help neighbors, especially elderly and children.",
        ],
      },
    ],
  },
  {
    id: "flood",
    label: "Flood",
    color: "#0277BD",
    iconColor: "#0277BD",
    image: require("../../assets/images/flood.png"), 
    bg: "#E1F5FE",
    videos: {
      BEFORE: require("../../assets/videos/During a Flood.mp4"),
      DURING: require("../../assets/videos/During a Flood.mp4"),
      AFTER: require("../../assets/videos/After a Flood.mp4"),
    },
    steps: [
      {
        phase: "BEFORE",
        items: [
          "Know if your area is in a flood-prone zone.",
          "Elevate important documents and valuables.",
          "Prepare emergency kit with 3-day supply of food and water.",
          "Know the location of the nearest evacuation center.",
          "Have an emergency communication plan with family.",
        ],
      },
      {
        phase: "DURING",
        items: [
          "Move to higher ground immediately.",
          "Never walk or drive through floodwater.",
          "Stay off bridges over fast-moving water.",
          "Disconnect electrical appliances if water is rising.",
          "Call for help if trapped — do not attempt to swim in flood currents.",
        ],
      },
      {
        phase: "AFTER",
        items: [
          "Return home only when authorities declare it safe.",
          "Avoid floodwater — it may be contaminated with sewage.",
          "Clean and disinfect everything that got wet.",
          "Watch for signs of waterborne illness: diarrhea, vomiting.",
          "Report damaged infrastructure to local government.",
        ],
      },
    ],
  },
  {
    id: "earthquake",
    label: "Earthquake",
    color: "#4E342E",
    iconColor: "#4E342E",
    image: require("../../assets/images/earthquake.png"), 
    bg: "#EFEBE9",
    videos: {
      BEFORE: require("../../assets/videos/Before an Earthquake.mp4"),
      DURING: require("../../assets/videos/During an Earthquake.mp4"),
      AFTER: require("../../assets/videos/After an Earthquake.mp4"),
    },
    steps: [
      {
        phase: "BEFORE",
        items: [
          "Secure heavy furniture and appliances to walls.",
          "Know the Drop, Cover, and Hold On technique.",
          "Keep emergency kit: water, food, first aid, flashlight.",
          "Identify safe spots in each room: under sturdy tables.",
          "Know how to shut off gas, water, and electricity.",
        ],
      },
      {
        phase: "DURING",
        items: [
          "DROP to hands and knees immediately.",
          "Take COVER under a sturdy table or against an interior wall.",
          "HOLD ON and protect your head and neck.",
          "Stay away from windows, exterior walls, and heavy furniture.",
          "If outdoors, move away from buildings, trees, and power lines.",
        ],
      },
      {
        phase: "AFTER",
        items: [
          "Expect aftershocks — stay alert.",
          "Check for gas leaks: if you smell gas, open windows and leave.",
          "Inspect your home for structural damage before staying.",
          "Do not use elevators.",
          "Listen to emergency radio for official updates.",
        ],
      },
    ],
  },
  {
    id: "fire",
    label: "Fire",
    color: "#BF360C",
    iconColor: "#BF360C",
    image: require("../../assets/images/fire.png"), 
    bg: "#FBE9E7",
    videos: {
      BEFORE: null,
      DURING: null,
      AFTER: null,
    },
    steps: [
      {
        phase: "BEFORE",
        items: [
          "Install smoke detectors on every floor.",
          "Plan and practice a home fire escape route.",
          "Keep fire extinguisher accessible and know how to use it.",
          "Never leave cooking unattended.",
          "Store flammable materials away from heat sources.",
        ],
      },
      {
        phase: "DURING",
        items: [
          "Get out immediately — do not grab belongings.",
          "Crawl low under smoke to exit.",
          "Feel doors before opening — if hot, use another exit.",
          "Close doors behind you to slow fire spread.",
          "Call 911 once you are safely outside.",
        ],
      },
      {
        phase: "AFTER",
        items: [
          "Do not re-enter until firefighters say it's safe.",
          "Contact your insurance company immediately.",
          "Seek temporary shelter through local DSWD or Red Cross.",
          "Watch for signs of shock or smoke inhalation.",
          "Document losses with photos for insurance claims.",
        ],
      },
    ],
  },
];

const PHASE_COLORS: Record<string, string> = {
  BEFORE: "#F57F17",
  DURING: "#D62828",
  AFTER: "#2E7D32",
};

// ─── Go-Bag Checklist Component ───────────────────────────────────────────────
function GoBagChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const progress = TOTAL_ITEMS > 0 ? totalChecked / TOTAL_ITEMS : 0;

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const getProgressMessage = () => {
    if (progress === 1) return "Complete - Your go-bag is ready!";
    if (progress >= 0.7) return "Almost ready - Keep going!";
    if (progress >= 0.3) return "Good progress - Continue packing";
    return "Start packing your emergency go-bag";
  };

  return (
    <View style={gStyles.container}>
      {/* Tappable Header — toggles the whole checklist */}
      <TouchableOpacity
        style={gStyles.header}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={gStyles.headerLeft}>
          <View style={gStyles.iconCircle}>
            <Ionicons name="briefcase-outline" size={24} color="#D62828" />
          </View>
          <View>
            <Text style={gStyles.title}>Emergency Go-Bag</Text>
            <Text style={gStyles.subtitle}>Essentials for any disaster</Text>
          </View>
        </View>
        <View style={gStyles.headerRight}>
          <View style={gStyles.progressCircle}>
            <Text style={gStyles.progressPercent}>{Math.round(progress * 100)}%</Text>
            <Text style={gStyles.progressLabel}>Ready</Text>
          </View>
          <MaterialIcons
            name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24}
            color="#999"
          />
        </View>
      </TouchableOpacity>

      {/* Progress bar — always visible */}
      <View style={gStyles.progressSection}>
        <View style={gStyles.progressTrack}>
          <View style={[gStyles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={gStyles.progressMessage}>{getProgressMessage()}</Text>
      </View>

      {/* Expanded content */}
      {isOpen && (
        <>
          {/* All items, grouped by section label */}
          {GO_BAG_SECTIONS.map((section, sIdx) => (
            <View
              key={section.id}
              style={[
                gStyles.section,
                sIdx === GO_BAG_SECTIONS.length - 1 && gStyles.sectionLast,
              ]}
            >
              {/* Section label row */}
              <View style={gStyles.sectionHeader}>
                <Ionicons name={section.icon as any} size={16} color="#D62828" />
                <Text style={gStyles.sectionName}>{section.name}</Text>
              </View>

              {/* Items */}
              {section.items.map((item, i) => {
                const key = `${section.id}_${i}`;
                const isChecked = !!checked[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={gStyles.item}
                    onPress={() => toggle(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[gStyles.checkbox, isChecked && gStyles.checkboxChecked]}>
                      {isChecked && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <Text
                      style={[gStyles.itemText, isChecked && gStyles.itemTextChecked]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const gStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D0D0D",
  },
  subtitle: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  progressCircle: {
    alignItems: "center",
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D62828",
  },
  progressLabel: {
    fontSize: 9,
    color: "#8E8E93",
    marginTop: 1,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 14,
  },
  progressTrack: {
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#D62828",
    height: 6,
    borderRadius: 6,
  },
  progressMessage: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 8,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingBottom: 6,
  },
  sectionLast: {
    paddingBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D62828",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 9,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D1D6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#D62828",
    borderColor: "#D62828",
  },
  itemText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
    lineHeight: 18,
  },
  itemTextChecked: {
    color: "#C6C6C8",
    textDecorationLine: "line-through",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PrepGuide() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof DISASTERS)[0] | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"BEFORE" | "DURING" | "AFTER">(
    "BEFORE"
  );
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const videoRef = useRef<Video>(null);

  const currentVideo = selected ? selected.videos[selectedPhase] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prep Guide</Text>
        <Text style={styles.headerSubtitle}>Be prepared, stay safe</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Go-Bag Checklist */}
        <GoBagChecklist />

        {/* Quick Tips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsRow}
        >
          {["📢 Stay Informed", "📦 Pack Early", "🏃 Know Routes", "👥 Help Others"].map(
            (tip) => (
              <View key={tip} style={styles.tipChip}>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            )
          )}
        </ScrollView>

        {/* Disaster Guides Section */}
        <Text style={styles.sectionTitle}>Disaster Preparedness Guides</Text>
        <View style={styles.grid}>
          {DISASTERS.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.disasterCard, { backgroundColor: d.bg }]}
              onPress={() => {
                setSelected(d);
                setSelectedPhase("BEFORE");
                setShowVideo(true);
              }}
              activeOpacity={0.8}
            >
              {/* Custom icon with color tint */}
              <View style={styles.iconContainer}>
                <RNImage
                  source={d.image}
                  style={[styles.customIcon, { tintColor: d.iconColor }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.disasterLabel, { color: d.color }]}>
                {d.label}
              </Text>
              <View style={styles.disasterArrow}>
                <Text style={[styles.disasterArrowText, { color: d.color }]}>
                  View Guide
                </Text>
                <MaterialIcons name="arrow-forward" size={14} color={d.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Guide Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.modalHeader, { backgroundColor: selected.bg }]}>
              {/* Custom icon with color in header */}
              <View style={styles.modalIconContainer}>
                <RNImage
                  source={selected.image}
                  style={[styles.modalCustomIcon, { tintColor: selected.iconColor }]}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: selected.color }]}>
                  {selected.label} Guide
                </Text>
                <Text style={styles.modalSubtitle}>What to do before, during & after</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={styles.closeBtn}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Phase Selector Tabs */}
              <View style={styles.phaseTabsContainer}>
                {(["BEFORE", "DURING", "AFTER"] as const).map((phase) => (
                  <TouchableOpacity
                    key={phase}
                    style={[
                      styles.phaseTab,
                      selectedPhase === phase && [
                        styles.phaseTabActive,
                        { backgroundColor: PHASE_COLORS[phase] },
                      ],
                    ]}
                    onPress={() => setSelectedPhase(phase)}
                  >
                    <Text
                      style={[
                        styles.phaseTabText,
                        selectedPhase === phase && styles.phaseTabTextActive,
                      ]}
                    >
                      {phase}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Video Section - Header Always Visible */}
              <View style={styles.videoSection}>
                <View style={styles.videoHeader}>
                  <View style={styles.videoTitleRow}>
                    <RNImage
                      source={require("../../assets/images/video.png")}
                      style={styles.videoIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.videoTitle}>Video Tutorial</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.hideVideoBtn}
                    onPress={() => setShowVideo(!showVideo)}
                  >
                    <Text style={styles.hideVideoBtnText}>
                      {showVideo ? "HIDE VIDEO" : "SHOW VIDEO"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Video Content - Toggles on/off */}
                {showVideo && (
                  <>
                    {currentVideo ? (
                      <View style={styles.videoWrapper}>
                        {isLoadingVideo && (
                          <View style={styles.videoLoadingOverlay}>
                            <ActivityIndicator size="large" color={selected.color} />
                            <Text style={styles.videoLoadingText}>Loading video...</Text>
                          </View>
                        )}
                        <Video
                          ref={videoRef}
                          source={currentVideo}
                          style={styles.video}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          isLooping={false}
                          onLoadStart={() => setIsLoadingVideo(true)}
                          onLoad={() => setIsLoadingVideo(false)}
                          onError={(error) => {
                            console.log("Video Error:", error);
                            setIsLoadingVideo(false);
                          }}
                        />
                      </View>
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Ionicons name="film-outline" size={48} color="#CCC" />
                        <Text style={styles.videoPlaceholderText}>Video Coming Soon</Text>
                        <Text style={styles.videoPlaceholderSubtext}>
                          Check back for video tutorials
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Guide Section */}
              <View style={styles.guideSection}>
                <View style={styles.guideHeader}>
                  <View style={styles.guideTitleRow}>
                    <RNImage
                      source={require("../../assets/images/written.png")}
                      style={styles.writtenIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.guideTitle}>Written Guide</Text>
                  </View>
                  <View style={styles.guideBadge}>
                    <Text style={styles.guideBadgeText}>STEP-BY-STEP</Text>
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {selected.steps
                    .filter((s) => s.phase === selectedPhase)
                    .map((section) => (
                      <View key={section.phase} style={styles.phaseBlock}>
                        {section.items.map((item, i) => (
                          <View key={i} style={styles.stepRow}>
                            <View
                              style={[
                                styles.stepDot,
                                {
                                  backgroundColor: PHASE_COLORS[section.phase],
                                },
                              ]}
                            />
                            <Text style={styles.stepText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                </ScrollView>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0D0D0D",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  tipsRow: {
    gap: 10,
    paddingBottom: 20,
  },
  tipChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D0D0D",
    marginBottom: 14,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  disasterCard: {
    width: "48%",
    borderRadius: 16,
    padding: 18,
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  customIcon: {
    width: 48,
    height: 48,
  },
  disasterLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  disasterArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  disasterArrowText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  modalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCustomIcon: {
    width: 40,
    height: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  phaseTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  phaseTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  phaseTabActive: {
    backgroundColor: "#D62828",
  },
  phaseTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  phaseTabTextActive: {
    color: "#FFFFFF",
  },
  videoSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  videoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  videoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoIcon: {
    width: 20,
    height: 20,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D0D0D",
  },
  hideVideoBtn: {
    backgroundColor: "#D62828",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  hideVideoBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  videoWrapper: {
    marginBottom: 12,
  },
  videoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  videoLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  video: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  videoPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  videoPlaceholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginTop: 12,
  },
  videoPlaceholderSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  guideSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  guideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  guideHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  writtenIcon: {
    width: 20,
    height: 20,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D0D0D",
  },
  guideBadge: {
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  guideBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6C757D",
  },
  modalScroll: {
    paddingBottom: 40,
  },
  phaseBlock: {
    marginBottom: 28,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 21,
    flex: 1,
  },
});