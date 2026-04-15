import * as ExpoSpeech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceRecognitionProps {
  onResult: (text: string, results?: VoiceResult[]) => void;
  isEnabled: boolean;
  allAlerts?: any[];
  nearestCenters?: any[];
}

export interface VoiceResult {
  type: 'alert' | 'center' | 'hotline' | 'checklist';
  id: string;
  title: string;
  desc: string;
  icon: string;
  source?: string;
  color?: string;
}

const HOTLINE_KEYWORDS = {
  'emergency hotlines': { id: 'hotlines', title: 'Emergency Hotlines', desc: 'View all emergency contact numbers', icon: '☎️', type: 'hotline' as const },
  'hotlines': { id: 'hotlines', title: 'Emergency Hotlines', desc: 'View all emergency contact numbers', icon: '☎️', type: 'hotline' as const },
  'emergency contacts': { id: 'hotlines', title: 'Emergency Hotlines', desc: 'View all emergency contact numbers', icon: '☎️', type: 'hotline' as const },
};

const CHECKLIST_KEYWORDS = {
  'go-bag checklist': { id: 'checklist', title: 'Go-Bag Checklist', desc: 'Prepare your emergency bag', icon: '🎒', type: 'checklist' as const },
  'go bag': { id: 'checklist', title: 'Go-Bag Checklist', desc: 'Prepare your emergency bag', icon: '🎒', type: 'checklist' as const },
  'checklist': { id: 'checklist', title: 'Go-Bag Checklist', desc: 'Prepare your emergency bag', icon: '🎒', type: 'checklist' as const },
};

const EVACUATION_KEYWORDS = {
  'evacuation centers': { id: 'evacuation', title: 'Evacuation Centers', desc: 'Find nearest evacuation centers', icon: '🏫', type: 'center' as const },
  'evacuation': { id: 'evacuation', title: 'Evacuation Centers', desc: 'Find nearest evacuation centers', icon: '🏫', type: 'center' as const },
  'shelters': { id: 'evacuation', title: 'Evacuation Centers', desc: 'Find nearest evacuation centers', icon: '🏫', type: 'center' as const },
  'nearest shelter': { id: 'evacuation', title: 'Evacuation Centers', desc: 'Find nearest evacuation centers', icon: '🏫', type: 'center' as const },
};

const ALERT_TYPE_KEYWORDS: Record<string, string> = {
  'typhoon': 'typhoon',
  'typhoon alerts': 'typhoon',
  'earthquake': 'earthquake',
  'earthquake warnings': 'earthquake',
  'flood': 'flood',
  'flood alerts': 'flood',
  'fire': 'fire',
  'fire updates': 'fire',
};

