import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Marker, Polygon } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccessibility } from "../../components/AccessibilityContext";
import { db } from "../../firebaseConfig";
import { LocationContext } from "../_layout";
import { ScaledText } from "../ScaledText";

const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#D62828",
  primaryDark: "#A02020",
  primaryLight: "#FF4444",
  background: "#F8F9FA",
  surface: "#FFFFFF",
  text: {
    primary: "#0D0D0D",
    secondary: "#666666",
    tertiary: "#999999",
  },
  hazard: {
    flood: "#2196F3",
    earthquake: "#F44336",
    volcano: "#FF9800",
    liquefaction: "#9C27B0",
  },
  status: {
    success: "#4CAF50",
    warning: "#FFC107",
    error: "#D62828",
  },
  border: "#EBEBEB",
};

type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  type: string;
  capacity?: number;
  distance?: number;
};

const FLOOD_HAZARD_AREAS = [
  {
    id: "flood_mm",
    name: "Metro Manila Flood Zone",
    riskLevel: "High",
    coordinates: [
      { latitude: 14.65, longitude: 120.95 },
      { latitude: 14.66, longitude: 120.97 },
      { latitude: 14.64, longitude: 120.98 },
      { latitude: 14.63, longitude: 120.96 },
    ],
  },
  {
    id: "flood_pampanga",
    name: "Pampanga Flood Zone",
    riskLevel: "Medium",
    coordinates: [
      { latitude: 14.95, longitude: 120.65 },
      { latitude: 14.97, longitude: 120.67 },
      { latitude: 14.96, longitude: 120.69 },
      { latitude: 14.94, longitude: 120.67 },
    ],
  },
];

const EARTHQUAKE_FAULT_LINES = [
  {
    id: "fault_mv",
    name: "Marikina Valley Fault",
    magnitude: "6.7–7.2",
    coordinates: [
      { latitude: 14.75, longitude: 121.1 },
      { latitude: 14.7, longitude: 121.08 },
      { latitude: 14.65, longitude: 121.06 },
      { latitude: 14.6, longitude: 121.04 },
      { latitude: 14.55, longitude: 121.02 },
    ],
  },
];

const VOLCANOES = [
  {
    id: "volc_1",
    name: "Mayon Volcano",
    latitude: 13.2567,
    longitude: 123.6854,
    elevation: "2,463 m",
    status: "Active",
  },
  {
    id: "volc_2",
    name: "Taal Volcano",
    latitude: 14.0102,
    longitude: 120.9973,
    elevation: "311 m",
    status: "Restless",
  },
  {
    id: "volc_3",
    name: "Pinatubo",
    latitude: 15.1372,
    longitude: 120.3491,
    elevation: "1,486 m",
    status: "Dormant",
  },
];

const LIQUEFACTION_ZONES = [
  {
    id: "liq_mm",
    name: "Manila Bay Area",
    riskLevel: "High",
    coordinates: [
      { latitude: 14.58, longitude: 120.95 },
      { latitude: 14.59, longitude: 120.96 },
      { latitude: 14.585, longitude: 120.97 },
      { latitude: 14.575, longitude: 120.955 },
    ],
  },
];

