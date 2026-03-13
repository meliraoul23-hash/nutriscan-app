// Coach AI Screen with Voice - Simple Flow
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
  Alert,
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

const SUGGESTIONS = [
  'Comment améliorer ma digestion ?',
  'Quels aliments pour mieux dormir ?',
  'Idées de petit-déjeuner sain ?',
];

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coachMessages, setCoachMessages } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // Animation for recording
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Setup audio permissions on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        console.log('Audio permission:', status);
        setPermissionGranted(status === 'granted');
        
        if (status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        }
      } catch (error) {
        console.log('Audio setup error:', error);
      }
    };
    setupAudio();

    return () => {
      Speech.stop();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission requise', 'Autorisez le microphone dans les paramètres.');
      return;
    }

    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.log('Start recording error:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording || !isRecording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
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

        if (data.success && data.text) {
          setIsTranscribing(false);
          // Send message and get AI response
          await sendMessageAndSpeak(data.text);
        } else {
          setIsTranscribing(false);
          Alert.alert('Désolé', 'Je n\'ai pas compris. Pouvez-vous répéter ?');
        }
      }
    } catch (error) {
      console.log('Stop recording error:', error);
      setIsTranscribing(false);
    }
  };

  const sendMessageAndSpeak = async (text: string) => {
    if (!text.trim() || !user) return;
    
    // Add user message
    const userMessage: CoachMessage = { type: 'user', text: text.trim() };
    setCoachMessages((prev: CoachMessage[]) => [...prev, userMessage]);
    setIsTyping(true);
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      // Get AI response
      const response = await sendCoachMessageAPI(text.trim(), user.email, user.user_id);
      const coachResponse: CoachMessage = { type: 'coach', text: response };
      setCoachMessages((prev: CoachMessage[]) => [...prev, coachResponse]);
      
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Speak the response
      Speech.speak(response, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 0.9,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.log('Send message error:', error);
      setIsTyping(false);
      Alert.alert('Erreur', 'Impossible de contacter le coach. Réessayez.');
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      sendMessageAndSpeak(inputText.trim());
      setInputText('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach IA</Text>
        {isSpeaking ? (
          <TouchableOpacity onPress={stopSpeaking} style={styles.stopBtn}>
            <Ionicons name="volume-mute" size={24} color={colors.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {/* Status Bar */}
      {isRecording && (
        <View style={styles.statusBar}>
          <View style={styles.recordingDot} />
          <Text style={styles.statusText}>🎤 Je vous écoute... Appuyez pour envoyer</Text>
        </View>
      )}
      {isTranscribing && (
        <View style={[styles.statusBar, { backgroundColor: '#9C27B0' }]}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.statusText}>Analyse de votre message...</Text>
        </View>
      )}
      {isSpeaking && (
        <View style={[styles.statusBar, { backgroundColor: colors.primary }]}>
          <Ionicons name="volume-high" size={18} color="#FFF" />
          <Text style={styles.statusText}>Je vous réponds...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {coachMessages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="chatbubbles" size={50} color="#9C27B0" />
              </View>
              <Text style={styles.welcomeTitle}>Votre Coach Nutrition</Text>
              <Text style={styles.welcomeText}>
                Appuyez sur le micro et parlez-moi.{'\n'}Je vous répondrai à voix haute !
              </Text>
              
              {!permissionGranted && (
                <View style={styles.permissionWarning}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                  <Text style={styles.permissionText}>Activez le microphone pour parler</Text>
                </View>
              )}
              
              <Text style={styles.orText}>— ou choisissez —</Text>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestion} onPress={() => sendMessageAndSpeak(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            coachMessages.map((msg, i) => (
              <View key={i} style={msg.type === 'user' ? styles.userMsg : styles.coachMsg}>
                {msg.type === 'coach' && (
                  <View style={styles.avatar}>
                    <Ionicons name="nutrition" size={16} color="#9C27B0" />
                  </View>
                )}
                <View style={[styles.bubble, msg.type === 'user' ? styles.userBubble : styles.coachBubble]}>
                  <Text style={[styles.msgText, msg.type === 'user' && { color: '#FFF' }]}>{msg.text}</Text>
                </View>
                {msg.type === 'coach' && (
                  <TouchableOpacity onPress={() => {
                    Speech.speak(msg.text, { language: 'fr-FR', rate: 0.9, onStart: () => setIsSpeaking(true), onDone: () => setIsSpeaking(false) });
                  }} style={styles.replayBtn}>
                    <Ionicons name="volume-high" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          
          {isTyping && (
            <View style={styles.coachMsg}>
              <View style={styles.avatar}><Ionicons name="nutrition" size={16} color="#9C27B0" /></View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#9C27B0" />
                <Text style={styles.typingText}>Réflexion...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          {/* Big Mic Button */}
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={isTyping || isTranscribing}
            style={styles.micBtnContainer}
          >
            <Animated.View style={[
              styles.micBtn,
              isRecording && styles.micBtnRecording,
              isTranscribing && styles.micBtnProcessing,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              {isTranscribing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="#FFF" />
              )}
            </Animated.View>
          </TouchableOpacity>
          
          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Ou tapez ici..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            onPress={sendTextMessage}
            disabled={!inputText.trim() || isTyping}
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
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
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  stopBtn: { padding: 8 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', paddingVertical: 10, gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  welcome: { alignItems: 'center', paddingVertical: 30 },
  welcomeIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 10 },
  welcomeText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  permissionWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginTop: 16 },
  permissionText: { color: colors.warning, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  orText: { color: colors.textSecondary, marginVertical: 20, fontSize: 13 },
  suggestion: { backgroundColor: '#F5F5F5', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, width: '100%' },
  suggestionText: { fontSize: 14, color: colors.text },
  userMsg: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  coachMsg: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: '#F5F5F5', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  replayBtn: { padding: 6, marginLeft: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 16 },
  typingText: { marginLeft: 8, color: colors.textSecondary, fontSize: 13 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  micBtnContainer: { marginRight: 10 },
  micBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center' },
  micBtnRecording: { backgroundColor: '#E53935' },
  micBtnProcessing: { backgroundColor: '#FF9800' },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.4 },
});
