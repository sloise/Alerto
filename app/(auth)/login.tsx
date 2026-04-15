import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const SIREN_IMAGE_1 = require("../../assets/images/siren1.png");

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Configure Google Sign-In for Expo
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '374289377107-r10eqtmhou2fmphrargblbm2508tu324.apps.googleusercontent.com',
  });

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => {
          router.replace("/(tabs)/dashboard");
        })
        .catch((error) => {
          console.error("Firebase sign-in error:", error);
          Alert.alert("Google Login Failed", error.message);
        });
    } else if (response?.type === 'error') {
      console.error("Google auth error:", response.error);
      Alert.alert("Google Login Failed", response.error?.message || "Something went wrong");
    }
  }, [response]);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleGoogleLogin() {
    try {
      await promptAsync();
    } catch (error: any) {
      console.error("Google login error:", error);
      Alert.alert("Google Login Failed", error.message);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      shake();
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)/dashboard");
    } catch (error: any) {
      shake();
      console.error("Login error:", error);
      
      if (error.code === "auth/user-not-found") {
        Alert.alert("Login Failed", "No account found with this email.");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Login Failed", "Incorrect password.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Login Failed", "Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert("Login Failed", "Too many failed attempts. Please try again later.");
      } else {
        Alert.alert("Login Failed", error.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>ALERT</Text>
            <Image source={SIREN_IMAGE_1} style={styles.sirenIcon} resizeMode="contain" />
          </View>

          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.formTitle}>Login to your Account</Text>

            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="Email"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              placeholder="Password"
              placeholderTextColor="#AAAAAA"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              editable={!loading}
            />

            <TouchableOpacity 
              style={styles.forgotWrap}
              onPress={() => Alert.alert("Reset Password", "Password reset feature coming soon!")}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Login</Text>}
            </TouchableOpacity>
          </Animated.View>



          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>By continuing, you agree to our </Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.termsLink}>Terms and Conditions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.switchLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32, alignItems: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 48 },
  logoText: { fontSize: 32, fontWeight: "900", letterSpacing: 6, color: "#0D0D0D" },
  sirenIcon: { width: 38, height: 38, marginLeft: 4 },
  card: { width: "100%", marginBottom: 28 },
  formTitle: { fontSize: 22, fontWeight: "600", color: "#0D0D0D", marginBottom: 22 },
  input: { width: "100%", height: 52, borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: "#0D0D0D", backgroundColor: "#FAFAFA", marginBottom: 14 },
  inputFocused: { borderColor: "#D62828", backgroundColor: "#FFFFFF" },
  forgotWrap: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 12, color: "#888888" },
  primaryBtn: { width: "100%", height: 52, backgroundColor: "#D62828", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.6 },
  dividerRow: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },
  dividerText: { fontSize: 12, color: "#AAAAAA", marginHorizontal: 12 },
  googleBtn: { width: "100%", height: 52, borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA", flexDirection: "row", gap: 10, marginBottom: 36 },
  googleIcon: { fontSize: 18, fontWeight: "900", color: "#D62828" },
  googleBtnText: { fontSize: 14, fontWeight: "700", color: "#333333" },
  switchRow: { flexDirection: "row", alignItems: "center" },
  switchText: { fontSize: 13, color: "#888888" },
  switchLink: { fontSize: 13, fontWeight: "700", color: "#D62828" },
  termsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 20,
  marginBottom: 10,
  paddingHorizontal: 20,
},
termsText: {
  fontSize: 12,
  color: '#888',
},
termsLink: {
  fontSize: 12,
  color: '#D62828',
  fontWeight: '600',
  textDecorationLine: 'underline',
},
});