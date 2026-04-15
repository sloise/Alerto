// ═══════════════════════════════════════════════════════════════════════════
// GESTURE RECOGNITION — Teachable Machine (Real Model, Fast, Private)
// Model: https://teachablemachine.withgoogle.com/models/c3IoznbGJ/
// ═══════════════════════════════════════════════════════════════════════════

import { CameraView, useCameraPermissions } from "expo-camera";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";

// ─────────────────────────────────────────────────────────────────────────
// Teachable Machine Model Config
// ─────────────────────────────────────────────────────────────────────────
const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/c3IoznbGJ/model.json";

// ⚠️ IMPORTANT: Make sure this order matches your Teachable Machine class order!
// Check your TM project — the order on the left side = order here
const CLASS_LABELS = ["PEACE", "FIST", "PALM", "THUMBSUP"];

// Only accept prediction if confidence is above this value (75%)
// Lower to 0.60 if gestures are hard to detect
// Raise to 0.85 if wrong gestures keep triggering
const CONFIDENCE_THRESHOLD = 0.75;

// ─────────────────────────────────────────────────────────────────────────
// Gesture → disaster mapping
// ─────────────────────────────────────────────────────────────────────────
const GESTURES = [
  {
    id: "peace",
    emoji: "✌️",
    label: "Peace Sign",
    query: "typhoon",
    disaster: "Typhoon",
    color: "#1565C0",
    description: "Index + middle finger up",
    geminiKey: "PEACE",
  },
  {
    id: "fist",
    emoji: "✊",
    label: "Closed Fist",
    query: "earthquake",
    disaster: "Earthquake",
    color: "#6D4C41",
    description: "All fingers curled in",
    geminiKey: "FIST",
  },
  {
    id: "palm",
    emoji: "🖐️",
    label: "Open Palm",
    query: "flood",
    disaster: "Flood",
    color: "#0277BD",
    description: "All five fingers open",
    geminiKey: "PALM",
  },
  {
    id: "thumbsup",
    emoji: "👍",
    label: "Thumbs Up",
    query: "fire",
    disaster: "Fire",
    color: "#BF360C",
    description: "Thumb pointing up only",
    geminiKey: "THUMBSUP",
  },
];

interface GestureRecognitionProps {
  onResult: (query: string) => void;
  isEnabled: boolean;
}

