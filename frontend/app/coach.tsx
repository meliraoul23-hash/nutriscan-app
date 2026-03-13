// Coach AI - Conversation Vocale avec détection automatique du silence
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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

type State = 'idle' | 'listening' | 'processing' | 'speaking';

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coachMessages, setCoachMessages } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [state, setState] = useState<State>('idle');
  const [inputText, setInputText] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Setup
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
      stopEverything();
    };
  }, []);

  // Pulse animation
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const stopEverything = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  };

  // Start listening
  const startListening = async () => {
    if (!permissionGranted || state !== 'idle') return;

    try {
      stopEverything();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Check audio levels for silence detection
          if (status.isRecording && status.metering !== undefined) {
            // If audio level is very low for a while, auto-stop
            // metering is in dB, typically -160 to 0
            if (status.metering < -45) {
              // Start silence timer if not already started
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  // 2 seconds of silence detected, auto-send
                  processRecording();
                }, 2000);
              }
            } else {
              // Sound detected, reset timer
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            }
          }
        },
        100 // Update every 100ms
      );

      recordingRef.current = recording;
      setState('listening');

      // Safety timeout - auto-stop after 30 seconds
      setTimeout(() => {
        if (state === 'listening') {
          processRecording();
        }
      }, 30000);

    } catch (error) {
      console.log('Start error:', error);
      setState('idle');
    }
  };

  // Process recording
  const processRecording = async () => {
    if (!recordingRef.current || state !== 'listening') return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

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
        await sendAndSpeak(data.text);
      } else {
        // Didn't understand
        setState('speaking');
        Speech.speak("Je n'ai pas compris. Pouvez-vous répéter ?", {
          language: 'fr-FR',
          rate: 0.9,
          onDone: () => {
            setState('idle');
            // Auto-restart
            setTimeout(startListening, 800);
          },
          onError: () => setState('idle'),
        });
      }
    } catch (error) {
      console.log('Process error:', error);
      setState('idle');
    }
  };

  // Send message and speak response
  const sendAndSpeak = async (text: string) => {
    if (!user) return;

    // Add user message
    const userMsg: CoachMessage = { type: 'user', text };
    setCoachMessages((prev: CoachMessage[]) => [...prev, userMsg]);
    scrollToEnd();

    try {
      // Get AI response
      const aiResponse = await sendCoachMessageAPI(text, user.email, user.user_id);
      const coachMsg: CoachMessage = { type: 'coach', text: aiResponse };
      setCoachMessages((prev: CoachMessage[]) => [...prev, coachMsg]);
      scrollToEnd();

      // Speak
      setState('speaking');
      Speech.speak(aiResponse, {
        language: 'fr-FR',
        rate: 0.9,
        onDone: () => {
          setState('idle');
          // Auto-restart listening after speaking
          setTimeout(startListening, 800);
        },
        onError: () => setState('idle'),
      });
    } catch (error) {
      console.log('Send error:', error);
      setState('idle');
    }
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!inputText.trim() || !user || state !== 'idle') return;
    
    const text = inputText.trim();
    setInputText('');
    
    setState('processing');
    await sendAndSpeak(text);
  };

  // Stop conversation
  const stopConversation = () => {
    stopEverything();
    Speech.stop();
    setState('idle');
  };

  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const getStatusText = () => {
    switch (state) {
      case 'listening': return "🎤 Je vous écoute... (parlez, j'enverrai automatiquement)";
      case 'processing': return "🔄 Analyse...";
      case 'speaking': return "🗣️ Je réponds...";
      default: return "";
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'listening': return '#E53935';
      case 'processing': return '#9C27B0';
      case 'speaking': return colors.primary;
      default: return 'transparent';
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
        {state !== 'idle' ? (
          <TouchableOpacity onPress={stopConversation}>
            <Ionicons name="stop-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 28 }} />}
      </View>

      {/* Status Bar */}
      {state !== 'idle' && (
        <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
          {state === 'listening' && <View style={styles.recordingDot} />}
          {state === 'processing' && <ActivityIndicator size="small" color="#FFF" />}
          {state === 'speaking' && <Ionicons name="volume-high" size={18} color="#FFF" />}
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
        >
          {coachMessages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="chatbubbles" size={50} color="#9C27B0" />
              </View>
              <Text style={styles.welcomeTitle}>Coach Nutrition Vocal</Text>
              <Text style={styles.welcomeText}>
                Appuyez sur le micro et parlez.{'\n'}
                Je détecte automatiquement quand vous avez fini{'\n'}
                et je vous réponds à voix haute !
              </Text>
              {!permissionGranted && (
                <View style={styles.warning}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                  <Text style={styles.warningText}>Activez le microphone</Text>
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
                {msg.type === 'coach' && (
                  <TouchableOpacity 
                    onPress={() => Speech.speak(msg.text, { language: 'fr-FR', rate: 0.9 })}
                    style={styles.replayBtn}
                  >
                    <Ionicons name="volume-high" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          {/* Mic Button */}
          <TouchableOpacity
            onPress={state === 'idle' ? startListening : stopConversation}
            disabled={state === 'processing'}
            style={styles.micBtnContainer}
          >
            <Animated.View style={[
              styles.micBtn,
              state === 'listening' && styles.micBtnRecording,
              state === 'processing' && styles.micBtnProcessing,
              state === 'speaking' && styles.micBtnSpeaking,
              { transform: [{ scale: state === 'listening' ? pulseAnim : 1 }] }
            ]}>
              {state === 'processing' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons 
                  name={state === 'idle' ? 'mic' : state === 'listening' ? 'mic' : 'volume-high'} 
                  size={28} 
                  color="#FFF" 
                />
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Ou écrivez ici..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={state === 'idle'}
          />
          
          {/* Send Button */}
          <TouchableOpacity
            onPress={sendTextMessage}
            disabled={!inputText.trim() || state !== 'idle'}
            style={[styles.sendBtn, (!inputText.trim() || state !== 'idle') && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  welcome: { alignItems: 'center', paddingVertical: 40 },
  welcomeIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  welcomeText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  warning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginTop: 16 },
  warningText: { color: colors.warning, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  userMsg: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  coachMsg: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: '#F5F5F5', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  replayBtn: { padding: 6, marginLeft: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FFF' },
  micBtnContainer: { marginRight: 10 },
  micBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center' },
  micBtnRecording: { backgroundColor: '#E53935' },
  micBtnProcessing: { backgroundColor: '#FF9800' },
  micBtnSpeaking: { backgroundColor: colors.primary },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 80, color: colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.4 },
});
