import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../firebaseConfig";

const SIREN_IMAGE_1 = require("../../assets/images/siren1.png");

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleSignup() {
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      shake();
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      shake();
      return;
    }
    
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      shake();
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Error", "Please enter a valid email address.");
      shake();
      return;
    }

    if (!agreeTerms) {
      Alert.alert("Agreement Required", "You must agree to the Terms and Conditions to sign up.");
      shake();
      return;
    }

    setLoading(true);
    
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      Alert.alert(
        "Success", 
        "Account created successfully! Please login.",
        [
          { 
            text: "OK", 
            onPress: () => router.replace("/(auth)/login") 
          }
        ]
      );
    } catch (error: any) {
      console.error("Signup error:", error);
      shake();
      
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Signup Failed", "Email is already registered. Please login instead.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Signup Failed", "Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Signup Failed", "Password should be at least 6 characters.");
      } else {
        Alert.alert("Signup Failed", error.message || "Something went wrong. Please try again.");
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
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>ALERT</Text>
            <Image
              source={SIREN_IMAGE_1}
              style={styles.sirenIcon}
              resizeMode="contain"
            />
          </View>

          {/* Form */}
          <Animated.View
            style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.formTitle}>Create your Account</Text>

            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="Full Name"
              placeholderTextColor="#AAAAAA"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              editable={!loading}
            />

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

            <TextInput
              style={[
                styles.input,
                confirmFocused && styles.inputFocused,
              ]}
              placeholder="Confirm Password"
              placeholderTextColor="#AAAAAA"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              editable={!loading}
            />

            {/* Terms Checkbox + Link */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
                onPress={() => setAgreeTerms(!agreeTerms)}
                disabled={loading}
              >
                {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.termsText}>I agree to the </Text>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </Animated.View>


          {/* Login link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.switchLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: "center",
  },

  // Logo
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 48,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
    color: "#0D0D0D",
  },
  sirenIcon: {
    width: 38,
    height: 38,
    marginLeft: 4,
  },

  // Card / Form
  card: {
    width: "100%",
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0D0D0D",
    marginBottom: 22,
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#0D0D0D",
    backgroundColor: "#FAFAFA",
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: "#D62828",
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#D62828",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    fontSize: 12,
    color: "#AAAAAA",
    marginHorizontal: 12,
  },


  // Terms row (checkbox + link)
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D62828",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#D62828",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  termsText: {
    fontSize: 11,
    color: "#888",
  },
  termsLink: {
    fontSize: 11,
    color: "#D62828",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Switch
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchText: {
    fontSize: 13,
    color: "#888888",
  },
  switchLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D62828",
  },
});