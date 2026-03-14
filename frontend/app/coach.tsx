// Coach AI - Conversation Vocale Complète avec Réponse Vocale
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
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

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coachMessages, setCoachMessages } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [inputText, setInputText] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stateRef = useRef<VoiceState>('idle');
  
  // Sync stateRef with voiceState
  useEffect(() => {
    stateRef.current = voiceState;
  }, [voiceState]);

  // Setup audio permissions
  useEffect(() => {
    const setup = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setPermissionGranted(status === 'granted');
        if (status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
        }
      } catch (error) {
        console.log('Audio setup error:', error);
      }
    };
    setup();
    
    return () => {
      stopEverything();
    };
  }, []);

  // Pulse animation for listening state
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState]);

  const stopEverything = useCallback(async () => {
    Speech.stop();
    setIsSpeaking(false);
    
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Recording may already be stopped
      }
      recordingRef.current = null;
    }
  }, []);

  // Start voice recording
  const startListening = useCallback(async () => {
    if (!permissionGranted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès au microphone');
      return;
    }
    
    if (stateRef.current !== 'idle') {
      console.log('Not idle, current state:', stateRef.current);
      return;
    }

    try {
      await stopEverything();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setVoiceState('listening');
      console.log('Recording started');

    } catch (error) {
      console.log('Start recording error:', error);
      setVoiceState('idle');
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  }, [permissionGranted, stopEverything]);

  // Stop recording and process
  const stopAndProcess = useCallback(async () => {
    if (!recordingRef.current || stateRef.current !== 'listening') {
      console.log('Cannot stop: no recording or wrong state');
      return;
    }

    setVoiceState('processing');
    console.log('Stopping recording...');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        console.log('No audio URI');
        setVoiceState('idle');
        return;
      }

      console.log('Audio URI:', uri);

      // Transcribe audio
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
        || process.env.EXPO_PUBLIC_BACKEND_URL || '';

      const formData = new FormData();
      formData.append('audio', { 
        uri, 
        type: 'audio/m4a', 
        name: 'recording.m4a' 
      } as any);

      console.log('Sending to transcription...');
      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();
      console.log('Transcription response:', data);

      if (data.success && data.text && user) {
        // Send to AI and speak response
        await sendMessageAndSpeak(data.text);
      } else {
        // Transcription failed - tell user
        setVoiceState('speaking');
        setIsSpeaking(true);
        Speech.speak("Je n'ai pas compris. Veuillez réessayer.", {
          language: 'fr-FR',
          rate: 0.9,
          onDone: () => {
            setIsSpeaking(false);
            setVoiceState('idle');
          },
          onError: () => {
            setIsSpeaking(false);
            setVoiceState('idle');
          },
        });
      }
    } catch (error) {
      console.log('Process error:', error);
      setVoiceState('idle');
      Alert.alert('Erreur', 'Erreur lors du traitement audio');
    }
  }, [user]);

  // Send message to AI coach and speak the response
  const sendMessageAndSpeak = useCallback(async (text: string, speakResponse: boolean = true) => {
    if (!user) return;

    // Add user message to chat
    const userMsg: CoachMessage = { type: 'user', text };
    setCoachMessages((prev: CoachMessage[]) => [...prev, userMsg]);
    scrollToEnd();

    try {
      // Get AI response
      const aiResponse = await sendCoachMessageAPI(text, user.email, user.user_id);
      
      // Add AI response to chat
      const coachMsg: CoachMessage = { type: 'coach', text: aiResponse };
      setCoachMessages((prev: CoachMessage[]) => [...prev, coachMsg]);
      scrollToEnd();

      if (speakResponse) {
        // Speak the response - Remove emojis before speaking
        setVoiceState('speaking');
        setIsSpeaking(true);
        
        // Remove emojis from text for TTS
        const textWithoutEmojis = aiResponse.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
        
        // Use more natural voice settings
        Speech.speak(textWithoutEmojis, {
          language: 'fr-FR',
          rate: 0.95,       // Slightly slower for more natural pace
          pitch: 1.05,      // Slightly higher pitch for warmth
          volume: 1.0,
          onDone: () => {
            console.log('Speech finished');
            setIsSpeaking(false);
            setVoiceState('idle');
          },
          onError: (err) => {
            console.log('Speech error:', err);
            setIsSpeaking(false);
            setVoiceState('idle');
          },
        });
      } else {
        setVoiceState('idle');
      }
    } catch (error) {
      console.log('Send error:', error);
      setVoiceState('idle');
      Alert.alert('Erreur', 'Impossible d\'obtenir la réponse du coach');
    }
  }, [user, setCoachMessages]);

  // Send text message (without voice)
  const sendTextMessage = useCallback(async () => {
    if (!inputText.trim() || !user || voiceState !== 'idle') return;
    
    const text = inputText.trim();
    setInputText('');
    setVoiceState('processing');
    
    // Send and speak response
    await sendMessageAndSpeak(text, true);
  }, [inputText, user, voiceState, sendMessageAndSpeak]);

  // Cancel current operation
  const cancelOperation = useCallback(async () => {
    await stopEverything();
    setVoiceState('idle');
  }, [stopEverything]);

  // Replay a message with natural voice
  const replayMessage = useCallback((text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    // Remove emojis before speaking
    const textWithoutEmojis = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
    
    setIsSpeaking(true);
    Speech.speak(textWithoutEmojis, {
      language: 'fr-FR',
      rate: 0.95,
      pitch: 1.05,
      volume: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking]);

  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'listening': return "🎤 Je vous écoute... Appuyez à nouveau pour envoyer";
      case 'processing': return "🔄 Analyse en cours...";
      case 'speaking': return "🗣️ Je vous réponds...";
      default: return "";
    }
  };

  const getStatusColor = () => {
    switch (voiceState) {
      case 'listening': return '#E53935';
      case 'processing': return '#FF9800';
      case 'speaking': return colors.primary;
      default: return 'transparent';
    }
  };

  const handleMicPress = () => {
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopAndProcess();
    } else if (voiceState === 'speaking') {
      cancelOperation();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { cancelOperation(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach Nutrition IA</Text>
        {voiceState !== 'idle' ? (
          <TouchableOpacity onPress={cancelOperation} style={styles.stopBtn}>
            <Ionicons name="stop-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 28 }} />}
      </View>

      {/* Status Bar */}
      {voiceState !== 'idle' && (
        <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
          {voiceState === 'listening' && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
          )}
          {voiceState === 'processing' && <ActivityIndicator size="small" color="#FFF" />}
          {voiceState === 'speaking' && <Ionicons name="volume-high" size={18} color="#FFF" />}
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
          keyboardShouldPersistTaps="handled"
        >
          {coachMessages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="chatbubbles" size={50} color="#9C27B0" />
              </View>
              <Text style={styles.welcomeTitle}>Votre Coach Personnel</Text>
              <Text style={styles.welcomeText}>
                Posez-moi vos questions sur la nutrition !{'\n\n'}
                <Text style={styles.instructionBold}>🎤 Appuyez sur le micro</Text> pour parler{'\n'}
                <Text style={styles.instructionBold}>🎤 Appuyez à nouveau</Text> pour envoyer{'\n'}
                <Text style={styles.instructionBold}>🔊 J'écoute et je réponds à voix haute</Text>
              </Text>
              {!permissionGranted && (
                <View style={styles.warning}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                  <Text style={styles.warningText}>Microphone requis pour le vocal</Text>
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
                    onPress={() => replayMessage(msg.text)}
                    style={styles.replayBtn}
                  >
                    <Ionicons 
                      name={isSpeaking ? "volume-mute" : "volume-high"} 
                      size={18} 
                      color={colors.primary} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          {/* Microphone Button */}
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={voiceState === 'processing'}
            style={styles.micBtnContainer}
          >
            <Animated.View style={[
              styles.micBtn,
              voiceState === 'listening' && styles.micBtnRecording,
              voiceState === 'processing' && styles.micBtnProcessing,
              voiceState === 'speaking' && styles.micBtnSpeaking,
              { transform: [{ scale: voiceState === 'listening' ? pulseAnim : 1 }] }
            ]}>
              {voiceState === 'processing' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : voiceState === 'speaking' ? (
                <Ionicons name="volume-high" size={26} color="#FFF" />
              ) : voiceState === 'listening' ? (
                <Ionicons name="stop" size={26} color="#FFF" />
              ) : (
                <Ionicons name="mic" size={26} color="#FFF" />
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Ou écrivez votre question..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={voiceState === 'idle'}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
          />
          
          {/* Send Button */}
          <TouchableOpacity
            onPress={sendTextMessage}
            disabled={!inputText.trim() || voiceState !== 'idle'}
            style={[styles.sendBtn, (!inputText.trim() || voiceState !== 'idle') && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.text 
  },
  stopBtn: {
    padding: 4,
  },
  statusBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    gap: 10 
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#FFF',
  },
  recordingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  messages: { 
    flex: 1 
  },
  messagesContent: { 
    padding: 16, 
    paddingBottom: 24 
  },
  welcome: { 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  welcomeIcon: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#F3E5F5', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  welcomeTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 16 
  },
  welcomeText: { 
    fontSize: 16, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  instructionBold: {
    fontWeight: '700',
    color: colors.text,
  },
  warning: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF3E0', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 24, 
    marginTop: 20 
  },
  warningText: { 
    color: colors.warning, 
    fontSize: 14, 
    fontWeight: '600', 
    marginLeft: 10 
  },
  userMsg: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginBottom: 16 
  },
  coachMsg: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  avatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#F3E5F5', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  bubble: { 
    maxWidth: '75%', 
    padding: 14, 
    borderRadius: 18 
  },
  userBubble: { 
    backgroundColor: colors.primary, 
    borderBottomRightRadius: 4 
  },
  coachBubble: { 
    backgroundColor: '#F5F5F5', 
    borderBottomLeftRadius: 4 
  },
  msgText: { 
    fontSize: 15, 
    color: colors.text, 
    lineHeight: 22 
  },
  replayBtn: { 
    padding: 8, 
    marginLeft: 6,
    backgroundColor: '#F3E5F5',
    borderRadius: 20,
  },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    padding: 12, 
    paddingBottom: 16,
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0', 
    backgroundColor: '#FFF' 
  },
  micBtnContainer: { 
    marginRight: 10 
  },
  micBtn: { 
    width: 54, 
    height: 54, 
    borderRadius: 27, 
    backgroundColor: '#9C27B0', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  micBtnRecording: { 
    backgroundColor: '#E53935' 
  },
  micBtnProcessing: { 
    backgroundColor: '#FF9800' 
  },
  micBtnSpeaking: { 
    backgroundColor: colors.primary 
  },
  textInput: { 
    flex: 1, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    fontSize: 15, 
    maxHeight: 100, 
    color: colors.text 
  },
  sendBtn: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  sendBtnDisabled: { 
    opacity: 0.4 
  },
});
