// Premium Subscription Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { createCheckoutSessionAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';

// Get base URL for redirects - works on both web and mobile
const getBaseUrl = () => {
  // For web platform, always use window.location.origin
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  // For mobile (iOS/Android), Stripe will open in external browser
  // which will have access to window.location after redirect
  // Use EXPO_PUBLIC_BACKEND_URL as the landing page
  return process.env.EXPO_PUBLIC_BACKEND_URL;
};

const FEATURES = [
  { icon: 'restaurant', name: 'Menu IA personnalise', desc: 'Un menu hebdomadaire adapte a vos objectifs' },
  { icon: 'chatbubbles', name: 'Coach IA illimite', desc: 'Posez toutes vos questions nutrition' },
  { icon: 'cart', name: 'Liste de courses', desc: 'Generee automatiquement avec le menu' },
  { icon: 'fitness', name: 'Exercices personnalises', desc: 'Bases sur vos objectifs sante' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { user, checkPremiumStatus, isPremium, forceRefreshPremium } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check premium status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      await forceRefreshPremium();
      setCheckingStatus(false);
    };
    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Double-check premium status before allowing subscription
    await forceRefreshPremium();
    
    if (isPremium) {
      Alert.alert(
        'Deja Premium !',
        'Vous etes deja abonne a NutriScan Premium. Profitez de toutes les fonctionnalites !',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    setLoading(true);
    try {
      // Use dynamic URL for deployment compatibility
      const baseUrl = getBaseUrl();
      const successUrl = `${baseUrl}/?payment=success`;
      const cancelUrl = `${baseUrl}/?payment=cancelled`;
      
      const { checkout_url } = await createCheckoutSessionAPI(
        selectedPlan,
        successUrl,
        cancelUrl,
        user.email,
        user.user_id
      );

      await Linking.openURL(checkout_url);
      
      // Check premium status after user returns
      setTimeout(async () => {
        await checkPremiumStatus();
      }, 5000);
    } catch (error: any) {
      console.log('Checkout error:', error);
      // Check if error is about already being premium
      if (error.response?.data?.detail?.includes('deja')) {
        Alert.alert(
          'Deja Premium !',
          error.response.data.detail,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        await forceRefreshPremium();
      } else {
        Alert.alert('Erreur', 'Impossible de lancer le paiement. Reessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If already premium, show success screen
  if (!checkingStatus && isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.alreadyPremium}>
          <View style={styles.premiumIconLarge}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.alreadyPremiumTitle}>Vous etes Premium !</Text>
          <Text style={styles.alreadyPremiumText}>
            Profitez de toutes les fonctionnalites exclusives de NutriScan Premium.
          </Text>
          
          <View style={styles.premiumFeaturesActive}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.activeFeatureItem}>
                <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
                <Text style={styles.activeFeatureText}>{feature.name}</Text>
                <Ionicons name="checkmark" size={18} color={colors.success} />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.backToHomeButton} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.backToHomeText}>Retour a l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verification de votre statut...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Premium Icon */}
        <View style={styles.premiumHeader}>
          <View style={styles.premiumIcon}>
            <Ionicons name="star" size={40} color={colors.premium} />
          </View>
          <Text style={styles.premiumTitle}>NutriScan Premium</Text>
          <Text style={styles.premiumSubtitle}>Débloquez toutes les fonctionnalités</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <Text style={styles.pricingTitle}>Choisissez votre formule</Text>

        {/* Monthly */}
        <TouchableOpacity
          style={[styles.pricingCard, selectedPlan === 'monthly' && styles.pricingCardSelected]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <View style={styles.pricingContent}>
            <View style={styles.pricingRadio}>
              <Ionicons
                name={selectedPlan === 'monthly' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={selectedPlan === 'monthly' ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.pricingInfo}>
              <Text style={styles.pricingPlanName}>Mensuel</Text>
              <Text style={styles.pricingPlanDesc}>Sans engagement</Text>
            </View>
            <View style={styles.pricingPriceContainer}>
              <Text style={styles.pricingPrice}>9,99€</Text>
              <Text style={styles.pricingPeriod}>/mois</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Yearly */}
        <TouchableOpacity
          style={[styles.pricingCard, selectedPlan === 'yearly' && styles.pricingCardSelected]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <View style={styles.pricingBadge}>
            <Text style={styles.pricingBadgeText}>-37%</Text>
          </View>
          <View style={styles.pricingContent}>
            <View style={styles.pricingRadio}>
              <Ionicons
                name={selectedPlan === 'yearly' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={selectedPlan === 'yearly' ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.pricingInfo}>
              <Text style={styles.pricingPlanName}>Annuel</Text>
              <Text style={styles.pricingPlanDesc}>Meilleure offre</Text>
            </View>
            <View style={styles.pricingPriceContainer}>
              <Text style={styles.pricingPrice}>74,99€</Text>
              <Text style={styles.pricingPeriod}>/an</Text>
            </View>
          </View>
          <Text style={styles.pricingMonthly}>soit 6,25€/mois</Text>
        </TouchableOpacity>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="lock-open" size={20} color="#FFF" />
              <Text style={styles.subscribeButtonText}>S'abonner maintenant</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.subscribeNote}>
          Paiement sécurisé par Stripe. Annulez à tout moment.
        </Text>

        {/* Guarantee */}
        <View style={styles.guaranteeBox}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          <Text style={styles.guaranteeText}>Satisfait ou remboursé pendant 7 jours</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  premiumHeader: { alignItems: 'center', marginBottom: 24 },
  premiumIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  premiumTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  premiumSubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 8 },
  featuresList: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  featureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  featureText: { flex: 1, marginLeft: 12 },
  featureName: { fontSize: 15, fontWeight: '600', color: colors.text },
  featureDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  pricingTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  pricingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  pricingCardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  pricingBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: colors.premium, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pricingBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  pricingContent: { flexDirection: 'row', alignItems: 'center' },
  pricingRadio: { marginRight: 12 },
  pricingInfo: { flex: 1 },
  pricingPlanName: { fontSize: 16, fontWeight: '600', color: colors.text },
  pricingPlanDesc: { fontSize: 13, color: colors.textSecondary },
  pricingPriceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  pricingPrice: { fontSize: 24, fontWeight: '700', color: colors.text },
  pricingPeriod: { fontSize: 14, color: colors.textSecondary, marginLeft: 2 },
  pricingMonthly: { textAlign: 'center', fontSize: 13, color: colors.primary, fontWeight: '500', marginTop: 8 },
  subscribeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 12, marginTop: 16 },
  subscribeButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginLeft: 8 },
  subscribeNote: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 12 },
  guaranteeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, marginTop: 20 },
  guaranteeText: { fontSize: 14, color: colors.success, fontWeight: '500', marginLeft: 8 },
  // Already Premium styles
  alreadyPremium: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  premiumIconLarge: { marginBottom: 24 },
  alreadyPremiumTitle: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 },
  alreadyPremiumText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  premiumFeaturesActive: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 24 },
  activeFeatureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  activeFeatureText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text, marginLeft: 12 },
  backToHomeButton: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12 },
  backToHomeText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
});