export function GestureRecognition({ onResult, isEnabled }: GestureRecognitionProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedGesture, setDetectedGesture] = useState<(typeof GESTURES)[0] | null>(null);
  const [phase, setPhase] = useState<"idle" | "detecting" | "result">("idle");
  const [statusMessage, setStatusMessage] = useState("Show a hand gesture clearly, then tap Detect");
  const [isLoading, setIsLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const modelRef = useRef<tf.LayersModel | null>(null);

  // ── Load real Teachable Machine model ───────────────────────────────────
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setStatusMessage("Initializing TensorFlow...");

        // CRITICAL: must await tf.ready() before any tf operations
        await tf.ready();

        setStatusMessage("Loading gesture model...");

        const model = await tf.loadLayersModel(MODEL_URL);
        modelRef.current = model;

        // Warm up the model with a dummy tensor so first prediction is fast
        const dummy = tf.zeros([1, 224, 224, 3]);
        await (model.predict(dummy) as tf.Tensor).data();
        tf.dispose(dummy);

        setModelReady(true);
        setStatusMessage("Ready! Make a gesture and tap Detect");
      } catch (err) {
        console.error("Model load error:", err);
        setStatusMessage("⚠️ Model failed to load. Check your connection.");
        Alert.alert(
          "Model Load Failed",
          "Could not load the gesture AI model.\n\nMake sure:\n• You have internet connection\n• The Teachable Machine model is publicly shared"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, []);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    if (pulseLoop.current) pulseLoop.current.stop();
    pulseAnim.setValue(1);
  }

  // ── Real Teachable Machine inference ────────────────────────────────────
  async function classifyPhoto(): Promise<string | null> {
    if (!modelReady || !modelRef.current) {
      Alert.alert("Model Not Ready", "Please wait for the AI model to finish loading.");
      return null;
    }

    let photo;
    try {
      photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
    } catch (error) {
      console.error("Camera error:", error);
      return null;
    }

    if (!photo?.base64) return null;

    try {
      // Convert base64 image → tensor
      const imageBuffer = tf.util.encodeString(photo.base64, "base64");
      const imageTensor = decodeJpeg(imageBuffer);

      // Resize to 224×224 — Teachable Machine's required input size
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);

      // Normalize to [0, 1] and add batch dimension → shape: [1, 224, 224, 3]
      const normalized = resized.div(255.0).expandDims(0);

      // Run model inference
      const predictions = modelRef.current.predict(normalized) as tf.Tensor;
      const scores = Array.from(await predictions.data());

      // Log all scores for debugging
      console.log(
        "Gesture scores:",
        CLASS_LABELS.map((l, i) => `${l}: ${(scores[i] * 100).toFixed(1)}%`).join(" | ")
      );

      // Find highest confidence result
      const maxScore = Math.max(...scores);
      const maxIndex = scores.indexOf(maxScore);

      setConfidence(maxScore);

      // Clean up tensors to avoid memory leak
      tf.dispose([imageTensor, resized, normalized, predictions]);

      // Reject if confidence is too low
      if (maxScore < CONFIDENCE_THRESHOLD) {
        console.log(`Low confidence: ${(maxScore * 100).toFixed(1)}% — rejected`);
        return "UNKNOWN";
      }

      return CLASS_LABELS[maxIndex];
    } catch (inferenceError) {
      console.error("Inference error:", inferenceError);
      return null;
    }
  }

  async function startDetection() {
    setPhase("detecting");
    setDetectedGesture(null);
    setConfidence(null);
    startPulse();
    setStatusMessage("Analyzing gesture...");

    const result = await classifyPhoto();

    stopPulse();

    if (!result || result === "UNKNOWN") {
      setPhase("idle");
      const confText = confidence != null ? ` (${(confidence * 100).toFixed(0)}% confidence)` : "";
      setStatusMessage(`Gesture unclear${confText}. Try again.`);
      Alert.alert(
        "Gesture Not Recognized",
        "Tips for better detection:\n\n• Hold your hand still and clearly in frame\n• Use good lighting — avoid backlight\n• Keep background plain\n• Make the gesture bold and exaggerated"
      );
      return;
    }

    const matched = GESTURES.find((g) => g.geminiKey === result);
    if (!matched) {
      setPhase("idle");
      setStatusMessage("Unrecognized gesture. Try peace, fist, palm, or thumbs up.");
      return;
    }

    // ✅ Gesture recognized!
    setDetectedGesture(matched);
    setPhase("result");
    setStatusMessage(
      `Detected: ${matched.disaster}! ${confidence != null ? `(${(confidence * 100).toFixed(0)}% confident)` : ""}`
    );
    Speech.speak(`${matched.disaster} gesture detected`, { language: "en" });

    setTimeout(() => {
      onResult(matched.query);
      Speech.speak(`Searching for ${matched.disaster} alerts`, { language: "en" });
    }, 1200);
  }

  function reset() {
    setPhase("idle");
    setDetectedGesture(null);
    setConfidence(null);
    setStatusMessage("Show a hand gesture clearly, then tap Detect");
    stopPulse();
  }

  // ── Loading Screen ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D62828" />
        <Text style={s.loadingTitle}>Loading AI Model...</Text>
        <Text style={s.loadingSub}>Your gesture recognition is ready in a moment</Text>
      </View>
    );
  }

  // ── Guards ──────────────────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <View style={s.center}>
        <Text style={s.disabledText}>Gesture Recognition is disabled</Text>
        <Text style={s.disabledSub}>Enable it in Profile → Accessibility</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={s.center}>
        <Text style={s.mutedText}>Checking camera permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permEmoji}>📷</Text>
        <Text style={s.permTitle}>Camera Access Needed</Text>
        <Text style={s.permSub}>
          Gesture recognition uses your front camera to identify hand signals.
        </Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnTxt}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isProcessing = phase === "detecting";

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <View style={s.wrap}>

      {/* Gesture guide chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.guideScroll}
        contentContainerStyle={s.guideContent}
      >
        {GESTURES.map((g) => (
          <View
            key={g.id}
            style={[
              s.guideChip,
              { borderColor: g.color },
              detectedGesture?.id === g.id && { backgroundColor: g.color + "22" },
            ]}
          >
            <Text style={s.guideEmoji}>{g.emoji}</Text>
            <View>
              <Text style={s.guideDisaster}>{g.disaster}</Text>
              <Text style={s.guideDesc}>{g.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Camera viewfinder */}
      <Animated.View style={[s.cameraWrap, { transform: [{ scale: pulseAnim }] }]}>
        <CameraView ref={cameraRef} style={s.camera} facing="front" />

        <View style={s.frameOverlay}>
          {/* Corner brackets */}
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />

          {/* Processing badge */}
          {isProcessing && (
            <View style={s.processingBadge}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={s.processingText}>Analyzing...</Text>
            </View>
          )}

          {/* Result overlay */}
          {phase === "result" && detectedGesture && (
            <View style={[s.resultOverlay, { backgroundColor: detectedGesture.color + "E0" }]}>
              <Text style={s.resultEmoji}>{detectedGesture.emoji}</Text>
              <Text style={s.resultLabel}>{detectedGesture.label}</Text>
              <Text style={s.resultSub}>{detectedGesture.disaster}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Status message */}
      <Text style={s.hint}>{statusMessage}</Text>

      {/* Action buttons */}
      <View style={s.actions}>
        {!isProcessing ? (
          <TouchableOpacity
            style={[s.actionBtn, s.detectBtn]}
            onPress={phase === "idle" ? startDetection : reset}
            activeOpacity={0.8}
          >
            <Text style={s.detectBtnTxt}>
              {phase === "idle" ? "📷  Detect Gesture" : "🔄  Try Again"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[s.actionBtn, s.loadingBtn]}>
            <Text style={s.loadingTxt}>⏳  Hold still…</Text>
          </View>
        )}
      </View>

      {/* Info Box - Teachable Machine */}
      <View style={s.infoBox}>
        <Text style={s.infoTitle}>🤖 Powered by Teachable Machine</Text>
        <Text style={s.infoText}>
          AI runs 100% on your device · Works offline · Fast & private
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  wrap: { width: "100%" },
  center: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 },
  mutedText: { fontSize: 13, color: "#888" },
  disabledText: { fontSize: 14, fontWeight: "600", color: "#0D0D0D", marginBottom: 4 },
  disabledSub: { fontSize: 12, color: "#888" },
  permEmoji: { fontSize: 40, marginBottom: 12 },
  permTitle: { fontSize: 16, fontWeight: "800", color: "#0D0D0D", marginBottom: 8, textAlign: "center" },
  permSub: { fontSize: 12, color: "#888", textAlign: "center", lineHeight: 18, marginBottom: 20 },
  permBtn: { backgroundColor: "#D62828", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  permBtnTxt: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  loadingTitle: { fontSize: 16, fontWeight: "700", marginTop: 12, color: "#0D0D0D" },
  loadingSub: { fontSize: 12, color: "#888", marginTop: 4 },
  guideScroll: { marginBottom: 14 },
  guideContent: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
  guideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
  },
  guideEmoji: { fontSize: 22 },
  guideDisaster: { fontSize: 11, fontWeight: "800", color: "#0D0D0D" },
  guideDesc: { fontSize: 10, color: "#888" },
  cameraWrap: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    position: "relative",
  },
  camera: { flex: 1 },
  frameOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FFF", borderWidth: 2.5 },
  tl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  processingBadge: {
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  processingText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  resultEmoji: { fontSize: 52, marginBottom: 8 },
  resultLabel: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  resultSub: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  hint: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 14, lineHeight: 18 },
  actions: { marginBottom: 14 },
  actionBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detectBtn: { backgroundColor: "#0D0D0D" },
  detectBtnTxt: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  loadingBtn: { backgroundColor: "#E0E0E0" },
  loadingTxt: { color: "#888", fontWeight: "700", fontSize: 14 },
  infoBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },
  infoTitle: { fontSize: 12, fontWeight: "700", color: "#0D0D0D", marginBottom: 2 },
  infoText: { fontSize: 11, color: "#666", lineHeight: 16 },
});

export default GestureRecognition;