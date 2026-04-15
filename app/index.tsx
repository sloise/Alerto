import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const SIREN_IMAGE_1 = require("../assets/images/siren1.png");
const SIREN_IMAGE_2 = require("../assets/images/siren2.png");

const FULL_TEXT = "ALERT";

export default function Index() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  const [frameIndex, setFrameIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [displayedLetters, setDisplayedLetters] = useState(0);

  const sirenScale = useRef(new Animated.Value(0)).current;
  const sirenShrink = useRef(new Animated.Value(1)).current;
  const sirenMoveX = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Flash frames forever
  useEffect(() => {
    const t = setInterval(() => setFrameIndex((p) => (p === 0 ? 1 : 0)), 350);
    return () => clearInterval(t);
  }, []);

  // PHASE 0 → siren springs in
  useEffect(() => {
    Animated.spring(sirenScale, {
      toValue: 1,
      friction: 4,
      tension: 55,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => setPhase(1), 350);
    });
  }, []);

  // PHASE 1 → type letters
  useEffect(() => {
    if (phase !== 1) return;
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();

    let count = 0;
    const t = setInterval(() => {
      count++;
      setDisplayedLetters(count);
      if (count >= FULL_TEXT.length) {
        clearInterval(t);
        setTimeout(() => setPhase(2), 250);
      }
    }, 110);
    return () => clearInterval(t);
  }, [phase]);

  // PHASE 2 → siren shrinks and slides inline, then redirect
  useEffect(() => {
    if (phase !== 2) return;
    Animated.parallel([
      Animated.timing(sirenShrink, {
        toValue: 0.32,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(sirenMoveX, {
        toValue: 250, 
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase(3);
        if (hasRedirected.current) return;
        hasRedirected.current = true;
      // Auto redirect after animation completes
      setTimeout(async () => {
        const hasSeenTerms = await SecureStore.getItemAsync('hasSeenTerms');
        if (hasSeenTerms === 'true') {
          router.replace('/(auth)/login');
        } else {
          router.replace('/terms');
        }
      }, 2000);
    });
  }, [phase]);

  const combinedSirenScale = Animated.multiply(sirenScale, sirenShrink);

  return (
    <View style={styles.container}>
      <View style={styles.centerArea}>
        {/* ALERT text — fades in during phase 1 */}
        {phase >= 1 && (
          <Animated.View style={[styles.textRow, { opacity: textOpacity }]}>
            <Text style={styles.alertText}>
              {FULL_TEXT.slice(0, displayedLetters)}
            </Text>
          </Animated.View>
        )}

        {/* Siren — always rendered; starts centered+big, shrinks+moves right */}
        <Animated.View
          style={[
            styles.sirenContainer,
            phase < 2 ? styles.sirenCentered : styles.sirenInline,
            {
              transform: [
                { scale: combinedSirenScale },
                { translateX: sirenMoveX },
              ],
            },
          ]}
        >
          <Image
            source={frameIndex === 0 ? SIREN_IMAGE_1 : SIREN_IMAGE_2}
            style={styles.sirenImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  centerArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 140,
    width:"100%"
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertText: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 8,
    color: "#0D0D0D",
  },
  sirenContainer: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    
  },
  sirenCentered: {
    position: "absolute",
  },
  sirenInline: {
    position: "absolute",
  }, 
  sirenImage: {
    width: 130,
    height: 130,
  },
});