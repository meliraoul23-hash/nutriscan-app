// Premium Recipe Detail Screen - NutriScan
// Features: Parallax Hero, Video Player, Cooking Mode with Voice Commands, Smart Timers, Portion Scaler
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Modal,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Speech from 'expo-speech';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';

// Try to import speech recognition (may not be available on all platforms)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
} catch (e) {
  console.log('Speech recognition not available on this platform');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Real cooking video URLs from Mixkit (free stock videos)
const RECIPE_VIDEOS = {
  main: 'https://assets.mixkit.co/videos/preview/mixkit-woman-mixing-vegetables-in-a-bowl-43299-large.mp4',
  step1: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-seasoning-a-salad-43300-large.mp4',
  step2: 'https://assets.mixkit.co/videos/preview/mixkit-hands-cutting-a-carrot-on-a-cutting-board-43298-large.mp4',
  step3: 'https://assets.mixkit.co/videos/preview/mixkit-woman-pouring-olive-oil-on-a-salad-43297-large.mp4',
};

// Mock recipe data
const MOCK_RECIPE = {
  id: '1',
  title: 'Buddha Bowl Mediterraneen',
  subtitle: 'Bowl equilibre aux saveurs du sud',
  heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  videoUrl: RECIPE_VIDEOS.main,
  duration: '35 min',
  difficulty: 'Facile',
  servings: 2,
  healthScore: 92,
  calories: 485,
  protein: 18,
  carbs: 52,
  fat: 22,
  fiber: 12,
  ingredients: [
    { id: '1', name: 'Quinoa', quantity: 150, unit: 'g', checked: false },
    { id: '2', name: 'Pois chiches', quantity: 200, unit: 'g', checked: false },
    { id: '3', name: 'Concombre', quantity: 1, unit: 'piece', checked: false },
    { id: '4', name: 'Tomates cerises', quantity: 150, unit: 'g', checked: false },
    { id: '5', name: 'Avocat', quantity: 1, unit: 'piece', checked: false },
    { id: '6', name: 'Feta', quantity: 80, unit: 'g', checked: false },
    { id: '7', name: 'Huile d\'olive', quantity: 30, unit: 'ml', checked: false },
    { id: '8', name: 'Jus de citron', quantity: 20, unit: 'ml', checked: false },
    { id: '9', name: 'Houmous', quantity: 100, unit: 'g', checked: false },
    { id: '10', name: 'Graines de sesame', quantity: 10, unit: 'g', checked: false },
  ],
  steps: [
    {
      id: '1',
      title: 'Preparer le quinoa',
      description: 'Rincez le quinoa sous l\'eau froide. Faites cuire dans 2 volumes d\'eau salee pendant 15 minutes.',
      duration: 15,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300',
      tip: 'Le quinoa est pret quand les grains sont translucides.'
    },
    {
      id: '2',
      title: 'Preparer les legumes',
      description: 'Coupez le concombre en rondelles, les tomates cerises en deux, et l\'avocat en tranches.',
      duration: 5,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300',
      tip: 'Arrosez l\'avocat de jus de citron pour eviter qu\'il noircisse.'
    },
    {
      id: '3',
      title: 'Rotir les pois chiches',
      description: 'Egouttez et sechez les pois chiches. Faites-les rotir a la poele avec de l\'huile d\'olive.',
      duration: 8,
      image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=300',
      tip: 'Les pois chiches doivent etre dores et croustillants.'
    },
    {
      id: '4',
      title: 'Assembler le bowl',
      description: 'Disposez le quinoa au fond. Arrangez les legumes en sections. Ajoutez la feta et les pois chiches.',
      duration: 3,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
      tip: 'Presentez les ingredients en arc-en-ciel pour un effet visuel.'
    },
  ],
  tags: ['Vegetarien', 'Proteines', 'Sans gluten', 'Mediterraneen'],
  author: 'Chef NutriScan',
  rating: 4.8,
  reviews: 234,
};

interface TimerState {
  stepId: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
}

// Simple Video Player Component
const SimpleVideoPlayer = ({ 
  uri, 
  isVisible, 
  onClose,
  title 
}: { 
  uri: string; 
  isVisible: boolean; 
  onClose: () => void;
  title?: string;
}) => {
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
    player.play();
  });

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={videoStyles.overlay}>
        <View style={videoStyles.container}>
          <View style={videoStyles.header}>
            <Text style={videoStyles.title}>{title || 'Video'}</Text>
            <TouchableOpacity style={videoStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <VideoView
            player={player}
            style={videoStyles.video}
            allowsFullscreen
            allowsPictureInPicture
          />
          
          <View style={videoStyles.controls}>
            <TouchableOpacity 
              style={videoStyles.controlBtn}
              onPress={() => player.playing ? player.pause() : player.play()}
            >
              <Ionicons name={player.playing ? "pause" : "play"} size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const videoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Inline Video Preview Component (for steps)
const InlineVideoPreview = ({ 
  uri, 
  thumbnail,
  onPress 
}: { 
  uri: string;
  thumbnail: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity style={inlineStyles.container} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: thumbnail }} style={inlineStyles.thumbnail} />
      <View style={inlineStyles.playOverlay}>
        <View style={inlineStyles.playButton}>
          <Ionicons name="play" size={24} color="#FFF" />
        </View>
        <Text style={inlineStyles.playText}>Voir la video</Text>
      </View>
    </TouchableOpacity>
  );
};

const inlineStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { isPremium } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  // State
  const [recipe] = useState(MOCK_RECIPE);
  const [servings, setServings] = useState(recipe.servings);
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [timers, setTimers] = useState<TimerState[]>([]);
  
  // Video states
  const [showMainVideo, setShowMainVideo] = useState(false);
  const [showStepVideo, setShowStepVideo] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Offline state
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  
  // Timer intervals
  const timerIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Check if recipe is saved offline on mount
  useEffect(() => {
    checkOfflineStatus();
  }, []);

  const checkOfflineStatus = async () => {
    try {
      const savedRecipes = await AsyncStorage.getItem('offline_recipes');
      if (savedRecipes) {
        const recipes = JSON.parse(savedRecipes);
        setIsSavedOffline(recipes.some((r: any) => r.id === recipe.id));
      }
    } catch (e) {
      console.log('Error checking offline status:', e);
    }
  };

  // Save recipe for offline use
  const saveForOffline = async () => {
    if (savingOffline) return;
    setSavingOffline(true);
    
    try {
      // Get existing saved recipes
      const savedRecipesJson = await AsyncStorage.getItem('offline_recipes');
      const savedRecipes = savedRecipesJson ? JSON.parse(savedRecipesJson) : [];
      
      // Check if already saved
      if (savedRecipes.some((r: any) => r.id === recipe.id)) {
        Alert.alert('Info', 'Cette recette est deja sauvegardee');
        setSavingOffline(false);
        return;
      }
      
      // Download images to local cache
      const downloadedImages: { [key: string]: string } = {};
      
      // Download hero image
      if (recipe.heroImage) {
        try {
          const heroFileName = `recipe_${recipe.id}_hero.jpg`;
          const heroPath = `${FileSystem.cacheDirectory}${heroFileName}`;
          const heroDownload = await FileSystem.downloadAsync(recipe.heroImage, heroPath);
          downloadedImages.heroImage = heroDownload.uri;
        } catch (e) {
          downloadedImages.heroImage = recipe.heroImage; // Keep URL as fallback
        }
      }
      
      // Download step images
      for (let i = 0; i < recipe.steps.length; i++) {
        const step = recipe.steps[i];
        if (step.image) {
          try {
            const stepFileName = `recipe_${recipe.id}_step_${i}.jpg`;
            const stepPath = `${FileSystem.cacheDirectory}${stepFileName}`;
            const stepDownload = await FileSystem.downloadAsync(step.image, stepPath);
            downloadedImages[`step_${i}`] = stepDownload.uri;
          } catch (e) {
            downloadedImages[`step_${i}`] = step.image;
          }
        }
      }
      
      // Save recipe with local image paths
      const offlineRecipe = {
        ...recipe,
        heroImage: downloadedImages.heroImage || recipe.heroImage,
        steps: recipe.steps.map((step, i) => ({
          ...step,
          image: downloadedImages[`step_${i}`] || step.image,
        })),
        savedAt: new Date().toISOString(),
        isOffline: true,
      };
      
      savedRecipes.push(offlineRecipe);
      await AsyncStorage.setItem('offline_recipes', JSON.stringify(savedRecipes));
      
      setIsSavedOffline(true);
      Alert.alert('Succes', 'Recette sauvegardee pour utilisation hors-ligne!');
    } catch (error) {
      console.log('Error saving offline:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette');
    } finally {
      setSavingOffline(false);
    }
  };

  // Remove from offline storage
  const removeFromOffline = async () => {
    try {
      const savedRecipesJson = await AsyncStorage.getItem('offline_recipes');
      if (savedRecipesJson) {
        const savedRecipes = JSON.parse(savedRecipesJson);
        const filtered = savedRecipes.filter((r: any) => r.id !== recipe.id);
        await AsyncStorage.setItem('offline_recipes', JSON.stringify(filtered));
        setIsSavedOffline(false);
        Alert.alert('Supprime', 'Recette retiree du stockage hors-ligne');
      }
    } catch (e) {
      console.log('Error removing offline:', e);
    }
  };

  // Voice Recognition Handler
  const handleVoiceResult = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    setVoiceTranscript(transcript);
    
    // Command detection
    if (lowerTranscript.includes('suivant') || lowerTranscript.includes('next')) {
      if (currentStep < recipe.steps.length - 1) {
        Vibration.vibrate(50);
        setCurrentStep(prev => prev + 1);
        speakStep(currentStep + 1);
      } else {
        Speech.speak('Vous etes a la derniere etape', { language: 'fr-FR' });
      }
    } else if (lowerTranscript.includes('precedent') || lowerTranscript.includes('retour') || lowerTranscript.includes('back')) {
      if (currentStep > 0) {
        Vibration.vibrate(50);
        setCurrentStep(prev => prev - 1);
        speakStep(currentStep - 1);
      } else {
        Speech.speak('Vous etes a la premiere etape', { language: 'fr-FR' });
      }
    } else if (lowerTranscript.includes('repete') || lowerTranscript.includes('repeter') || lowerTranscript.includes('repeat')) {
      speakStep(currentStep);
    } else if (lowerTranscript.includes('minuteur') || lowerTranscript.includes('timer')) {
      const step = recipe.steps[currentStep];
      if (step.duration > 0) {
        startTimer(step.id, step.duration);
        Speech.speak(`Minuteur de ${step.duration} minutes lance`, { language: 'fr-FR' });
      }
    } else if (lowerTranscript.includes('stop') || lowerTranscript.includes('arrete')) {
      setVoiceEnabled(false);
      setIsListening(false);
      Speech.speak('Commandes vocales desactivees', { language: 'fr-FR' });
    }
  }, [currentStep, recipe.steps]);

  // Start/Stop voice recognition
  const toggleVoiceRecognition = async () => {
    if (!ExpoSpeechRecognitionModule) {
      // Fallback for web/unsupported platforms - use simple voice feedback
      setVoiceEnabled(!voiceEnabled);
      if (!voiceEnabled) {
        Speech.speak('Commandes vocales simulees activees. Sur mobile, la reconnaissance vocale sera disponible.', { language: 'fr-FR', rate: 0.9 });
      }
      return;
    }

    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        setVoiceEnabled(false);
      } else {
        // Request permissions
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          Alert.alert('Permission requise', 'Veuillez autoriser l\'acces au microphone pour les commandes vocales');
          return;
        }
        
        // Start listening
        ExpoSpeechRecognitionModule.start({
          lang: 'fr-FR',
          interimResults: true,
          continuous: true,
        });
        setIsListening(true);
        setVoiceEnabled(true);
        Speech.speak('Commandes vocales activees', { language: 'fr-FR', rate: 0.9 });
      }
    } catch (error) {
      console.log('Voice recognition error:', error);
      // Fallback
      setVoiceEnabled(!voiceEnabled);
    }
  };

  // Speech recognition event handler (only if available)
  useEffect(() => {
    if (!useSpeechRecognitionEvent || !isListening) return;
    
    const handleResult = (event: any) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0]?.transcript || '';
        if (event.isFinal) {
          handleVoiceResult(transcript);
        } else {
          setVoiceTranscript(transcript);
        }
      }
    };
    
    // This is a simplified approach - actual implementation depends on expo-speech-recognition API
    return () => {};
  }, [isListening, handleVoiceResult]);

  // Handle orientation changes for cooking mode
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.width > window.height ? 'LANDSCAPE' : 'PORTRAIT');
    });
    return () => subscription?.remove();
  }, []);

  // Lock to landscape when entering cooking mode
  useEffect(() => {
    if (isCookingMode) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isCookingMode]);

  // Parallax header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0.3],
    extrapolate: 'clamp',
  });

  const imageTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Calculate scaled quantities
  const getScaledQuantity = useCallback((baseQuantity: number) => {
    const ratio = servings / recipe.servings;
    return Math.round(baseQuantity * ratio * 10) / 10;
  }, [servings, recipe.servings]);

  // Calculate scaled nutrition
  const getScaledNutrition = useCallback(() => {
    const ratio = servings / recipe.servings;
    return {
      calories: Math.round(recipe.calories * ratio),
      protein: Math.round(recipe.protein * ratio),
      carbs: Math.round(recipe.carbs * ratio),
    };
  }, [servings, recipe]);

  // Toggle ingredient check
  const toggleIngredient = (id: string) => {
    setIngredients(prev => 
      prev.map(ing => ing.id === id ? { ...ing, checked: !ing.checked } : ing)
    );
  };

  // Timer functions
  const startTimer = (stepId: string, duration: number) => {
    const existingTimer = timers.find(t => t.stepId === stepId);
    if (existingTimer?.isRunning) return;

    const newTimer: TimerState = {
      stepId,
      duration: duration * 60,
      remaining: duration * 60,
      isRunning: true,
    };

    setTimers(prev => [...prev.filter(t => t.stepId !== stepId), newTimer]);

    timerIntervals.current[stepId] = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (t.stepId === stepId && t.isRunning) {
          const newRemaining = t.remaining - 1;
          if (newRemaining <= 0) {
            clearInterval(timerIntervals.current[stepId]);
            Alert.alert('Minuteur termine!', 'L\'etape est terminee.');
            return { ...t, remaining: 0, isRunning: false };
          }
          return { ...t, remaining: newRemaining };
        }
        return t;
      }));
    }, 1000);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Smart Timer: Parse text and make durations clickable
  const SmartTimerText = ({ text, stepId }: { text: string; stepId: string }) => {
    // Regex to find durations like "15 minutes", "5 min", "10 secondes"
    const durationRegex = /(\d+)\s*(minutes?|min|secondes?|sec|heures?|h)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const getMinutes = (value: number, unit: string): number => {
      const lowerUnit = unit.toLowerCase();
      if (lowerUnit.startsWith('sec')) return value / 60;
      if (lowerUnit.startsWith('h') || lowerUnit.startsWith('heure')) return value * 60;
      return value; // minutes
    };

    const parsedText = text;
    const regex = new RegExp(durationRegex.source, 'gi');
    
    while ((match = regex.exec(parsedText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={styles.stepDescription}>
            {parsedText.slice(lastIndex, match.index)}
          </Text>
        );
      }

      const value = parseInt(match[1]);
      const unit = match[2];
      const minutes = getMinutes(value, unit);
      const timerId = `${stepId}-inline-${match.index}`;
      const timer = timers.find(t => t.stepId === timerId);

      // Add clickable duration
      parts.push(
        <TouchableOpacity
          key={`timer-${match.index}`}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Vibration.vibrate(30);
            }
            startTimer(timerId, minutes);
          }}
          style={[
            smartTimerStyles.timerBadge,
            timer?.isRunning && smartTimerStyles.timerBadgeActive
          ]}
        >
          <Ionicons 
            name={timer?.isRunning ? "timer" : "timer-outline"} 
            size={14} 
            color={timer?.isRunning ? '#FFF' : colors.primary} 
          />
          <Text style={[
            smartTimerStyles.timerText,
            timer?.isRunning && smartTimerStyles.timerTextActive
          ]}>
            {timer?.isRunning ? formatTime(timer.remaining) : match[0]}
          </Text>
        </TouchableOpacity>
      );

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < parsedText.length) {
      parts.push(
        <Text key={`text-end`} style={styles.stepDescription}>
          {parsedText.slice(lastIndex)}
        </Text>
      );
    }

    // If no durations found, return original text
    if (parts.length === 0) {
      return <Text style={styles.stepDescription}>{text}</Text>;
    }

    return <Text style={styles.stepDescription}>{parts}</Text>;
  };

  // Smart Timer Styles
  const smartTimerStyles = StyleSheet.create({
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 4,
    },
    timerBadgeActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timerText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    timerTextActive: {
      color: '#FFF',
    },
  });

  // Voice commands for cooking mode
  const speakStep = (stepIndex: number) => {
    const step = recipe.steps[stepIndex];
    Speech.speak(`Etape ${stepIndex + 1}: ${step.title}. ${step.description}`, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const handleVoiceCommand = (command: 'next' | 'back' | 'repeat') => {
    if (command === 'next' && currentStep < recipe.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      speakStep(currentStep + 1);
    } else if (command === 'back' && currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      speakStep(currentStep - 1);
    } else if (command === 'repeat') {
      speakStep(currentStep);
    }
  };

  // Open video for a step
  const openStepVideo = (videoUrl: string, title: string) => {
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(title);
    setShowStepVideo(true);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const nutrition = getScaledNutrition();

  // Cooking Mode Modal with Enhanced Voice Commands and Landscape Support
  const CookingModeModal = () => {
    const isLandscape = orientation === 'LANDSCAPE';
    const step = recipe.steps[currentStep];
    const timer = timers.find(t => t.stepId === step.id);

    const handleStepChange = (direction: 'next' | 'back') => {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
      
      if (direction === 'next' && currentStep < recipe.steps.length - 1) {
        setCurrentStep(prev => prev + 1);
        speakStep(currentStep + 1);
      } else if (direction === 'back' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
        speakStep(currentStep - 1);
      } else if (direction === 'next' && currentStep === recipe.steps.length - 1) {
        Speech.speak('Felicitations! Vous avez termine la recette.', { language: 'fr-FR' });
        setIsCookingMode(false);
      }
    };

    return (
      <Modal visible={isCookingMode} animationType="fade" presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape']}>
        <View style={[cookingStyles.container, isLandscape && cookingStyles.containerLandscape]}>
          <StatusBar barStyle="light-content" hidden={isLandscape} />
          
          {/* Header */}
          <View style={[cookingStyles.header, isLandscape && cookingStyles.headerLandscape]}>
            <TouchableOpacity 
              onPress={() => {
                console.log('Closing cooking mode');
                setIsCookingMode(false);
              }} 
              style={cookingStyles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close-circle" size={isLandscape ? 32 : 40} color="#FFF" />
            </TouchableOpacity>
            <Text style={[cookingStyles.title, isLandscape && cookingStyles.titleLandscape]}>
              Mode Cuisine
            </Text>
            <View style={cookingStyles.headerRight}>
              <TouchableOpacity onPress={toggleVoiceRecognition} style={[cookingStyles.headerBtn, voiceEnabled && cookingStyles.headerBtnActive]}>
                <Ionicons name={voiceEnabled ? "mic" : "mic-off"} size={isLandscape ? 20 : 24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => speakStep(currentStep)} style={cookingStyles.headerBtn}>
                <Ionicons name="volume-high" size={isLandscape ? 20 : 24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={cookingStyles.progressContainer}>
            <Text style={cookingStyles.progressText}>
              Etape {currentStep + 1} sur {recipe.steps.length}
            </Text>
            <View style={cookingStyles.progressBar}>
              <View style={[cookingStyles.progressFill, { width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }]} />
            </View>
          </View>

          {/* Main Content */}
          <View style={[cookingStyles.content, isLandscape && cookingStyles.contentLandscape]}>
            {isLandscape ? (
              // Landscape Layout - Side by side
              <>
                <View style={cookingStyles.landscapeLeft}>
                  <Image source={{ uri: step.image }} style={cookingStyles.imageLandscape} />
                </View>
                <View style={cookingStyles.landscapeRight}>
                  <Text style={cookingStyles.stepTitleLarge}>{step.title}</Text>
                  <Text style={cookingStyles.stepDescLarge}>{step.description}</Text>
                  
                  {step.tip && (
                    <View style={cookingStyles.tipContainer}>
                      <Ionicons name="bulb" size={20} color="#FFD700" />
                      <Text style={cookingStyles.tipText}>{step.tip}</Text>
                    </View>
                  )}

                  {step.duration > 0 && (
                    <TouchableOpacity 
                      style={[cookingStyles.timerBtn, timer?.isRunning && cookingStyles.timerBtnActive]}
                      onPress={() => startTimer(step.id, step.duration)}
                    >
                      <Ionicons name="timer" size={28} color="#FFF" />
                      <Text style={cookingStyles.timerText}>
                        {timer?.isRunning ? formatTime(timer.remaining) : `Demarrer ${step.duration} min`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              // Portrait Layout - Stacked
              <ScrollView contentContainerStyle={cookingStyles.portraitContent} showsVerticalScrollIndicator={false}>
                <Image source={{ uri: step.image }} style={cookingStyles.imagePortrait} />
                
                <Text style={cookingStyles.stepTitle}>{step.title}</Text>
                <Text style={cookingStyles.stepDesc}>{step.description}</Text>
                
                {step.tip && (
                  <View style={cookingStyles.tipContainer}>
                    <Ionicons name="bulb" size={18} color="#FFD700" />
                    <Text style={cookingStyles.tipText}>{step.tip}</Text>
                  </View>
                )}

                {step.duration > 0 && (
                  <TouchableOpacity 
                    style={[cookingStyles.timerBtn, timer?.isRunning && cookingStyles.timerBtnActive]}
                    onPress={() => startTimer(step.id, step.duration)}
                  >
                    <Ionicons name="timer" size={24} color="#FFF" />
                    <Text style={cookingStyles.timerText}>
                      {timer?.isRunning ? formatTime(timer.remaining) : `Demarrer le minuteur: ${step.duration} min`}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={[cookingStyles.navigation, isLandscape && cookingStyles.navigationLandscape]}>
            <TouchableOpacity 
              style={[cookingStyles.navBtn, currentStep === 0 && cookingStyles.navBtnDisabled]}
              onPress={() => handleStepChange('back')}
              disabled={currentStep === 0}
            >
              <Ionicons name="chevron-back" size={32} color={currentStep === 0 ? '#555' : '#FFF'} />
              <Text style={[cookingStyles.navText, currentStep === 0 && cookingStyles.navTextDisabled]}>
                Precedent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[cookingStyles.navBtn, cookingStyles.navBtnPrimary]}
              onPress={() => handleStepChange('next')}
            >
              <Text style={cookingStyles.navTextPrimary}>
                {currentStep === recipe.steps.length - 1 ? 'Terminer' : 'Suivant'}
              </Text>
              <Ionicons name="chevron-forward" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Voice Hint */}
          {voiceEnabled && (
            <View style={cookingStyles.voiceHint}>
              <View style={cookingStyles.voiceIndicator} />
              <Text style={cookingStyles.voiceHintText}>
                Dites "Suivant", "Precedent" ou "Repeter"
              </Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  // Cooking Mode Styles
  const cookingStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1a1a1a',
    },
    containerLandscape: {
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingBottom: 12,
      backgroundColor: '#000',
    },
    headerLandscape: {
      paddingTop: 10,
      paddingBottom: 8,
    },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBtnActive: {
      backgroundColor: colors.primary,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    titleLandscape: {
      fontSize: 16,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: '#000',
    },
    progressText: {
      fontSize: 14,
      color: '#888',
      marginBottom: 8,
    },
    progressBar: {
      height: 4,
      backgroundColor: '#333',
      borderRadius: 2,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    contentLandscape: {
      flexDirection: 'row',
      padding: 16,
    },
    landscapeLeft: {
      flex: 1,
      marginRight: 16,
    },
    landscapeRight: {
      flex: 1.5,
      justifyContent: 'center',
    },
    imageLandscape: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
      resizeMode: 'cover',
    },
    portraitContent: {
      alignItems: 'center',
      paddingBottom: 20,
    },
    imagePortrait: {
      width: SCREEN_WIDTH - 40,
      height: 220,
      borderRadius: 20,
      resizeMode: 'cover',
      marginBottom: 24,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFF',
      textAlign: 'center',
      marginBottom: 12,
    },
    stepTitleLarge: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 16,
    },
    stepDesc: {
      fontSize: 18,
      color: '#CCC',
      textAlign: 'center',
      lineHeight: 28,
      paddingHorizontal: 20,
    },
    stepDescLarge: {
      fontSize: 20,
      color: '#CCC',
      lineHeight: 32,
    },
    tipContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(255,215,0,0.15)',
      padding: 14,
      borderRadius: 12,
      marginTop: 20,
      gap: 10,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: '#FFD700',
      lineHeight: 20,
    },
    timerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#333',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      marginTop: 24,
      gap: 12,
    },
    timerBtnActive: {
      backgroundColor: colors.primary,
    },
    timerText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
      backgroundColor: '#000',
      gap: 16,
    },
    navigationLandscape: {
      paddingVertical: 10,
      paddingBottom: 10,
    },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: '#333',
      gap: 8,
    },
    navBtnDisabled: {
      backgroundColor: '#222',
    },
    navBtnPrimary: {
      backgroundColor: colors.primary,
    },
    navText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
    },
    navTextDisabled: {
      color: '#555',
    },
    navTextPrimary: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFF',
    },
    voiceHint: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 100 : 80,
      left: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
    },
    voiceIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    voiceHintText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
  });

  // Floating Nutrition Bubble
  const NutritionBubble = () => (
    <View style={styles.nutritionBubble}>
      <View style={styles.bubbleItem}>
        <Text style={styles.bubbleValue}>{nutrition.calories}</Text>
        <Text style={styles.bubbleLabel}>kcal</Text>
      </View>
      <View style={styles.bubbleDivider} />
      <View style={styles.bubbleItem}>
        <Text style={styles.bubbleValue}>{nutrition.protein}g</Text>
        <Text style={styles.bubbleLabel}>Prot</Text>
      </View>
      <View style={styles.bubbleDivider} />
      <View style={styles.bubbleItem}>
        <Text style={styles.bubbleValue}>{nutrition.carbs}g</Text>
        <Text style={styles.bubbleLabel}>Gluc</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Animated Header with Parallax */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.Image
          source={{ uri: recipe.heroImage }}
          style={[
            styles.heroImage,
            { opacity: imageOpacity, transform: [{ translateY: imageTranslate }] },
          ]}
        />
        <View style={styles.heroOverlay} />
        
        <SafeAreaView style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerRightButtons}>
            {/* Save Offline Button */}
            <TouchableOpacity 
              style={[styles.headerBtn, isSavedOffline && styles.headerBtnActive]} 
              onPress={isSavedOffline ? removeFromOffline : saveForOffline}
              disabled={savingOffline}
            >
              {savingOffline ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name={isSavedOffline ? "cloud-done" : "cloud-download-outline"} size={24} color="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Animated.View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitle}>{recipe.title}</Text>
          <Text style={styles.heroSubtitle}>{recipe.subtitle}</Text>
        </Animated.View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={{ height: HEADER_MAX_HEIGHT }} />

        {/* Main Video Section */}
        <View style={styles.mainVideoSection}>
          <Text style={styles.videoSectionTitle}>Tutoriel Video</Text>
          <TouchableOpacity 
            style={styles.mainVideoCard}
            onPress={() => setShowMainVideo(true)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: recipe.heroImage }} style={styles.mainVideoThumbnail} />
            <View style={styles.mainVideoOverlay}>
              <View style={styles.mainVideoPlayBtn}>
                <Ionicons name="play" size={40} color="#FFF" />
              </View>
              <Text style={styles.mainVideoTitle}>Voir la recette complete</Text>
              <Text style={styles.mainVideoDuration}>Tutorial - 2 min</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recipe Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{recipe.duration}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="flame-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{recipe.difficulty}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.infoText}>{recipe.rating}</Text>
          </View>
          <View style={[styles.infoItem, styles.healthScoreBadge]}>
            <Text style={styles.healthScoreText}>{recipe.healthScore}</Text>
          </View>
        </View>

        {/* Tags */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
          {recipe.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Portion Scaler */}
        <View style={styles.portionSection}>
          <Text style={styles.sectionTitle}>Portions</Text>
          <View style={styles.portionScaler}>
            <TouchableOpacity 
              style={styles.portionBtn}
              onPress={() => setServings(Math.max(1, servings - 1))}
            >
              <Ionicons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.portionDisplay}>
              <Ionicons name="people" size={24} color={colors.text} />
              <Text style={styles.portionCount}>{servings}</Text>
              <Text style={styles.portionLabel}>personnes</Text>
            </View>
            <TouchableOpacity 
              style={styles.portionBtn}
              onPress={() => setServings(Math.min(12, servings + 1))}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bento Box Ingredients */}
        <View style={styles.ingredientsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.checkedCount}>
              {ingredients.filter(i => i.checked).length}/{ingredients.length}
            </Text>
          </View>
          
          <View style={styles.bentoBox}>
            {ingredients.map((ingredient) => (
              <TouchableOpacity
                key={ingredient.id}
                style={[styles.bentoItem, ingredient.checked && styles.bentoItemChecked]}
                onPress={() => toggleIngredient(ingredient.id)}
              >
                <View style={[styles.checkCircle, ingredient.checked && styles.checkCircleChecked]}>
                  {ingredient.checked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <View style={styles.ingredientInfo}>
                  <Text style={[styles.ingredientName, ingredient.checked && styles.ingredientNameChecked]}>
                    {ingredient.name}
                  </Text>
                  <Text style={styles.ingredientQuantity}>
                    {getScaledQuantity(ingredient.quantity)} {ingredient.unit}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Steps with Videos */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Preparation</Text>
          
          {recipe.steps.map((step, index) => {
            const timer = timers.find(t => t.stepId === step.id);
            
            return (
              <View key={step.id} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  {step.duration > 0 && (
                    <TouchableOpacity 
                      style={[styles.stepTimer, timer?.isRunning && styles.stepTimerActive]}
                      onPress={() => startTimer(step.id, step.duration)}
                    >
                      <Ionicons 
                        name={timer?.isRunning ? "pause" : "timer-outline"} 
                        size={18} 
                        color={timer?.isRunning ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[styles.stepTimerText, timer?.isRunning && styles.stepTimerTextActive]}>
                        {timer?.isRunning ? formatTime(timer.remaining) : `${step.duration} min`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Smart Timer Text - clickable durations */}
                <SmartTimerText text={step.description} stepId={step.id} />
                
                {step.tip && (
                  <View style={styles.stepTip}>
                    <Ionicons name="bulb-outline" size={16} color="#FFD700" />
                    <Text style={styles.stepTipText}>{step.tip}</Text>
                  </View>
                )}

                {/* Video for this step */}
                <InlineVideoPreview 
                  uri={step.videoUrl}
                  thumbnail={step.image}
                  onPress={() => openStepVideo(step.videoUrl, `Etape ${index + 1}: ${step.title}`)}
                />
              </View>
            );
          })}
        </View>

        <View style={{ height: 150 }} />
      </Animated.ScrollView>

      {/* Floating Nutrition Bubble */}
      <NutritionBubble />

      {/* Start Cooking Mode Button */}
      <View style={styles.cookingModeButtonContainer}>
        <TouchableOpacity 
          style={styles.cookingModeButton}
          onPress={() => setIsCookingMode(true)}
        >
          <MaterialCommunityIcons name="chef-hat" size={24} color="#FFF" />
          <Text style={styles.cookingModeButtonText}>Mode Cuisine</Text>
        </TouchableOpacity>
      </View>

      {/* Video Modals */}
      <SimpleVideoPlayer 
        uri={recipe.videoUrl}
        isVisible={showMainVideo}
        onClose={() => setShowMainVideo(false)}
        title="Recette Complete"
      />
      
      <SimpleVideoPlayer 
        uri={currentVideoUrl}
        isVisible={showStepVideo}
        onClose={() => setShowStepVideo(false)}
        title={currentVideoTitle}
      />

      {/* Cooking Mode Modal */}
      <CookingModeModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  // Header
  header: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 10 },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_MAX_HEIGHT, width: SCREEN_WIDTH, resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  headerButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  headerBtnActive: { backgroundColor: colors.primary },
  headerRightButtons: { flexDirection: 'row', gap: 10 },
  heroTitleContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 0 },

  // Main Video Section
  mainVideoSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  videoSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  mainVideoCard: { height: 200, borderRadius: 20, overflow: 'hidden' },
  mainVideoThumbnail: { width: '100%', height: '100%' },
  mainVideoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mainVideoPlayBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mainVideoTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  mainVideoDuration: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // Info Bar
  infoBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, fontWeight: '500', color: colors.text },
  healthScoreBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  healthScoreText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Tags
  tagsContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  tag: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  tagText: { fontSize: 13, fontWeight: '500', color: colors.primary },

  // Section
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkedCount: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // Portion Scaler
  portionSection: { paddingHorizontal: 16, paddingVertical: 16 },
  portionScaler: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 24 },
  portionBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  portionDisplay: { alignItems: 'center', gap: 4 },
  portionCount: { fontSize: 32, fontWeight: '700', color: colors.text },
  portionLabel: { fontSize: 14, color: colors.textSecondary },

  // Bento Box
  ingredientsSection: { paddingHorizontal: 16, paddingVertical: 16 },
  bentoBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bentoItem: { width: (SCREEN_WIDTH - 42) / 2, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 10 },
  bentoItemChecked: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary, borderWidth: 1 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.textSecondary, justifyContent: 'center', alignItems: 'center' },
  checkCircleChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: '600', color: colors.text },
  ingredientNameChecked: { textDecorationLine: 'line-through', color: colors.textSecondary },
  ingredientQuantity: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Steps
  stepsSection: { paddingHorizontal: 16, paddingVertical: 16 },
  stepCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  stepTimer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  stepTimerActive: { backgroundColor: '#E8F5E9' },
  stepTimerText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  stepTimerTextActive: { color: colors.primary, fontWeight: '700' },
  stepDescription: { fontSize: 14, lineHeight: 22, color: colors.text, marginBottom: 8 },
  stepTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, backgroundColor: '#FFFDE7', borderRadius: 8 },
  stepTipText: { flex: 1, fontSize: 13, color: '#5D4037', fontStyle: 'italic' },

  // Nutrition Bubble
  nutritionBubble: { position: 'absolute', bottom: 100, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 16, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  bubbleItem: { alignItems: 'center' },
  bubbleValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  bubbleLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  bubbleDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Cooking Mode Button
  cookingModeButtonContainer: { position: 'absolute', bottom: 30, left: 16, right: 16 },
  cookingModeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  cookingModeButtonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // Cooking Mode Modal
  cookingModeContainer: { flex: 1, backgroundColor: '#1A1A2E' },
  cookingModeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  cookingModeTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  cookingModeProgress: { paddingHorizontal: 20, marginBottom: 20 },
  progressText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  cookingModeContent: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  cookingModeImage: { width: SCREEN_WIDTH - 80, height: 180, borderRadius: 20, marginBottom: 24 },
  cookingModeStepTitle: { fontSize: 26, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 16 },
  cookingModeStepDesc: { fontSize: 18, lineHeight: 28, color: 'rgba(255,255,255,0.9)', textAlign: 'center', paddingHorizontal: 20 },
  cookingModeTimer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 24 },
  timerTextWhite: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  cookingModeNav: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingVertical: 20 },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  navButtonDisabled: { opacity: 0.5 },
  navButtonPrimary: { backgroundColor: colors.primary },
  navButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  navButtonTextPrimary: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  voiceHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 20 },
  voiceHintText: { fontSize: 12, color: '#888' },
});