function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HazardMap() {
  const { latitude, longitude } = useContext(LocationContext);
  const { isLocationEnabled } = useAccessibility();

  const hazardMapRef = useRef<MapView>(null);
  const centerMapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.8)).current;

  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoModal, setInfoModal] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [activeTab, setActiveTab] = useState<"hazards" | "centers">("centers");
  const [visibleCity, setVisibleCity] = useState<string | null>(null);
  const [visibleCityAliases, setVisibleCityAliases] = useState<string[]>([]);
  const geocodeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animations = [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ];
    Animated.parallel(animations).start();
    loadCenters();
  }, []);

  useEffect(() => {
    if (infoModal) {
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalScaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [infoModal]);

  useEffect(() => {
    if (latitude && longitude) {
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      console.log("🗺️ Nominatim address:", JSON.stringify(data.address));

      const addr = data.address || {};
      const raw: string[] = [
        addr.city,
        addr.town,
        addr.municipality,
        addr.suburb,
        addr.city_district,
        addr.county,
        addr.state_district,
      ].filter(Boolean) as string[];

      if (raw.length === 0) return;

      const aliases: string[] = [];
      raw.forEach((r) => {
        aliases.push(r.toLowerCase());
        aliases.push(r.replace(/^City of\s+/i, "").trim().toLowerCase());
        aliases.push(r.replace(/\s+City$/i, "").trim().toLowerCase());
      });
      const unique = [...new Set(aliases)];

      console.log("🏙️ City aliases:", unique);
      setVisibleCity(raw[0].replace(/^City of\s+/i, "").trim());
      setVisibleCityAliases(unique);
    } catch (e) {
      console.warn("Reverse geocode failed:", e);
    }
  }

  function handleRegionChangeComplete(region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) {
    if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);
    geocodeDebounce.current = setTimeout(() => {
      reverseGeocode(region.latitude, region.longitude);
    }, 600);
  }

  const visibleCenters =
    visibleCityAliases.length > 0
      ? centers.filter((c) => {
          const district = (c.district ?? "").toLowerCase();
          const address = (c.address ?? "").toLowerCase();
          const matched = visibleCityAliases.some(
            (alias) =>
              district.includes(alias) ||
              alias.includes(district) ||
              address.includes(alias)
          );
          return matched;
        })
      : centers;

  async function loadCenters() {
    try {
      const snapshot = await getDocs(collection(db, "evacuation_centers"));
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as EvacuationCenter[];
      console.log(
        "🏢 Center districts:",
        [...new Set(data.map((c) => c.district))]
      );
      if (latitude && longitude) {
        const withDist = data.map((c) => ({
          ...c,
          distance: getDistance(latitude, longitude, c.latitude, c.longitude),
        }));
        setCenters(withDist.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)));
      } else {
        setCenters(data);
      }
    } catch (e) {
      console.error("❌ Error loading evacuation centers:", e);
    } finally {
      setLoading(false);
    }
  }

  // Opens Google Maps with the user's current location as origin and the
  // selected evacuation center as the destination.
  function openDirections() {
    if (!selectedCenter) return;
    const { latitude: destLat, longitude: destLng } = selectedCenter;
    const origin =
      latitude && longitude ? `&origin=${latitude},${longitude}` : "";
    const url =
      `https://www.google.com/maps/dir/?api=1${origin}` +
      `&destination=${destLat},${destLng}&travelmode=driving`;
    Linking.openURL(url);
  }

  const closeInfoModal = () => {
    Animated.timing(modalScaleAnim, {
      toValue: 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setInfoModal(false));
  };

  const mapRegion = {
    latitude: latitude || 14.62,
    longitude: longitude || 120.98,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  // Early return AFTER all hooks
  if (!isLocationEnabled) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.locationDisabledContainer}>
          <View style={styles.locationDisabledIconWrap}>
            <MaterialIcons name="location-off" size={48} color="#C6C6C8" />
          </View>
          <ScaledText variant="h3" style={styles.locationDisabledTitle}>Location Disabled</ScaledText>
          <ScaledText variant="body" style={styles.locationDisabledBody}>
            Enable Location Services in your Profile settings to view the hazard map and nearby evacuation centers.
          </ScaledText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <ScaledText variant="h2" style={styles.headerTitle}>Disaster Watch</ScaledText>
              </View>
            </View>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() =>
                setMapType(mapType === "standard" ? "satellite" : "standard")
              }
              accessibilityLabel={`Switch to ${
                mapType === "standard" ? "satellite" : "standard"
              } view`}
              accessibilityRole="button"
            >
              <MaterialIcons
                name={mapType === "standard" ? "map" : "satellite"}
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setInfoModal(true)}
              accessibilityLabel="Open information"
              accessibilityRole="button"
            >
              <MaterialIcons
                name="info-outline"
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBackground} />
          <TouchableOpacity
            style={[styles.tab, activeTab === "centers" && styles.tabActive]}
            onPress={() => setActiveTab("centers")}
            accessibilityLabel="Evacuation centers"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "centers" }}
          >
            <MaterialIcons
              name="location-city"
              size={18}
              color={activeTab === "centers" ? "#FFF" : COLORS.text.secondary}
            />
            <ScaledText
              variant="label"
              style={[
                styles.tabText,
                activeTab === "centers" && styles.tabTextActive,
              ]}
            >
              Centers
            </ScaledText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "hazards" && styles.tabActive]}
            onPress={() => setActiveTab("hazards")}
            accessibilityLabel="Hazards map"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "hazards" }}
          >
            <MaterialIcons
              name="warning"
              size={18}
              color={activeTab === "hazards" ? "#FFF" : COLORS.text.secondary}
            />
            <ScaledText
              variant="label"
              style={[
                styles.tabText,
                activeTab === "hazards" && styles.tabTextActive,
              ]}
            >
              Hazards
            </ScaledText>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* Evacuation Centers Tab */}
          {activeTab === "centers" && (
            <Animated.View
              style={[
                styles.mapContainer,
                { transform: [{ translateY: slideUpAnim }] },
              ]}
            >
              <View style={styles.mapWrap}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="large"
                      color={COLORS.primary}
                      style={styles.spinner}
                    />
                    <ScaledText variant="body" style={styles.loadingText}>
                      Fetching evacuation centers...
                    </ScaledText>
                  </View>
                ) : (
                  <MapView
                    ref={centerMapRef}
                    style={styles.map}
                    initialRegion={mapRegion}
                    mapType={mapType}
                    showsUserLocation
                    showsCompass
                    showsScale
                    loadingEnabled
                    loadingIndicatorColor={COLORS.primary}
                    onRegionChangeComplete={handleRegionChangeComplete}
                  >
                    {visibleCenters.map((c) => (
                      <Marker
                        key={c.id}
                        coordinate={{
                          latitude: c.latitude,
                          longitude: c.longitude,
                        }}
                        title={c.name}
                        description={c.type}
                        onPress={() => setSelectedCenter(c)}
                      >
                        <View
                          style={[
                            styles.centerMarker,
                            selectedCenter?.id === c.id &&
                              styles.centerMarkerActive,
                          ]}
                        >
                          <MaterialIcons
                            name="location-on"
                            size={14}
                            color="#FFF"
                          />
                        </View>
                      </Marker>
                    ))}
                  </MapView>
                )}

                {/* City indicator pill */}
                {visibleCity && (
                  <View style={styles.cityPill}>
                    <MaterialIcons
                      name="location-city"
                      size={12}
                      color={COLORS.primary}
                    />
                    <ScaledText variant="label" style={styles.cityPillText}>{visibleCity}</ScaledText>
                    <ScaledText variant="caption" style={styles.cityPillCount}>
                      {visibleCenters.length} center
                      {visibleCenters.length !== 1 ? "s" : ""}
                    </ScaledText>
                  </View>
                )}

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() =>
                      centerMapRef.current?.animateToRegion(
                        {
                          ...mapRegion,
                          latitudeDelta: mapRegion.latitudeDelta * 0.5,
                          longitudeDelta: mapRegion.longitudeDelta * 0.5,
                        },
                        300
                      )
                    }
                    accessibilityLabel="Zoom in"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="add"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() =>
                      centerMapRef.current?.animateToRegion(
                        {
                          ...mapRegion,
                          latitudeDelta: mapRegion.latitudeDelta * 1.5,
                          longitudeDelta: mapRegion.longitudeDelta * 1.5,
                        },
                        300
                      )
                    }
                    accessibilityLabel="Zoom out"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="remove"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Re-center button */}
                {latitude && longitude && (
                  <TouchableOpacity
                    style={styles.recenterBtn}
                    onPress={() =>
                      centerMapRef.current?.animateToRegion(
                        {
                          latitude,
                          longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        },
                        500
                      )
                    }
                    accessibilityLabel="Re-center map to your location"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="my-location"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Selected Center Card */}
              {selectedCenter && !infoModal && (
                <Animated.View
                  style={[
                    styles.card,
                    {
                      transform: [
                        {
                          translateY: slideUpAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: [0, 50],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <MaterialIcons
                        name="location-city"
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <ScaledText variant="h4" style={styles.cardName} numberOfLines={1}>
                        {selectedCenter.name}
                      </ScaledText>
                      <ScaledText variant="label" style={styles.cardType} numberOfLines={1}>
                        {selectedCenter.type}
                      </ScaledText>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedCenter(null)}
                      accessibilityLabel="Close card"
                      accessibilityRole="button"
                      style={styles.closeBtn}
                    >
                      <MaterialIcons
                        name="close"
                        size={22}
                        color={COLORS.text.tertiary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color={COLORS.text.tertiary}
                      />
                      <View style={styles.detailText}>
                        <ScaledText variant="caption" style={styles.detailLabel}>Address</ScaledText>
                        <ScaledText variant="body" style={styles.detailValue} numberOfLines={2}>
                          {selectedCenter.address}
                        </ScaledText>
                      </View>
                    </View>

                    {selectedCenter.distance !== undefined && (
                      <View style={styles.detailRow}>
                        <MaterialIcons
                          name="straighten"
                          size={16}
                          color={COLORS.text.tertiary}
                        />
                        <View style={styles.detailText}>
                          <ScaledText variant="caption" style={styles.detailLabel}>Distance</ScaledText>
                          <ScaledText variant="body" style={styles.detailValue}>
                            {selectedCenter.distance.toFixed(2)} km away
                          </ScaledText>
                        </View>
                      </View>
                    )}

                    {selectedCenter.capacity && (
                      <View style={styles.detailRow}>
                        <MaterialIcons
                          name="people"
                          size={16}
                          color={COLORS.text.tertiary}
                        />
                        <View style={styles.detailText}>
                          <ScaledText variant="caption" style={styles.detailLabel}>Capacity</ScaledText>
                          <ScaledText variant="body" style={styles.detailValue}>
                            {selectedCenter.capacity} persons
                          </ScaledText>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Get Directions — opens Google Maps directly with user location as origin */}
                  <TouchableOpacity
                    style={styles.dirBtn}
                    onPress={openDirections}
                    accessibilityLabel="Get directions to this evacuation center"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="directions" size={18} color="#FFF" />
                    <ScaledText variant="button" style={styles.dirBtnTxt}>Get Directions</ScaledText>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Hazards Tab */}
          {activeTab === "hazards" && (
            <Animated.View
              style={[
                styles.mapContainer,
                { transform: [{ translateY: slideUpAnim }] },
              ]}
            >
              <View style={styles.mapWrap}>
                <MapView
                  ref={hazardMapRef}
                  style={styles.map}
                  initialRegion={mapRegion}
                  mapType={mapType}
                  showsUserLocation
                  showsCompass
                  showsScale
                  loadingEnabled
                  loadingIndicatorColor={COLORS.primary}
                >
                  {FLOOD_HAZARD_AREAS.map((area) => (
                    <Polygon
                      key={area.id}
                      coordinates={area.coordinates}
                      fillColor="rgba(33,150,243,0.25)"
                      strokeColor={COLORS.hazard.flood}
                      strokeWidth={2.5}
                    />
                  ))}

                  {EARTHQUAKE_FAULT_LINES.map((fault) => (
                    <Polygon
                      key={fault.id}
                      coordinates={fault.coordinates}
                      fillColor="rgba(244,67,54,0.25)"
                      strokeColor={COLORS.hazard.earthquake}
                      strokeWidth={3}
                    />
                  ))}

                  {LIQUEFACTION_ZONES.map((zone) => (
                    <Polygon
                      key={zone.id}
                      coordinates={zone.coordinates}
                      fillColor="rgba(156,39,176,0.25)"
                      strokeColor={COLORS.hazard.liquefaction}
                      strokeWidth={2.5}
                    />
                  ))}

                  {VOLCANOES.map((v) => (
                    <Marker
                      key={v.id}
                      coordinate={{
                        latitude: v.latitude,
                        longitude: v.longitude,
                      }}
                      title={v.name}
                      description={`${v.status} • ${v.elevation}`}
                    >
                      <View style={styles.volcMarker}>
                        <MaterialCommunityIcons
                          name="volcano"
                          size={18}
                          color="#FFF"
                        />
                      </View>
                    </Marker>
                  ))}
                </MapView>

                {/* Legend */}
                <View style={styles.legend}>
                  <ScaledText variant="caption" style={styles.legendTitle}>Hazard Types</ScaledText>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendIndicator,
                        { backgroundColor: COLORS.hazard.flood },
                      ]}
                    />
                    <ScaledText variant="caption" style={styles.legendText}>Flood Zones</ScaledText>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendIndicator,
                        { backgroundColor: COLORS.hazard.earthquake },
                      ]}
                    />
                    <ScaledText variant="caption" style={styles.legendText}>Fault Lines</ScaledText>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendIndicator,
                        { backgroundColor: COLORS.hazard.volcano },
                      ]}
                    />
                    <ScaledText variant="caption" style={styles.legendText}>Volcanoes</ScaledText>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendIndicator,
                        { backgroundColor: COLORS.hazard.liquefaction },
                      ]}
                    />
                    <ScaledText variant="caption" style={styles.legendText}>Liquefaction</ScaledText>
                  </View>
                </View>

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() =>
                      hazardMapRef.current?.animateToRegion(
                        {
                          ...mapRegion,
                          latitudeDelta: mapRegion.latitudeDelta * 0.5,
                          longitudeDelta: mapRegion.longitudeDelta * 0.5,
                        },
                        300
                      )
                    }
                    accessibilityLabel="Zoom in"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="add"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() =>
                      hazardMapRef.current?.animateToRegion(
                        {
                          ...mapRegion,
                          latitudeDelta: mapRegion.latitudeDelta * 1.5,
                          longitudeDelta: mapRegion.longitudeDelta * 1.5,
                        },
                        300
                      )
                    }
                    accessibilityLabel="Zoom out"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="remove"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Re-center button */}
                {latitude && longitude && (
                  <TouchableOpacity
                    style={styles.recenterBtn}
                    onPress={() =>
                      hazardMapRef.current?.animateToRegion(
                        {
                          latitude,
                          longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        },
                        500
                      )
                    }
                    accessibilityLabel="Re-center map to your location"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="my-location"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          {/* Official Sources */}
          {!infoModal && (
            <View style={styles.sources}>
              <ScaledText variant="h4" style={styles.sourcesTitle}>Official Resources</ScaledText>
              <View style={styles.sourceGrid}>
                {[
                  {
                    label: "HazardHunter",
                    color: COLORS.status.success,
                    icon: "shield-check",
                    url: "https://hazardhunter.georisk.gov.ph/",
                  },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.label}
                    style={styles.sourceItem}
                    onPress={() => Linking.openURL(s.url)}
                    accessibilityLabel={`Open ${s.label}`}
                    accessibilityRole="link"
                  >
                    <View
                      style={[styles.sourceIcon, { backgroundColor: s.color }]}
                    >
                      <MaterialCommunityIcons
                        name={s.icon as any}
                        size={20}
                        color="#FFF"
                      />
                    </View>
                    <ScaledText variant="caption" style={styles.sourceLabel}>{s.label}</ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Footer */}
          {!infoModal && (
            <ScaledText variant="caption" style={styles.footer}>
              Last updated: {new Date().toLocaleTimeString()} • Monitoring active
            </ScaledText>
          )}
        </ScrollView>
      </Animated.View>

      {/* Info Modal */}
      <Modal
        visible={infoModal}
        transparent
        animationType="none"
        onRequestClose={closeInfoModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeInfoModal}
          >
            <Animated.View
              style={[
                styles.modalBox,
                {
                  transform: [{ scale: modalScaleAnim }],
                  opacity: modalScaleAnim.interpolate({
                    inputRange: [0.8, 1],
                    outputRange: [0, 1],
                  }),
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHead}>
                <ScaledText variant="h3" style={styles.modalTitle}>About Disaster Watch</ScaledText>
                <TouchableOpacity
                  onPress={closeInfoModal}
                  accessibilityLabel="Close modal"
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
              >
                <View style={styles.section}>
                  <ScaledText variant="h4" style={styles.sectionTitle}>Purpose</ScaledText>
                  <ScaledText variant="body" style={styles.sectionBody}>
                    Disaster Watch provides real-time monitoring of natural
                    hazards in Luzon and displays nearby evacuation centers for
                    emergency preparedness.
                  </ScaledText>
                </View>

                <View style={styles.section}>
                  <ScaledText variant="h4" style={styles.sectionTitle}>Hazards Map</ScaledText>
                  <View style={styles.bulletList}>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Flood-prone areas based on historical data
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Active fault lines including Marikina Valley Fault
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Volcanic monitoring zones (Mayon, Taal, Pinatubo)
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Liquefaction-prone areas in coastal regions
                    </ScaledText>
                  </View>
                </View>

                <View style={styles.section}>
                  <ScaledText variant="h4" style={styles.sectionTitle}>Evacuation Centers</ScaledText>
                  <View style={styles.bulletList}>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Verified evacuation centers across Luzon
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Distance from your current location
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Direct directions via Google Maps from your location
                    </ScaledText>
                  </View>
                </View>

                <View style={styles.section}>
                  <ScaledText variant="h4" style={styles.sectionTitle}>Features</ScaledText>
                  <View style={styles.bulletList}>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Toggle between standard and satellite map views
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Your location displayed on map with live updates
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Quick access to official monitoring agencies
                    </ScaledText>
                    <ScaledText variant="body" style={styles.bullet}>
                      • Zoom in and out for detailed map navigation
                    </ScaledText>
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closeInfoModal}
              >
                <ScaledText variant="button" style={styles.modalCloseTxt}>Understood</ScaledText>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },

  locationDisabledContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    backgroundColor: COLORS.background,
  },
  locationDisabledIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  locationDisabledTitle: {
    color: COLORS.text.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  locationDisabledBody: {
    color: COLORS.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },

  scrollContainer: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: { flex: 1 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: {
    color: COLORS.text.primary,
    letterSpacing: 0.3,
  },
  headerSub: { color: COLORS.text.tertiary, marginTop: 2 },
  headerControls: { flexDirection: "row", gap: 10 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "transparent",
    height: 48,
    position: "relative",
  },
  tabBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderRadius: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 22,
    marginHorizontal: 4,
    zIndex: 1,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tabText: {
    color: COLORS.text.secondary,
  },
  tabTextActive: { color: "#FFF" },

  mapContainer: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  mapWrap: {
    height: height * 0.4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  spinner: { marginBottom: 16 },
  loadingText: {
    color: COLORS.text.secondary,
  },

  volcMarker: {
    backgroundColor: COLORS.hazard.volcano,
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centerMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2.5,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  centerMarkerActive: {
    backgroundColor: COLORS.text.primary,
    transform: [{ scale: 1.3 }],
    borderWidth: 3,
  },

  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 14,
    padding: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    color: COLORS.text.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  legendIndicator: { width: 12, height: 12, borderRadius: 4 },
  legendText: {
    color: COLORS.text.secondary,
  },

  zoomControls: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 8,
  },
  zoomBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  recenterBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cityPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    left: "50%",
    transform: [{ translateX: -80 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(214,40,40,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 160,
    justifyContent: "center",
  },
  cityPillText: {
    color: COLORS.text.primary,
  },
  cityPillCount: {
    color: COLORS.primary,
    marginLeft: 2,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(214, 40, 40, 0.1)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  cardType: {
    color: COLORS.text.secondary,
  },
  closeBtn: { padding: 4 },
  cardDivider: { height: 1, backgroundColor: COLORS.border },
  cardDetails: { padding: 14, gap: 12 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailText: { flex: 1 },
  detailLabel: {
    color: COLORS.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    color: COLORS.text.primary,
    marginTop: 2,
  },
  dirBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dirBtnTxt: { color: "#FFF" },

  sources: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  sourcesTitle: {
    color: COLORS.text.primary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  sourceGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  sourceItem: { alignItems: "center", gap: 8, flex: 1 },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceLabel: {
    color: COLORS.text.secondary,
    textAlign: "center",
  },

  footer: {
    textAlign: "center",
    color: COLORS.text.tertiary,
    marginBottom: 16,
  },

  modalContainer: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 20,
    width: "100%",
    maxHeight: height * 0.8,
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text.primary,
    letterSpacing: 0.2,
    flex: 1,
  },
  modalScroll: { marginHorizontal: -4, marginBottom: 16 },
  section: { marginBottom: 18 },
  sectionTitle: {
    color: COLORS.text.primary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionBody: {
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  bulletList: { gap: 6 },
  bullet: {
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseTxt: { color: "#FFF" },
});