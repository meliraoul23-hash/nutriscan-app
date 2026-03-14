// Premium Recipe Detail Screen - NutriScan
// Features: Parallax Hero, Video Player, Cooking Mode, Smart Timers, Portion Scaler
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 350;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Mock recipe data (would come from API)
const MOCK_RECIPE = {
  id: '1',
  title: 'Buddha Bowl Mediterraneen',
  subtitle: 'Bowl equilibre aux saveurs du sud',
  heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
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
      description: 'Rincez le quinoa sous l\'eau froide. Faites cuire dans 2 volumes d\'eau salee pendant 15 minutes. Laissez reposer.',
      duration: 15,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300',
      tip: 'Le quinoa est pret quand les grains sont translucides et le germe visible.'
    },
    {
      id: '2',
      title: 'Preparer les legumes',
      description: 'Coupez le concombre en rondelles, les tomates cerises en deux, et l\'avocat en tranches.',
      duration: 5,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300',
      tip: 'Pour eviter que l\'avocat noircisse, arrosez-le de jus de citron.'
    },
    {
      id: '3',
      title: 'Rôtir les pois chiches',
      description: 'Egouttez les pois chiches, sechez-les. Faites-les rotir a la poele avec un filet d\'huile d\'olive pendant 8 minutes.',
      duration: 8,
      image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=300',
      tip: 'Les pois chiches doivent etre dores et croustillants.'
    },
    {
      id: '4',
      title: 'Preparer la vinaigrette',
      description: 'Melangez l\'huile d\'olive, le jus de citron, sel et poivre dans un petit bol. Emulsionnez a la fourchette.',
      duration: 2,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
      tip: 'Ajoutez une pointe de moutarde pour une meilleure emulsion.'
    },
    {
      id: '5',
      title: 'Assembler le bowl',
      description: 'Disposez le quinoa au fond du bowl. Arrangez les legumes en sections. Ajoutez la feta emiettee et les pois chiches.',
      duration: 3,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
      tip: 'Presentez les ingredients en arc-en-ciel pour un effet visuel optimal.'
    },
    {
      id: '6',
      title: 'Finaliser',
      description: 'Ajoutez une cuillere de houmous au centre. Arrosez de vinaigrette. Parsemez de graines de sesame.',
      duration: 2,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300',
      tip: 'Servez immediatement pour garder le croustillant des pois chiches.'
    },
  ],
  tags: ['Vegetarien', 'Riche en proteines', 'Sans gluten', 'Mediterraneen'],
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

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isPremium } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);

  // State
  const [recipe, setRecipe] = useState(MOCK_RECIPE);
  const [servings, setServings] = useState(recipe.servings);
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Timer intervals
  const timerIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

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

  const titleScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.8],
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
      fat: Math.round(recipe.fat * ratio),
      fiber: Math.round(recipe.fiber * ratio),
    };
  }, [servings, recipe]);

  // Toggle ingredient check
  const toggleIngredient = (id: string) => {
    setIngredients(prev => 
      prev.map(ing => 
        ing.id === id ? { ...ing, checked: !ing.checked } : ing
      )
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
            Alert.alert('Minuteur termine!', `L'etape est terminee.`);
            return { ...t, remaining: 0, isRunning: false };
          }
          return { ...t, remaining: newRemaining };
        }
        return t;
      }));
    }, 1000);
  };

  const stopTimer = (stepId: string) => {
    if (timerIntervals.current[stepId]) {
      clearInterval(timerIntervals.current[stepId]);
    }
    setTimers(prev => prev.map(t => 
      t.stepId === stepId ? { ...t, isRunning: false } : t
    ));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Save for offline
  const saveForOffline = async () => {
    if (!isPremium) {
      Alert.alert('Premium requis', 'Cette fonctionnalite est reservee aux membres Premium.');
      return;
    }
    
    setIsSaving(true);
    try {
      // Simulate downloading media
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsOfflineSaved(true);
      Alert.alert('Succes', 'Recette sauvegardee pour utilisation hors ligne!');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const nutrition = getScaledNutrition();

  // Video Player Component
  const VideoPlayerModal = () => (
    <Modal visible={showVideoPlayer} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.videoModalContainer}>
        <StatusBar hidden />
        <Video
          ref={videoRef}
          source={{ uri: recipe.videoUrl }}
          style={styles.fullScreenVideo}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isVideoPlaying}
          isLooping
          isMuted={isVideoMuted}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              setIsVideoPlaying(status.isPlaying);
            }
          }}
        />
        
        {/* Video Controls Overlay */}
        <View style={styles.videoOverlay}>
          <TouchableOpacity style={styles.videoCloseBtn} onPress={() => setShowVideoPlayer(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.videoControls}>
            <TouchableOpacity 
              style={styles.videoControlBtn}
              onPress={() => setIsVideoMuted(!isVideoMuted)}
            >
              <Ionicons name={isVideoMuted ? "volume-mute" : "volume-high"} size={24} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.videoPlayBtn}
              onPress={() => setIsVideoPlaying(!isVideoPlaying)}
            >
              <Ionicons name={isVideoPlaying ? "pause" : "play"} size={40} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.videoControlBtn}>
              <Ionicons name="expand" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>{recipe.title}</Text>
            <Text style={styles.videoSubtitle}>Tutorial rapide - 30s</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Cooking Mode Component
  const CookingModeModal = () => (
    <Modal visible={isCookingMode} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={styles.cookingModeContainer}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.cookingModeHeader}>
          <TouchableOpacity onPress={() => setIsCookingMode(false)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.cookingModeTitle}>Mode Cuisine</Text>
          <TouchableOpacity onPress={() => handleVoiceCommand('repeat')}>
            <Ionicons name="volume-high" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={styles.cookingModeProgress}>
          <Text style={styles.progressText}>Etape {currentStep + 1} / {recipe.steps.length}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }]} />
          </View>
        </View>

        {/* Current Step */}
        <View style={styles.cookingModeContent}>
          <Image 
            source={{ uri: recipe.steps[currentStep].image }} 
            style={styles.cookingModeImage}
          />
          
          <Text style={styles.cookingModeStepTitle}>
            {recipe.steps[currentStep].title}
          </Text>
          
          <Text style={styles.cookingModeStepDesc}>
            {recipe.steps[currentStep].description}
          </Text>

          {/* Timer for this step */}
          {recipe.steps[currentStep].duration > 0 && (
            <TouchableOpacity 
              style={styles.cookingModeTimer}
              onPress={() => startTimer(recipe.steps[currentStep].id, recipe.steps[currentStep].duration)}
            >
              {timers.find(t => t.stepId === recipe.steps[currentStep].id)?.isRunning ? (
                <>
                  <Ionicons name="timer" size={24} color={colors.primary} />
                  <Text style={styles.timerText}>
                    {formatTime(timers.find(t => t.stepId === recipe.steps[currentStep].id)?.remaining || 0)}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="timer-outline" size={24} color="#FFF" />
                  <Text style={styles.timerTextWhite}>{recipe.steps[currentStep].duration} min</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {recipe.steps[currentStep].tip && (
            <View style={styles.cookingModeTip}>
              <Ionicons name="bulb" size={20} color="#FFD700" />
              <Text style={styles.tipText}>{recipe.steps[currentStep].tip}</Text>
            </View>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.cookingModeNav}>
          <TouchableOpacity 
            style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
            onPress={() => handleVoiceCommand('back')}
            disabled={currentStep === 0}
          >
            <Ionicons name="arrow-back" size={28} color={currentStep === 0 ? '#666' : '#FFF'} />
            <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>Precedent</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={() => handleVoiceCommand('next')}
            disabled={currentStep === recipe.steps.length - 1}
          >
            <Text style={styles.navButtonTextPrimary}>
              {currentStep === recipe.steps.length - 1 ? 'Terminer' : 'Suivant'}
            </Text>
            <Ionicons name="arrow-forward" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Voice Command Hint */}
        <View style={styles.voiceHint}>
          <Ionicons name="mic" size={16} color="#888" />
          <Text style={styles.voiceHintText}>Dites "Suivant", "Precedent" ou "Repeter"</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
            {
              opacity: imageOpacity,
              transform: [{ translateY: imageTranslate }],
            },
          ]}
        />
        <View style={styles.heroOverlay} />
        
        {/* Back Button */}
        <SafeAreaView style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerRightBtns}>
            <TouchableOpacity 
              style={styles.headerBtn} 
              onPress={saveForOffline}
              disabled={isSaving}
            >
              {isSaving ? (
                <Ionicons name="cloud-download" size={24} color="#FFF" />
              ) : (
                <Ionicons name={isOfflineSaved ? "cloud-done" : "cloud-download-outline"} size={24} color="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Title on Hero */}
        <Animated.View style={[styles.heroTitleContainer, { transform: [{ scale: titleScale }] }]}>
          <Text style={styles.heroTitle}>{recipe.title}</Text>
          <Text style={styles.heroSubtitle}>{recipe.subtitle}</Text>
          
          {/* Play Video Button */}
          <TouchableOpacity 
            style={styles.playVideoBtn}
            onPress={() => setShowVideoPlayer(true)}
          >
            <Ionicons name="play-circle" size={60} color="#FFF" />
            <Text style={styles.playVideoText}>Voir le tutoriel</Text>
          </TouchableOpacity>
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
        {/* Spacer for header */}
        <View style={{ height: HEADER_MAX_HEIGHT }} />

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
            <Text style={styles.infoText}>{recipe.rating} ({recipe.reviews})</Text>
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

        {/* Steps */}
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
                      onPress={() => timer?.isRunning ? stopTimer(step.id) : startTimer(step.id, step.duration)}
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
                
                <View style={styles.stepContent}>
                  <Image source={{ uri: step.image }} style={styles.stepImage} />
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                
                {step.tip && (
                  <View style={styles.stepTip}>
                    <Ionicons name="bulb-outline" size={16} color="#FFD700" />
                    <Text style={styles.stepTipText}>{step.tip}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Bottom padding */}
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

      {/* Modals */}
      <VideoPlayerModal />
      <CookingModeModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header & Parallax
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    width: SCREEN_WIDTH,
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  heroTitleContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  playVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  playVideoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },

  // Info Bar
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  healthScoreBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  healthScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Tags
  tagsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },

  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Portion Scaler
  portionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  portionScaler: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 24,
  },
  portionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  portionCount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  portionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Bento Box Ingredients
  ingredientsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bentoBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoItem: {
    width: (SCREEN_WIDTH - 42) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  bentoItemChecked: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ingredientNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  ingredientQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Steps
  stepsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stepTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepTimerActive: {
    backgroundColor: '#E8F5E9',
  },
  stepTimerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  stepTimerTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepContent: {
    flexDirection: 'row',
    gap: 12,
  },
  stepImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  stepDescription: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  stepTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
  },
  stepTipText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    fontStyle: 'italic',
  },

  // Floating Nutrition Bubble
  nutritionBubble: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleItem: {
    alignItems: 'center',
  },
  bubbleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  bubbleLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Cooking Mode Button
  cookingModeButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
  },
  cookingModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cookingModeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Video Player Modal
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  videoCloseBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  videoControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  videoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // Cooking Mode Modal
  cookingModeContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  cookingModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cookingModeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cookingModeProgress: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  cookingModeContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookingModeImage: {
    width: SCREEN_WIDTH - 80,
    height: 200,
    borderRadius: 20,
    marginBottom: 24,
  },
  cookingModeStepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  cookingModeStepDesc: {
    fontSize: 20,
    lineHeight: 30,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cookingModeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 24,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  timerTextWhite: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cookingModeTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,215,0,0.15)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    maxWidth: SCREEN_WIDTH - 80,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  cookingModeNav: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 20,
  },
  voiceHintText: {
    fontSize: 12,
    color: '#888',
  },
});
