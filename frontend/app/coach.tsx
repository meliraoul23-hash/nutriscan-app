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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Setup audio permissions on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request microphone permissions
        const { status } = await Audio.requestPermissionsAsync();
        console.log('Audio permission status:', status);
        setPermissionGranted(status === 'granted');
        
        if (status === 'granted') {
          // Configure audio mode for recording
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
          console.log('Audio mode configured successfully');
        }
      } catch (error) {
        console.log('Error setting up audio:', error);
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

  const startRecording = async () => {
    if (!permissionGranted) {
      Alert.alert(
        'Permission requise',
        'Autorisez l\'accès au microphone dans les paramètres de votre téléphone pour utiliser la fonction vocale.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Make sure any previous recording is cleaned up
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore errors from stopping
        }
        setRecording(null);
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('Starting recording...');
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.log('Error starting recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement. Vérifiez les permissions du microphone.');
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) return;

    setIsRecording(false);
    setIsTranscribing(true);
    console.log('Stopping recording...');

    try {
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      
      const uri = recording.getURI();
      console.log('Recording URI:', uri);
      setRecording(null);

      if (uri) {
        await transcribeAndSend(uri);
      } else {
        Alert.alert('Erreur', 'Aucun audio enregistré');
        setIsTranscribing(false);
      }
    } catch (error) {
      console.log('Error stopping recording:', error);
      setIsTranscribing(false);
      Alert.alert('Erreur', 'Erreur lors de l\'arrêt de l\'enregistrement');
    }
  };

  const transcribeAndSend = async (uri: string) => {
    try {
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
        || process.env.EXPO_PUBLIC_BACKEND_URL 
        || '';
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      console.log('Sending audio for transcription to:', `${backendUrl}/api/transcribe`);
      
      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      console.log('Transcription result:', data);

      if (data.success && data.text) {
        // Send the transcribed message
        await sendMessage(data.text);
      } else {
        Alert.alert(
          'Transcription échouée', 
          'Je n\'ai pas pu comprendre l\'audio. Réessayez ou tapez votre message.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('Transcription error:', error);
      Alert.alert('Erreur', 'Erreur de transcription. Vérifiez votre connexion internet.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const speakResponse = (text: string) => {
    // Stop any current speech
    Speech.stop();
    
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
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

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
          <Text style={styles.title}>Coach IA Vocal</Text>
        </View>
        {isSpeaking ? (
          <TouchableOpacity style={styles.speakButton} onPress={stopSpeaking}>
            <Ionicons name="volume-mute" size={24} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Recording/Transcribing Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>🎤 Parlez maintenant... Appuyez pour arrêter</Text>
        </View>
      )}

      {isTranscribing && (
        <View style={styles.transcribingIndicator}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.recordingText}>Transcription en cours...</Text>
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
                <Ionicons name="mic" size={40} color="#9C27B0" />
              </View>
              <Text style={styles.welcomeTitle}>Coach Nutrition Vocal</Text>
              <Text style={styles.welcomeText}>
                Parlez-moi ! Appuyez sur le bouton micro et posez votre question à voix haute. Je vous répondrai également à voix haute.
              </Text>
              
              {/* Permission Status */}
              <View style={[styles.permissionStatus, { backgroundColor: permissionGranted ? '#E8F5E9' : '#FFF3E0' }]}>
                <Ionicons 
                  name={permissionGranted ? 'checkmark-circle' : 'alert-circle'} 
                  size={20} 
                  color={permissionGranted ? colors.success : colors.warning} 
                />
                <Text style={[styles.permissionText, { color: permissionGranted ? colors.success : colors.warning }]}>
                  {permissionGranted ? 'Microphone activé ✓' : 'Autorisez le microphone pour parler'}
                </Text>
              </View>
              
              {/* Voice Instructions */}
              <View style={styles.voiceInstructions}>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <Text style={styles.instructionText}>Appuyez sur le bouton 🎤 violet</Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.instructionText}>Posez votre question à voix haute</Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <Text style={styles.instructionText}>Appuyez à nouveau pour envoyer</Text>
                </View>
              </View>
              
              <Text style={styles.orText}>— ou choisissez une suggestion —</Text>
              
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

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Big Voice Button */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonRecording,
              isTranscribing && styles.voiceButtonTranscribing,
              !permissionGranted && styles.voiceButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isTyping || isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons 
                name={isRecording ? 'stop' : 'mic'} 
                size={28} 
                color="#FFF" 
              />
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Ou tapez votre question..."
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
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', paddingVertical: 12, paddingHorizontal: 16 },
  transcribingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9C27B0', paddingVertical: 12, paddingHorizontal: 16 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', marginRight: 10 },
  recordingText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  messagesContainer: { flex: 1, backgroundColor: colors.background },
  messagesContent: { padding: 16, paddingBottom: 100 },
  welcome: { alignItems: 'center', paddingVertical: 20 },
  welcomeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  welcomeText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 16 },
  permissionStatus: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginBottom: 16 },
  permissionText: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  voiceInstructions: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16, width: '100%', marginBottom: 16 },
  instructionStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  instructionText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  orText: { fontSize: 12, color: colors.textSecondary, marginVertical: 12 },
  suggestions: { marginTop: 8, width: '100%' },
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
  voiceButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  voiceButtonRecording: { backgroundColor: '#E53935' },
  voiceButtonTranscribing: { backgroundColor: '#FF9800' },
  voiceButtonDisabled: { backgroundColor: '#BDBDBD' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { opacity: 0.5 },
});
