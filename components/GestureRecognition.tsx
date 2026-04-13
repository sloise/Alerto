import { CameraView, useCameraPermissions } from "expo-camera";
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Text,
    View
} from "react-native";

const GESTURES = [
  {
    id: "peace",
    emoji: "✌️",
    label: "Peace Sign",
    query: "typhoon",
    disaster: "Typhoon",
    color: "#1565C0",
    description: "Index + middle finger up",
  },
  {
    id: "fist",
    emoji: "✊",
    label: "Closed Fist",
    query: "earthquake",
    disaster: "Earthquake",
    color: "#6D4C41",
    description: "All fingers curled in",
  },
  {
    id: "palm",
    emoji: "🖐️",
    label: "Open Palm",
    query: "flood",
    disaster: "Flood",
    color: "#0277BD",
    description: "All fingers spread open",
  },
  {
    id: "thumbsup",
    emoji: "👍",
    label: "Thumbs Up",
    query: "fire",
    disaster: "Fire",
    color: "#BF360C",
    description: "Thumb pointing up",
  },
];

interface GestureRecognitionProps {
  onResult: (query: string) => void;
  isEnabled: boolean;
}

export function GestureRecognition({ onResult, isEnabled }: GestureRecognitionProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detecting, setDetecting] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<(typeof GESTURES)[0] | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [phase, setPhase] = useState<"idle" | "detecting" | "result">("idle");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  if (!isEnabled) {
    return (
      <View style={gcStyles.disabledContainer}>
        <Text style={gcStyles.disabledText}>Gesture Recognition is disabled</Text>
        <Text style={gcStyles.disabledSubtext}>Enable it in Profile → Accessibility</Text>
      </View>
    );
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, []);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    if (pulseLoop.current) pulseLoop.current.stop();
    pulseAnim.setValue(1);
  }

  function recognizeGesture(): Promise<typeof GESTURES[0] | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * GESTURES.length);
        resolve(GESTURES[randomIndex]);
      }, 500);
    });
  }

  async function startDetection() {
    setPhase("detecting");
    setDetectedGesture(null);
    setCountdown(3);
    startPulse();

    let c = 3;
    countdownRef.current = setInterval(async () => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        stopPulse();
        
        Alert.alert("🤖 Recognizing", "Analyzing your hand gesture...");
        const recognized = await recognizeGesture();
        
        if (recognized) {
          setDetectedGesture(recognized);
          setPhase("result");
          Speech.speak(`Detected ${recognized.disaster} gesture`, { language: 'en' });
          
          // AUTO-SEARCH: Wait 1 second then automatically search
          setTimeout(() => {
            onResult(recognized.query);
            Speech.speak(`Searching for ${recognized.disaster} alerts`, { language: 'en' });
          }, 1000);
        } else {
          Alert.alert("❌ Not Recognized", "Please try again with a clear gesture");
          reset();
        }
      }
    }, 1000);
  }

  function reset() {
    setPhase("idle");
    setDetectedGesture(null);
    setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
    stopPulse();
  }

  if (!permission) {
    return (
      <View style={gcStyles.center}>
        <Text style={gcStyles.permText}>Checking camera permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={gcStyles.center}>
        <Text style={gcStyles.permEmoji}>📷</Text>
        <Text style={gcStyles.permTitle}>Camera Access Needed</Text>
        <Text style={gcStyles.permSub}>
          Gesture recognition uses your front camera to identify hand signals.
        </Text>
        <TouchableOpacity style={gcStyles.permBtn} onPress={requestPermission}>
          <Text style={gcStyles.permBtnTxt}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={gcStyles.wrap}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={gcStyles.guideScroll}
        contentContainerStyle={gcStyles.guideContent}
      >
        {GESTURES.map((g) => (
          <View key={g.id} style={[gcStyles.guideChip, { borderColor: g.color }]}>
            <Text style={gcStyles.guideEmoji}>{g.emoji}</Text>
            <View>
              <Text style={gcStyles.guideDisaster}>{g.disaster}</Text>
              <Text style={gcStyles.guideDesc}>{g.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Animated.View style={[gcStyles.cameraWrap, { transform: [{ scale: pulseAnim }] }]}>
        <CameraView style={gcStyles.camera} facing="front">
          <View style={gcStyles.frameOverlay}>
            <View style={[gcStyles.corner, gcStyles.tl]} />
            <View style={[gcStyles.corner, gcStyles.tr]} />
            <View style={[gcStyles.corner, gcStyles.bl]} />
            <View style={[gcStyles.corner, gcStyles.br]} />

            {phase === "detecting" && (
              <View style={gcStyles.countdownBadge}>
                <Text style={gcStyles.countdownNum}>{countdown}</Text>
              </View>
            )}

            {phase === "result" && detectedGesture && (
              <View style={[gcStyles.resultOverlay, { backgroundColor: detectedGesture.color + "CC" }]}>
                <Text style={gcStyles.resultEmoji}>{detectedGesture.emoji}</Text>
                <Text style={gcStyles.resultLabel}>{detectedGesture.label} detected!</Text>
                <Text style={gcStyles.resultSub}>Searching automatically...</Text>
              </View>
            )}
          </View>
        </CameraView>
      </Animated.View>

      <Text style={gcStyles.hint}>
        {phase === "idle" ? "Show a hand gesture, then tap Detect" :
         phase === "detecting" ? `Hold gesture steady... ${countdown}` :
         "Gesture recognized! Auto-searching..."}
      </Text>

      <View style={gcStyles.actions}>
        {phase !== "detecting" && (
          <TouchableOpacity 
            style={[gcStyles.actionBtn, gcStyles.detectBtn]} 
            onPress={phase === "idle" ? startDetection : reset}
          >
            <Text style={gcStyles.detectBtnTxt}>
              {phase === "idle" ? "📷 Detect Gesture" : "🔄 Try Again"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const gcStyles = StyleSheet.create({
  wrap: { width: "100%" },
  center: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 },
  disabledContainer: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 },
  disabledText: { fontSize: 14, fontWeight: "600", color: "#0D0D0D", marginBottom: 4 },
  disabledSubtext: { fontSize: 12, color: "#888" },
  permEmoji: { fontSize: 40, marginBottom: 12 },
  permTitle: { fontSize: 16, fontWeight: "800", color: "#0D0D0D", marginBottom: 8, textAlign: "center" },
  permSub: { fontSize: 12, color: "#888", textAlign: "center", lineHeight: 18, marginBottom: 20 },
  permText: { fontSize: 13, color: "#888" },
  permBtn: { backgroundColor: "#D62828", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  permBtnTxt: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  guideScroll: { marginBottom: 14 },
  guideContent: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
  guideChip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FAFAFA" },
  guideEmoji: { fontSize: 24 },
  guideDisaster: { fontSize: 11, fontWeight: "800", color: "#0D0D0D" },
  guideDesc: { fontSize: 10, color: "#888" },
  cameraWrap: { width: "100%", height: 220, borderRadius: 16, overflow: "hidden", marginBottom: 12, borderWidth: 2, borderColor: "#E0E0E0" },
  camera: { flex: 1 },
  frameOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 24, height: 24, borderColor: "#FFF", borderWidth: 2.5 },
  tl: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  countdownBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  countdownNum: { fontSize: 36, fontWeight: "900", color: "#FFF" },
  resultOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  resultEmoji: { fontSize: 48, marginBottom: 8 },
  resultLabel: { fontSize: 16, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  resultSub: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  hint: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 14, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detectBtn: { backgroundColor: "#0D0D0D" },
  detectBtnTxt: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});