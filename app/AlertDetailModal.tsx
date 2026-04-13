import { Ionicons } from "@expo/vector-icons";
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

type MetricCard = {
  label: string;
  value: string;
  color?: string;
};

type EmergencyContact = {
  name: string;
  subtitle: string;
  number: string;
  color: string;
};

// Hotlines data structure from EmergencyHotlines.tsx
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

// Map alert types to hotline data
function getContactsForAlert(alertType: AlertType): EmergencyContact[] {
  let hotlineData = null;

  switch (alertType) {
    case "flood":
      hotlineData = HOTLINES.find(h => h.id === "flood");
      break;
    case "earthquake":
      hotlineData = HOTLINES.find(h => h.id === "earthquake");
      break;
    case "typhoon":
      hotlineData = HOTLINES.find(h => h.id === "typhoon");
      break;
    case "fire":
      hotlineData = HOTLINES.find(h => h.id === "fire");
      break;
    case "storm":
    case "rain":
      hotlineData = HOTLINES.find(h => h.id === "flood");
      break;
    case "heat":
      // No specific hotline, use general emergency
      return [
        {
          name: "Emergency Services",
          subtitle: "General Emergency",
          number: "911",
          color: "#FF6B35",
        },
      ];
    default:
      return [];
  }

  if (!hotlineData) return [];

  // Convert hotline data to EmergencyContact format
  return hotlineData.numbers.map(num => ({
    name: hotlineData!.organization,
    subtitle: num.label,
    number: num.number,
    color: hotlineData!.color,
  }));
}

// Get metric cards based on alert type and raw data
function getMetricsForAlert(alert: AlertItem): MetricCard[] {
  const { type, raw, color } = alert;

  switch (type) {
    case "flood":
      return [
        {
          label: "Water Level",
          value: raw.waterLevel || "N/A",
          color: "#FF6B9D",
        },
        {
          label: "Flood Depth",
          value: raw.depth || "N/A",
          color: "#FF9EDD",
        },
        {
          label: "Status",
          value: raw.status || "Active",
          color: "#FFC0E0",
        },
      ];

    case "earthquake":
      return [
        {
          label: "Magnitude",
          value: `${raw.magnitude?.toFixed(1) || "N/A"}`,
          color: "#C8E6C9",
        },
        {
          label: "Depth",
          value: `${raw.depth?.toFixed(1) || "N/A"} km`,
          color: "#A5D6A7",
        },
        {
          label: "Status",
          value: "Reported",
          color: "#81C784",
        },
      ];

    case "typhoon":
      return [
        {
          label: "Wind Speed",
          value: raw.windSpeed || "N/A",
          color: "#E1F5FE",
        },
        {
          label: "Movement",
          value: raw.movement || "N/A",
          color: "#B3E5FC",
        },
        {
          label: "Status",
          value: raw.status || "Active",
          color: "#81D4FA",
        },
      ];

    default:
      return [
        {
          label: "Severity",
          value: alert.level,
          color: color + "20",
        },
        {
          label: "Updated",
          value: alert.time,
          color: color + "20",
        },
        {
          label: "Status",
          value: "Active",
          color: color + "20",
        },
      ];
  }
}

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
}

export default function AlertDetailModal({
  alert,
  onClose,
}: AlertDetailModalProps) {
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  if (!alert) return null;

  const metrics = getMetricsForAlert(alert);
  const contacts = getContactsForAlert(alert.type);

  const handleCall = (number: string) => {
    const cleanNumber = number.replace(/[^\d+]/g, "");
    const telUrl = `tel:${cleanNumber}`;

    Linking.canOpenURL(telUrl).then((supported) => {
      if (supported) {
        Linking.openURL(telUrl);
      } else {
        Alert.alert(
          "Cannot call",
          `Unable to open dialer for ${number}`
        );
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: alert.color }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.headerTitleSection}>
            {alert.icon && (
              <Image source={alert.icon} style={styles.headerIcon} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLocation}>
                {alert.raw.location || "Unknown Location"}
              </Text>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>{alert.title}</Text>
                <View style={[styles.levelBadgeHeader]}>
                  <Text style={styles.levelBadgeText}>{alert.level}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards */}
        <View style={styles.metricsSection}>
          {metrics.map((metric, idx) => (
            <View
              key={idx}
              style={[styles.metricCard, { backgroundColor: metric.color }]}
            >
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>

        {/* Incident Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INCIDENT DETAILS</Text>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {alert.raw.location || "Unknown"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {alert.raw.timestamp || alert.time}
            </Text>
          </View>

          {alert.raw.magnitude && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Magnitude</Text>
              <Text style={styles.detailValue}>
                {alert.raw.magnitude.toFixed(1)}
              </Text>
            </View>
          )}

          {alert.raw.depth && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Depth</Text>
              <Text style={styles.detailValue}>
                {typeof alert.raw.depth === "number"
                  ? `${alert.raw.depth.toFixed(1)} km`
                  : alert.raw.depth}
              </Text>
            </View>
          )}

          {alert.raw.riseRate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estimated Rise Rate</Text>
              <Text style={styles.detailValue}>{alert.raw.riseRate}</Text>
            </View>
          )}

          {alert.distance !== undefined && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Distance from You</Text>
              <Text style={[styles.detailValue, { color: alert.color }]}>
                {alert.distance.toFixed(1)} km
              </Text>
            </View>
          )}

          <Text style={styles.descriptionText}>{alert.desc}</Text>
        </View>

        {/* Emergency Contacts */}
        {contacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>

            {contacts.map((contact, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.contactCard}
                onPress={() =>
                  setExpandedContact(
                    expandedContact === contact.number
                      ? null
                      : contact.number
                  )
                }
                activeOpacity={0.7}
              >
                <View style={styles.contactHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactSubtitle}>
                      {contact.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      expandedContact === contact.number
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#999"
                  />
                </View>

                {expandedContact === contact.number && (
                  <View style={styles.contactExpanded}>
                    <View style={styles.phoneNumberSection}>
                      <Text style={styles.phoneNumber}>{contact.number}</Text>
                      <TouchableOpacity
                        style={[
                          styles.callButton,
                          { borderColor: contact.color },
                        ]}
                        onPress={() => handleCall(contact.number)}
                      >
                        <Text
                          style={[
                            styles.callButtonText,
                            { color: contact.color },
                          ]}
                        >
                          📞 Call
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Data Source Info */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoIcon}>ⓘ</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Data Source</Text>
                <Text style={styles.infoText}>
                  {alert.type === "earthquake" ? "PHIVOLCS" : "PAGASA"}
                </Text>
              </View>
            </View>
            <Text style={styles.infoLink}>
              Official alerts:{" "}
              {alert.type === "earthquake"
                ? "phivolcs.dost.gov.ph"
                : "pagasa.dost.gov.ph"}
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerContent: {
    gap: 12,
  },
  headerTitleSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginTop: 4,
  },
  headerLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
  },
  levelBadgeHeader: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D0D0D",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D0D0D",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginTop: 12,
  },
  contactCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D0D0D",
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 11,
    color: "#888",
  },
  contactExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  phoneNumberSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D62828",
    flex: 1,
  },
  callButton: {
    borderWidth: 1.5,
    borderColor: "#D62828",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: "center",
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#F0F4F9",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#3498DB",
  },
  infoHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 18,
    color: "#3498DB",
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F618D",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: "#555",
  },
  infoLink: {
    fontSize: 11,
    color: "#0099FF",
    fontWeight: "600",
    marginLeft: 28,
  },
});