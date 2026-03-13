// Coach AI Screen
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
        <View style={{ width: 40 }} />
      </View>

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
                Je suis votre coach personnel. Posez-moi vos questions sur la nutrition, les régimes, ou demandez des conseils personnalisés !
              </Text>
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
  messagesContainer: { flex: 1, backgroundColor: colors.background },
  messagesContent: { padding: 16, paddingBottom: 100 },
  welcome: { alignItems: 'center', paddingVertical: 40 },
  welcomeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  welcomeText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  suggestions: { marginTop: 24, width: '100%' },
  suggestion: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 10 },
  suggestionText: { fontSize: 14, color: colors.text },
  userMessage: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  coachMessage: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 16 },
  typingText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { opacity: 0.5 },
});
