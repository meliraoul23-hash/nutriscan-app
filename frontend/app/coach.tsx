// Coach AI - Conversation Vocale Automatique
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { sendCoachMessageAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';
import { CoachMessage } from '../src/types';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coachMessages, setCoachMessages } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [state, setState] = useState<ConversationState>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Setup audio
  useEffect(() => {
    const setup = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    };
    setup();
    return () => {
      Speech.stop();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Pulse animation
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  // Start listening
  const startListening = async () => {
    if (!permissionGranted || state !== 'idle') return;

    try {
      // Clean up previous recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setState('listening');

      // Auto-stop after 10 seconds of recording (safety)
      const timer = setTimeout(() => {
        stopAndProcess();
      }, 10000);
      setSilenceTimer(timer);

    } catch (error) {
      console.log('Start error:', error);
      setState('idle');
    }
  };

  // Stop and process
  const stopAndProcess = async () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }

    if (!recordingRef.current) {
      setState('idle');
      return;
    }

    setState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecording(null);

      if (!uri) {
        setState('idle');
        return;
      }

      // Transcribe
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
        || process.env.EXPO_PUBLIC_BACKEND_URL || '';

      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);

      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();
      console.log('Transcription:', data);

      if (data.success && data.text && user) {
        // Add user message
        const userMsg: CoachMessage = { type: 'user', text: data.text };
        setCoachMessages((prev: CoachMessage[]) => [...prev, userMsg]);
        scrollToEnd();

        // Get AI response
        const aiResponse = await sendCoachMessageAPI(data.text, user.email, user.user_id);
        const coachMsg: CoachMessage = { type: 'coach', text: aiResponse };
        setCoachMessages((prev: CoachMessage[]) => [...prev, coachMsg]);
        scrollToEnd();

        // Speak response, then auto-listen again
        setState('speaking');
        Speech.speak(aiResponse, {
          language: 'fr-FR',
          rate: 0.9,
          onDone: () => {
            setState('idle');
            // Auto-restart listening after AI finishes speaking
            setTimeout(() => {
              startListening();
            }, 500);
          },
          onError: () => setState('idle'),
        });
      } else {
        // Didn't understand - speak and re-listen
        setState('speaking');
        Speech.speak("Désolé, je n'ai pas compris. Pouvez-vous répéter ?", {
          language: 'fr-FR',
          rate: 0.9,
          onDone: () => {
            setState('idle');
            setTimeout(() => startListening(), 500);
          },
          onError: () => setState('idle'),
        });
      }
    } catch (error) {
      console.log('Process error:', error);
      setState('idle');
    }
  };

  // Stop conversation
  const stopConversation = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    Speech.stop();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setRecording(null);
    setState('idle');
  };

  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const getStateText = () => {
    switch (state) {
      case 'listening': return "🎤 Je vous écoute...";
      case 'processing': return "🔄 Analyse en cours...";
      case 'speaking': return "🗣️ Je vous réponds...";
      default: return "";
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'listening': return '#E53935';
      case 'processing': return '#9C27B0';
      case 'speaking': return colors.primary;
      default: return colors.surface;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopConversation(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach IA Vocal</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Status */}
      {state !== 'idle' && (
        <View style={[styles.statusBar, { backgroundColor: getStateColor() }]}>
          {state === 'processing' ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : state === 'listening' ? (
            <View style={styles.recordingDot} />
          ) : (
            <Ionicons name="volume-high" size={18} color="#FFF" />
          )}
          <Text style={styles.statusText}>{getStateText()}</Text>
          {state === 'listening' && (
            <Text style={styles.tapToSend}>Appuyez pour envoyer</Text>
          )}
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
      >
        {coachMessages.length === 0 ? (
          <View style={styles.welcome}>
            <Animated.View style={[styles.welcomeIcon, { transform: [{ scale: state === 'listening' ? pulseAnim : 1 }] }]}>
              <Ionicons name="mic" size={60} color={state === 'idle' ? '#9C27B0' : '#FFF'} />
            </Animated.View>
            <Text style={styles.welcomeTitle}>Coach Nutrition Vocal</Text>
            <Text style={styles.welcomeText}>
              Appuyez sur le micro pour démarrer une conversation.{'\n'}
              Je vous écoute et je vous réponds à voix haute !
            </Text>
            
            {!permissionGranted && (
              <View style={styles.warning}>
                <Ionicons name="alert-circle" size={20} color={colors.warning} />
                <Text style={styles.warningText}>Activez le microphone pour parler</Text>
              </View>
            )}
          </View>
        ) : (
          coachMessages.map((msg, i) => (
            <View key={i} style={msg.type === 'user' ? styles.userMsg : styles.coachMsg}>
              {msg.type === 'coach' && (
                <View style={styles.avatar}>
                  <Ionicons name="nutrition" size={18} color="#9C27B0" />
                </View>
              )}
              <View style={[styles.bubble, msg.type === 'user' ? styles.userBubble : styles.coachBubble]}>
                <Text style={[styles.msgText, msg.type === 'user' && { color: '#FFF' }]}>{msg.text}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Main Button */}
      <View style={styles.bottomArea}>
        {state === 'idle' ? (
          <TouchableOpacity onPress={startListening} style={styles.startButton} disabled={!permissionGranted}>
            <Ionicons name="mic" size={40} color="#FFF" />
            <Text style={styles.startButtonText}>Appuyez pour parler</Text>
          </TouchableOpacity>
        ) : state === 'listening' ? (
          <TouchableOpacity onPress={stopAndProcess} style={[styles.startButton, styles.recordingButton]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="send" size={40} color="#FFF" />
            </Animated.View>
            <Text style={styles.startButtonText}>Appuyez pour envoyer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stopConversation} style={[styles.startButton, styles.processingButton]}>
            <Ionicons name="stop" size={40} color="#FFF" />
            <Text style={styles.startButtonText}>Arrêter</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 10 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  tapToSend: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 10 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  welcome: { alignItems: 'center', paddingVertical: 40 },
  welcomeIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 12 },
  welcomeText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 26, paddingHorizontal: 20 },
  warning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, marginTop: 20 },
  warningText: { color: colors.warning, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  userMsg: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  coachMsg: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: 18 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: '#F5F5F5', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  bottomArea: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  startButton: { width: '100%', backgroundColor: '#9C27B0', paddingVertical: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  recordingButton: { backgroundColor: '#E53935' },
  processingButton: { backgroundColor: '#757575' },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 8 },
});
