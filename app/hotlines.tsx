import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";

const HOTLINES = [
  {
    id: "fire",
    icon: require("../assets/images/fire.png"),
    title: "Fire",
    organization: "Bureau of Fire Protection",
    color: "#FF4444",
    bgColor: "#FFE8E8",
    numbers: [
      { label: "National Hotline", number: "160" },
      { label: "BFP Operations", number: "(02) 426-0246" },
      { label: "BFP Text Hotline", number: "09178112873" },
    ],
  },
  {
    id: "flood",
    icon: require("../assets/images/flood.png"),
    title: "Flood",
    organization: "PAGASA - NDRRMC",
    color: "#7C5DFF",
    bgColor: "#F0E8FF",
    numbers: [
      { label: "NDRRMC Hotline", number: "1355" },
      { label: "Flood Info Line", number: "02-8839-0001" },
    ],
  },
  {
    id: "typhoon",
    icon: require("../assets/images/typhoon.png"),
    title: "Typhoon",
    organization: "PAGASA - Red Cross PH",
    color: "#5B4FFF",
    bgColor: "#F0E8FF",
    numbers: [
      { label: "PAGASA Info", number: "02-8426-1468" },
      { label: "Red Cross PH", number: "143" },
    ],
  },
  {
    id: "earthquake",
    icon: require("../assets/images/earthquake.png"),
    title: "Earthquake",
    organization: "PHILVOCS - NDRRMC",
    color: "#27AE60",
    bgColor: "#E8F8F0",
    numbers: [
      { label: "PHILVOCS Hotline", number: "02-8426-9700" },
      { label: "Emergency Services", number: "911" },
    ],
  },
];

function HotlineCard({
  hotline,
}: {
  hotline: (typeof HOTLINES)[0];
}) {
  const [expanded, setExpanded] = useState(false);

  const handleCall = (number: string) => {
    // Remove any non-digit characters except +
    const cleanNumber = number.replace(/[^\d+]/g, "");
    const telUrl = `tel:${cleanNumber}`;
    
    Linking.canOpenURL(telUrl).then((supported) => {
      if (supported) {
        Linking.openURL(telUrl);
      } else {
        Alert.alert("Cannot call", `Unable to open dialer for ${number}`);
      }
    });
  };

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: hotline.bgColor }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleSection}>
            <Image source={hotline.icon} style={styles.icon} />
            <View style={styles.titleText}>
              <Text style={styles.title}>{hotline.title}</Text>
              <Text style={styles.organization}>{hotline.organization}</Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded ? "−" : "+"}</Text>
        </View>

        {expanded && (
          <View style={styles.expandedContent}>
            {hotline.numbers.map((item, idx) => (
              <View key={idx} style={styles.numberItem}>
                <View>
                  <Text style={styles.numberLabel}>{item.label}</Text>
                  <Text style={styles.numberValue}>{item.number}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(item.number)}
                >
                  <Text style={[styles.callBtnText, { color: hotline.color }]}>
                    📞 Call
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function EmergencyHotlines() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Emergency Hotlines</Text>
          <Text style={styles.headerSub}>Philippines</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>BY DISASTER TYPE</Text>

        {HOTLINES.map((hotline) => (
          <HotlineCard key={hotline.id} hotline={hotline} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backBtn: { fontSize: 28, color: "#0D0D0D", fontWeight: "700" },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0D0D0D" },
  headerSub: { fontSize: 12, color: "#999", marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.8,
    marginBottom: 14,
    marginTop: 4,
  },
  cardWrapper: { marginBottom: 12 },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleSection: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  icon: { width: 32, height: 32 },
  titleText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800", color: "#0D0D0D", marginBottom: 2 },
  organization: { fontSize: 11, color: "#888" },
  chevron: { fontSize: 20, color: "#0D0D0D", fontWeight: "700" },
  expandedContent: { marginTop: 14, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)", paddingTop: 12 },
  numberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  numberItem_last: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  numberLabel: { fontSize: 11, color: "#888", marginBottom: 3 },
  numberValue: { fontSize: 14, fontWeight: "700", color: "#0D0D0D" },
  callBtn: {
    borderWidth: 1.5,
    borderColor: "currentColor",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: "center",
  },
  callBtnText: { fontSize: 12, fontWeight: "700" },
});