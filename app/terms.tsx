import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsAndConditions() {
  const router = useRouter();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 32;
    if (isAtBottom) setHasScrolledToEnd(true);
  }

  async function handleContinue() {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      await SecureStore.setItemAsync('hasSeenTerms', 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', 'Could not save your acceptance. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ALERTO</Text>
        <Text style={styles.headerSub}>Terms and Conditions of Service</Text>
        <Text style={styles.headerSub}>Privacy Policy & Permission Agreement</Text>
        <Text style={styles.headerSub}>Last Updated: March 31, 2026</Text>
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        <Section title="1. Introduction and Acceptance of Terms">
          <Text>Welcome to Alerto, a disaster preparedness and emergency response application. These Terms and Conditions govern your use of the Alerto application (the "App") and your acceptance of this Privacy Policy.</Text>
          <Text style={{ marginTop: 8 }}>By downloading, installing, and using Alerto, you explicitly agree to comply with all terms, conditions, and policies outlined herein. Your use of the App constitutes your legal acceptance of these terms in their entirety.</Text>
          <Text style={{ marginTop: 8 }}>If you do not agree with any portion of these terms, you must immediately cease using the App and uninstall it from your device.</Text>
        </Section>

        <Section title="2. Purpose of the Application">
          <Text>Alerto is designed to assist users in disaster preparedness and emergency response situations. The App uses real-time location tracking, voice-to-text communication, text-to-voice output, and gesture recognition to provide critical safety features.</Text>
          <Text style={{ marginTop: 8 }}>The App is intended to complement, not replace, official emergency services and disaster response channels.</Text>
        </Section>

        <Section title="3. Required Permissions and Access">
          <Text style={styles.subsectionTitle}>3.1 GPS and Location Services</Text>
          <Text style={{ marginTop: 8 }}>To provide real-time mapping and location-based safety features, Alerto requires access to your device's GPS (Global Positioning System) and location services. By using the App, you authorize Alerto to:</Text>
          
          <BulletPoint text="Continuously collect your precise geographic coordinates and location data" />
          <BulletPoint text="Store location data temporarily on your device and transmit it to our secure servers" />
          <BulletPoint text="Use location data to identify nearby shelters, hospitals, evacuation routes, and emergency resources" />
          <BulletPoint text="Share your location with emergency contacts only when you explicitly trigger an SOS alert or Safety Check" />
          <BulletPoint text="Map real-time movement for emergency response teams during active disaster situations" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>You can disable GPS at any time through your device settings. However, disabling location services will prevent Alerto from providing real-time mapping features and location-based alerts.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>3.2 Microphone and Voice Recording</Text>
          <Text style={{ marginTop: 8 }}>Alerto uses voice-to-text technology to allow you to communicate hands-free during emergencies. By enabling microphone access, you authorize Alerto to:</Text>
          
          <BulletPoint text="Record voice input when you activate voice commands or the SOS voice trigger" />
          <BulletPoint text="Convert voice recordings into text for processing and action" />
          <BulletPoint text="Transmit voice data to secure cloud servers for real-time processing and emergency notification" />
          <BulletPoint text="Retain voice recordings temporarily for safety verification and emergency response purposes" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Voice recordings are encrypted during transmission and storage. You can disable microphone access at any time through your device settings.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>3.3 Speaker and Audio Output</Text>
          <Text style={{ marginTop: 8 }}>Alerto uses text-to-voice technology to deliver critical alerts, directions, and information through audio output. By enabling speaker access, you authorize Alerto to:</Text>
          
          <BulletPoint text="Convert emergency alerts and safety information into natural-sounding audio" />
          <BulletPoint text="Play alert notifications and voice guidance through your device speakers or connected audio devices" />
          <BulletPoint text="Adjust playback based on ambient noise and emergency urgency levels" />
          <BulletPoint text="Repeat critical information through audio to ensure receipt and understanding" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Voice output ensures accessibility for all users, including those with visual impairments. You can adjust volume levels and disable audio output through Alerto settings.</Text>
        </Section>

        <Section title="4. Privacy and Data Protection">
          <Text style={styles.subsectionTitle}>4.1 What Data We Collect</Text>
          <Text style={{ marginTop: 8 }}>Alerto collects the following personal data to provide disaster preparedness and emergency response services:</Text>
          
          <BulletPoint text="Precise geographic location and GPS coordinates" />
          <BulletPoint text="Voice recordings and transcriptions from voice commands" />
          <BulletPoint text="Emergency contact information (phone numbers, email addresses)" />
          <BulletPoint text="User profile information (name, age group, emergency contact relationships)" />
          <BulletPoint text="Device identifiers and hardware information" />
          <BulletPoint text="Usage logs and interaction history with the App" />
          <BulletPoint text="Disaster type preferences and geographical risk profile" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>We do not collect health information, financial data, or biometric data beyond voice recognition for accessibility.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>4.2 How We Use Your Data</Text>
          <Text style={{ marginTop: 8 }}>Your personal data is used exclusively for:</Text>
          
          <BulletPoint text="Providing real-time disaster alerts and emergency information" />
          <BulletPoint text="Locating nearby shelters, hospitals, and safety resources" />
          <BulletPoint text="Notifying emergency contacts during SOS events" />
          <BulletPoint text="Processing voice commands and gesture inputs" />
          <BulletPoint text="Improving app functionality and disaster response accuracy" />
          <BulletPoint text="Complying with legal obligations and emergency response protocols" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontWeight: "600" }}>We will never sell, rent, trade, or lease your personal data to third parties. Your data is used solely to serve you better during disasters and emergencies.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>4.3 Data Security and Encryption</Text>
          <Text style={{ marginTop: 8 }}>We protect your data through multiple security measures:</Text>
          
          <BulletPoint text="End-to-end encryption for all voice and location data transmission" />
          <BulletPoint text="AES-256 encryption for data stored on our servers" />
          <BulletPoint text="TLS 1.3 protocol for all network communications" />
          <BulletPoint text="Regular security audits and penetration testing" />
          <BulletPoint text="Restricted access to servers, limited to authorized personnel only" />
          <BulletPoint text="Compliance with industry standards (ISO 27001, OWASP Top 10)" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Despite these precautions, no security system is completely impenetrable. We are not liable for unauthorized access to your data due to circumstances beyond our reasonable control.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>4.4 Voice Recording Storage and Retention</Text>
          <Text style={{ marginTop: 8 }}>Voice recordings and transcriptions are:</Text>
          
          <BulletPoint text="Stored on secure servers with automatic deletion after 90 days unless needed for emergency response" />
          <BulletPoint text="Retained only if you provide explicit consent for emergency response documentation" />
          <BulletPoint text="Never used for training machine learning models without your written consent" />
          <BulletPoint text="Accessible only to authorized emergency response personnel and law enforcement (with proper legal authority)" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>You can request permanent deletion of your voice data at any time by contacting our privacy team.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>4.5 Location Data Retention</Text>
          <Text style={{ marginTop: 8 }}>Real-time location coordinates are:</Text>
          
          <BulletPoint text="Processed immediately to identify nearby resources and emergency services" />
          <BulletPoint text="Stored in encrypted form for up to 30 days for emergency response purposes" />
          <BulletPoint text="Automatically purged after retention period unless required by law" />
          <BulletPoint text="Shared with emergency contacts only during active emergency alerts" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Your location is never shared with third parties or used for marketing, advertising, or non-emergency purposes.</Text>
        </Section>

        <Section title="5. User Rights and Data Control">
          <Text style={styles.subsectionTitle}>5.1 Access and Portability</Text>
          <Text style={{ marginTop: 8 }}>You have the right to request a copy of all personal data we hold about you in a portable, machine-readable format. Submit requests to: privacy@alerto.app</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>5.2 Correction and Deletion</Text>
          <Text style={{ marginTop: 8 }}>You can:</Text>
          
          <BulletPoint text="Update your profile information at any time within the App" />
          <BulletPoint text="Request permanent deletion of your account and all associated data" />
          <BulletPoint text="Withdraw consent for location tracking or voice recording" />
          <BulletPoint text="Delete individual voice recordings from your account history" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Account deletion requests are processed within 30 days. We retain minimal data required by law.</Text>

          <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>5.3 Permission Management</Text>
          <Text style={{ marginTop: 8 }}>You can manage Alerto permissions through your device settings at any time:</Text>
          
          <BulletPoint text="iOS: Settings > Privacy > Location/Microphone" />
          <BulletPoint text="Android: Settings > Apps > Permissions" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>Disabling permissions will limit App functionality but will not affect your account.</Text>
        </Section>

        <Section title="6. Third-Party Services and Integrations">
          <Text style={{ marginTop: 8 }}>Alerto integrates with third-party services for mapping and voice processing:</Text>
          
          <BulletPoint text="OpenStreetMap API for real-time mapping and resource location" />
          <BulletPoint text="Google Cloud Speech-to-Text for voice command processing" />
          <BulletPoint text="Text-to-Speech services for audio alerts" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20 }}>These third parties have their own privacy policies and data handling practices. We are not responsible for their data practices. You should review their privacy policies before using Alerto.</Text>
        </Section>

        <Section title="7. Legal Compliance and Law Enforcement">
          <Text style={{ marginTop: 8 }}>We may disclose your personal data if:</Text>
          
          <BulletPoint text="Required by law, court order, or government request" />
          <BulletPoint text="Necessary to protect your safety or the safety of others" />
          <BulletPoint text="Required during active emergency or disaster response" />
          <BulletPoint text="To prevent fraud, abuse, or illegal activity" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>We will attempt to notify you of such disclosure unless prohibited by law.</Text>
        </Section>

        <Section title="8. Children's Privacy">
          <Text>Alerto is designed for users of all ages during emergencies. We collect minimal data from children and do not require parental consent for emergency use. However, parents or guardians should monitor children's use of the App and may request deletion of a child's account by contacting: privacy@alerto.app</Text>
        </Section>

        <Section title="9. Limitation of Liability and Disclaimers">
          <Text style={{ marginTop: 8 }}>Alerto is provided "as is" without warranties. We are not liable for:</Text>
          
          <BulletPoint text="GPS signal loss or inaccurate location data" />
          <BulletPoint text="Voice command misinterpretation or processing delays" />
          <BulletPoint text="Network outages preventing emergency alerts" />
          <BulletPoint text="Data breaches caused by circumstances beyond our control" />
          <BulletPoint text="Emergency services' failure to respond based on App data" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontWeight: "600" }}>Alerto is a supplementary tool and should not replace official emergency services. Always call 911 or local emergency numbers during life-threatening situations.</Text>
        </Section>

        <Section title="10. Changes to Terms and Policy">
          <Text>We may update these Terms and Conditions and Privacy Policy at any time. Material changes will be announced through the App with at least 30 days' notice. Continued use of the App after changes constitutes acceptance of the updated terms.</Text>
        </Section>

        <Section title="11. Contact Us">
          <Text style={{ marginTop: 8 }}>For privacy concerns, questions, or data requests, contact:</Text>
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Privacy Team</Text>
          <Text>Email: privacy@alerto.app</Text>
          <Text>Address: Disaster Preparedness Unit, Philippines</Text>
          <Text>Response Time: 5-7 business days</Text>
        </Section>

        <Section title="12. User Acknowledgment">
          <Text style={{ marginTop: 8 }}>By clicking "I Agree" during app setup, you:</Text>
          
          <BulletPoint text="Acknowledge you have read this entire agreement" />
          <BulletPoint text="Understand and accept all terms and conditions" />
          <BulletPoint text="Consent to data collection, storage, and processing as described" />
          <BulletPoint text="Grant explicit permission for GPS, microphone, and speaker access" />
          <BulletPoint text="Understand that Alerto is supplementary to official emergency services" />
          
          <Text style={{ marginTop: 12, fontSize: 12, color: "#333333", lineHeight: 20, fontStyle: "italic" }}>For your safety and the safety of your community, we are committed to protecting your privacy while providing critical disaster preparedness services.</Text>
        </Section>

        {!hasScrolledToEnd && (
          <Text style={styles.scrollHint}>↓ Scroll to read all terms</Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Checkbox row */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => hasScrolledToEnd && setAgreed((v: boolean) => !v)}
          activeOpacity={hasScrolledToEnd ? 0.7 : 1}
        >
          <View
            style={[
              styles.checkbox,
              agreed && styles.checkboxChecked,
              !hasScrolledToEnd && styles.checkboxDisabled,
            ]}
          >
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text
            style={[
              styles.checkLabel,
              !hasScrolledToEnd && styles.checkLabelDisabled,
            ]}
          >
            I have read and agree to the Terms and Conditions.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.agreeBtn, (!agreed || saving) && styles.agreeBtnDisabled]}
          onPress={handleContinue}
          disabled={!agreed || saving}
          activeOpacity={agreed ? 0.8 : 1}
        >
          <Text style={styles.agreeBtnText}>
            {saving ? 'Saving...' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#0D0D0D",
    lineHeight: 34,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  scrollHint: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D62828",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 8,
  },

  // Bullet Points
  bulletRow: {
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginRight: 10,
    marginTop: -2,
  },
  bulletText: {
    fontSize: 12,
    color: "#333333",
    lineHeight: 18,
    flex: 1,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    backgroundColor: "#FFFFFF",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D62828",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#D62828",
  },
  checkboxDisabled: {
    borderColor: "#CCCCCC",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  checkLabel: {
    fontSize: 13,
    color: "#333333",
    flex: 1,
    lineHeight: 19,
  },
  checkLabelDisabled: {
    color: "#AAAAAA",
  },
  agreeBtn: {
    backgroundColor: "#D62828",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  agreeBtnDisabled: {
    backgroundColor: "#E8A0A0",
  },
  agreeBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 1,
  },
});