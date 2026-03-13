// Coach AI Screen with Voice
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { sendCoachMessageAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';
import { CoachMessage } from '../src/types';

const SUGGESTIONS = [
  'Comment améliorer ma digestion ?',
  'Quels aliments pour mieux dormir ?',
  'Idées de petit-déjeuner sain ?',
  'Comment réduire ma consommation de sucre ?',
];

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coachMessages, setCoachMessages } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Voice recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Setup audio on mount
  useEffect(() => {
    return () => {
      // Cleanup
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      Speech.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès au microphone pour utiliser la fonction vocale.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.log('Error starting recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Send to backend for transcription
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.log('Error stopping recording:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      // For now, we'll use a simple approach - send message asking user to type
      // In production, you'd send the audio file to a transcription API
      
      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      // Try to transcribe via backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setInputText(data.text);
          // Auto-send the transcribed message
          sendMessage(data.text);
        }
      } else {
        // Fallback: just show a message
        Alert.alert('Transcription', 'Tapez votre message manuellement pour l\'instant.');
      }
    } catch (error) {
      console.log('Transcription error:', error);
      Alert.alert('Erreur', 'Impossible de transcrire l\'audio. Tapez votre message.');
    }
  };

  const speakResponse = (text: string) => {
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user || isTyping) return;
    
    const userMessage: CoachMessage = { type: 'user', text: text.trim() };
    setCoachMessages((prev: CoachMessage[]) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const response = await sendCoachMessageAPI(text.trim(), user.email, user.user_id);
      const coachResponse: CoachMessage = { type: 'coach', text: response };
      setCoachMessages((prev: CoachMessage[]) => [...prev, coachResponse]);
      
      // Auto-speak the response
      speakResponse(response);
    } catch (error) {
      console.log('Error sending message:', error);
      const errorMessage: CoachMessage = { type: 'coach', text: 'Désolé, une erreur est survenue. Réessayez.' };
      setCoachMessages((prev: CoachMessage[]) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.coachAvatar}>
            <Ionicons name="chatbubbles" size={20} color="#9C27B0" />
          </View>
          <Text style={styles.title}>Coach IA</Text>
        </View>
        {isSpeaking ? (
          <TouchableOpacity style={styles.speakButton} onPress={stopSpeaking}>
            <Ionicons name="volume-mute" size={24} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Enregistrement en cours...</Text>
        </View>
      )}

      {isTranscribing && (
        <View style={styles.transcribingIndicator}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.recordingText}>Transcription...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {coachMessages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeAvatar}>
                <Ionicons name="nutrition" size={40} color="#9C27B0" />
              </View>
              <Text style={styles.welcomeTitle}>Coach Nutrition IA</Text>
              <Text style={styles.welcomeText}>
                Je suis votre coach personnel. Parlez-moi ou écrivez vos questions sur la nutrition !
              </Text>
              
              {/* Voice Hint */}
              <View style={styles.voiceHint}>
                <Ionicons name="mic" size={20} color={colors.primary} />
                <Text style={styles.voiceHintText}>
                  Appuyez sur le micro pour parler
                </Text>
              </View>
              
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestion}
                    onPress={() => sendMessage(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            coachMessages.map((msg, index) => (
              <View
                key={index}
                style={msg.type === 'user' ? styles.userMessage : styles.coachMessage}
              >
                {msg.type === 'coach' && (
                  <View style={styles.messageAvatar}>
                    <Ionicons name="nutrition" size={16} color="#9C27B0" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.type === 'user' ? styles.userBubble : styles.coachBubble,
                  ]}
                >
                  <Text style={[styles.messageText, msg.type === 'user' && { color: '#FFF' }]}>
                    {msg.text}
                  </Text>
                </View>
                {/* Speak button for coach messages */}
                {msg.type === 'coach' && (
                  <TouchableOpacity
                    style={styles.speakMessageButton}
                    onPress={() => speakResponse(msg.text)}
                  >
                    <Ionicons name="volume-high" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          
          {isTyping && (
            <View style={styles.coachMessage}>
              <View style={styles.messageAvatar}>
                <Ionicons name="nutrition" size={16} color="#9C27B0" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#9C27B0" />
                <Text style={styles.typingText}>En train d'écrire...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          {/* Voice Button */}
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isTyping || isTranscribing}
          >
            <Ionicons 
              name={isRecording ? 'mic' : 'mic-outline'} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Posez votre question..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  speakButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', paddingVertical: 8, paddingHorizontal: 16 },
  transcribingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9C27B0', paddingVertical: 8, paddingHorizontal: 16 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF', marginRight: 8 },
  recordingText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  messagesContainer: { flex: 1, backgroundColor: colors.background },
  messagesContent: { padding: 16, paddingBottom: 100 },
  welcome: { alignItems: 'center', paddingVertical: 40 },
  welcomeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  welcomeText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  voiceHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, marginTop: 20 },
  voiceHintText: { fontSize: 14, color: colors.primary, fontWeight: '500', marginLeft: 8 },
  suggestions: { marginTop: 24, width: '100%' },
  suggestion: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 10 },
  suggestionText: { fontSize: 14, color: colors.text },
  userMessage: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  coachMessage: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  speakMessageButton: { padding: 8, marginLeft: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 16 },
  typingText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface },
  voiceButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  voiceButtonRecording: { backgroundColor: '#E53935' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { opacity: 0.5 },
});