export function VoiceRecognition({
  onResult,
  isEnabled,
  allAlerts = [],
  nearestCenters = [],
}: VoiceRecognitionProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('Tap mic and speak');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  if (!isEnabled) {
    return (
      <View style={styles.disabledContainer}>
        <Text style={styles.disabledText}>Voice Input is disabled</Text>
        <Text style={styles.disabledSubtext}>Enable it in Profile → Accessibility</Text>
      </View>
    );
  }

  useSpeechRecognitionEvent('result', async (event) => {
    const spokenText = event.results[0]?.transcript ?? '';
    if (!spokenText) return;

    setTranscript(spokenText);
    setStatusText(`"${spokenText}"`);
    setListening(false);
    stopPulse();

    const recognizedKeyword = recognizeKeyword(spokenText);
    if (recognizedKeyword) {
      const results = getResultsForKeyword(recognizedKeyword);
      await ExpoSpeech.speak(`Found results for ${recognizedKeyword}`, {
        language: 'en',
        rate: 0.9,
      });
      onResult(recognizedKeyword, results);
    } else {
      setStatusText('Keyword not recognized. Try again.');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech error:', event.error);
    setListening(false);
    setStatusText('Error. Please try again.');
    stopPulse();
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    stopPulse();
  });

  function startPulse() {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loopRef.current.start();
  }

  function stopPulse() {
    if (loopRef.current) loopRef.current.stop();
    pulseAnim.setValue(1);
  }

function recognizeKeyword(spoken: string): string | null {
  const lower = spoken.toLowerCase().trim();

  // Hotlines
  if (Object.keys(HOTLINE_KEYWORDS).some(k => lower.includes(k))) 
    return 'emergency hotlines';

  // Checklist
  if (Object.keys(CHECKLIST_KEYWORDS).some(k => lower.includes(k))) 
    return 'go-bag checklist';

  // Evacuation / centers
  if (Object.keys(EVACUATION_KEYWORDS).some(k => lower.includes(k))) 
    return 'evacuation centers';

  // Disaster alert types — check these LAST so "evacuation" doesn't false-match "fire"
  for (const [keyword, type] of Object.entries(ALERT_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return type;
  }

  return null;
}

  function getResultsForKeyword(keyword: string): VoiceResult[] {
    const results: VoiceResult[] = [];
if (keyword === 'emergency hotlines') { 
  results.push({ ...HOTLINE_KEYWORDS['emergency hotlines'] }); 
  return results; 
}    if (keyword === 'go-bag checklist') { results.push(CHECKLIST_KEYWORDS['go-bag checklist']); return results; }
    if (keyword === 'evacuation centers') {
      results.push(EVACUATION_KEYWORDS['evacuation centers']);
      nearestCenters.slice(0, 2).forEach(center => {
        results.push({ type: 'center', id: center.id, title: center.name, desc: center.type || 'Evacuation Center', icon: '🏫', source: 'Nearest Centers' });
      });
      return results;
    }
    const keywordLower = keyword.toLowerCase();
    allAlerts.filter(alert =>
      alert.title.toLowerCase().includes(keywordLower) ||
      alert.desc.toLowerCase().includes(keywordLower) ||
      alert.type.toLowerCase().includes(keywordLower)
    ).slice(0, 3).forEach(alert => {
      results.push({
        type: 'alert', id: alert.id, title: alert.title, desc: alert.desc,
        icon: alert.type === 'typhoon' ? '🌀' : alert.type === 'earthquake' ? '🌍' : '🔥',
        source: `${alert.type} Alert`, color: alert.color
      });
    });
    return results;
  }

  async function startListening() {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setStatusText('Microphone permission denied');
        return;
      }

      setListening(true);
      setTranscript('');
      setStatusText('Listening... Speak now');
      startPulse();

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
        maxAlternatives: 1,
      });

    } catch (error) {
      console.error('Voice recognition error:', error);
      setListening(false);
      setStatusText('Error. Please try again.');
      stopPulse();
    }
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
    setListening(false);
    setStatusText('Tap mic and speak');
    stopPulse();
  }

  useEffect(() => {
    return () => {
      if (loopRef.current) loopRef.current.stop();
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{statusText}</Text>

      <View style={styles.micArea}>
        {listening && (
          <>
            {[120, 96, 72].map((s, i) => (
              <Animated.View
                key={i}
                style={[styles.ring, { width: s, height: s, borderRadius: s / 2, transform: [{ scale: pulseAnim }], opacity: 0.15 + i * 0.15 }]}
              />
            ))}
          </>
        )}
        <TouchableOpacity
          style={[styles.mic, listening && styles.micActive]}
          onPress={listening ? stopListening : startListening}
        >
          <Text style={{ fontSize: 26 }}>{listening ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sub}>Try: "typhoon", "earthquake", "flood", "fire", "evacuation", "hotlines", "checklist"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8, width: '100%' },
  disabledContainer: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  disabledText: { fontSize: 14, fontWeight: '600', color: '#0D0D0D', marginBottom: 4 },
  disabledSubtext: { fontSize: 12, color: '#888' },
  hint: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4, textAlign: 'center' },
  micArea: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  ring: { position: 'absolute', borderWidth: 2, borderColor: '#D62828' },
  mic: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },
  micActive: { backgroundColor: '#D62828' },
  sub: { fontSize: 11, color: '#AAA', textAlign: 'center', marginTop: 4 },
});