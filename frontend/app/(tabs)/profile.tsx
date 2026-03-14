// Profile Tab Screen
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useApp } from '../../src/contexts/AppContext';
import { colors } from '../../src/styles/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isPremium, testPremiumMode, toggleTestPremiumMode, forceRefreshPremium } = useAuth();
  const { favorites, healthGoals, weeklyMenu, shoppingList } = useApp();
  
  // Secret button: triple tap counter
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleAvatarPress = () => {
    const now = Date.now();
    // Reset if more than 500ms between taps
    if (now - lastTapTimeRef.current > 500) {
      tapCountRef.current = 0;
    }
    lastTapTimeRef.current = now;
    tapCountRef.current += 1;
    
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      toggleTestPremiumMode();
      Alert.alert(
        testPremiumMode ? 'Mode Test Desactive' : 'Mode Test Premium Active',
        testPremiumMode 
          ? 'Vous etes revenu au mode normal.' 
          : 'Vous pouvez maintenant tester toutes les fonctionnalites Premium!',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefreshPremium = async () => {
    await forceRefreshPremium();
    Alert.alert('Statut mis a jour', 'Votre statut premium a ete actualise.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Deconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.notLoggedInTitle}>Connectez-vous</Text>
          <Text style={styles.notLoggedInText}>
            Creez un compte pour acceder a toutes les fonctionnalites
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePictureAlt}>
                <Text style={styles.profileInitial}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
            )}
            {testPremiumMode && (
              <View style={styles.testBadge}>
                <Text style={styles.testBadgeText}>TEST</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <TouchableOpacity 
            style={[styles.subscriptionBadge, isPremium && styles.subscriptionBadgePremium]}
            onPress={handleRefreshPremium}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPremium ? 'star' : 'star-outline'}
              size={16}
              color={isPremium ? colors.premium : colors.textSecondary}
            />
            <Text style={[styles.subscriptionText, isPremium && styles.subscriptionTextPremium]}>
              {isPremium ? (testPremiumMode ? 'Premium (Test)' : 'Premium') : 'Gratuit'}
            </Text>
            <Ionicons name="refresh-outline" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/favorites')}>
            <Ionicons name="heart" size={24} color={colors.error} />
            <Text style={styles.quickActionText}>Favoris</Text>
            <Text style={styles.quickActionCount}>{favorites.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/preferences')}>
            <Ionicons name="settings" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Préférences</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/fridge-score')}>
            <Text style={{ fontSize: 22 }}>🧊</Text>
            <Text style={styles.quickActionText}>Mon Frigo</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Section */}
        {!isPremium && (
          <View style={styles.premiumPromo}>
            <View style={styles.premiumPromoHeader}>
              <Ionicons name="star" size={24} color={colors.premium} />
              <Text style={styles.premiumPromoTitle}>Passez à Premium</Text>
            </View>
            <Text style={styles.premiumPromoText}>
              Débloquez le menu IA, le coach nutritionnel et plus encore !
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={() => router.push('/premium')}>
              <Text style={styles.premiumButtonText}>Découvrir Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium Features */}
        {isPremium && (
          <>
            {/* Coach AI */}
            <TouchableOpacity style={styles.coachButtonLarge} onPress={() => router.push('/coach')}>
              <View style={styles.coachIconContainer}>
                <Ionicons name="chatbubbles" size={28} color="#FFF" />
              </View>
              <View style={styles.coachButtonInfo}>
                <Text style={styles.coachButtonTitle}>Coach IA Personnel</Text>
                <Text style={styles.coachButtonSubtitle}>Posez vos questions nutrition</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Menu Button */}
            <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/menu')}>
              <Ionicons name="restaurant" size={20} color="#FFF" />
              <Text style={styles.menuButtonText}>
                {weeklyMenu ? 'Voir mon menu' : 'Générer un menu'}
              </Text>
            </TouchableOpacity>

            {/* Shopping List */}
            {shoppingList.length > 0 && (
              <TouchableOpacity style={styles.shoppingListButton} onPress={() => router.push('/menu')}>
                <Ionicons name="cart" size={20} color="#FFF" />
                <Text style={styles.shoppingListButtonText}>
                  Ma liste de courses ({shoppingList.length} articles)
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  notLoggedIn: { alignItems: 'center', paddingVertical: 40 },
  notLoggedInTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  notLoggedInText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  loginButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  profilePicture: { width: 80, height: 80, borderRadius: 40 },
  profilePictureAlt: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  profileName: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12 },
  profileEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  subscriptionBadgePremium: { backgroundColor: '#FFF8E1' },
  subscriptionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginLeft: 4 },
  subscriptionTextPremium: { color: colors.premium },
  testBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#FF5722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  testBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  quickActionButton: { alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, minWidth: 90 },
  quickActionText: { fontSize: 12, color: colors.text, fontWeight: '500', marginTop: 8 },
  quickActionCount: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  premiumPromo: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 24 },
  premiumPromoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  premiumPromoTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: 8 },
  premiumPromoText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  premiumButton: { backgroundColor: colors.premium, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  premiumButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },
  coachButtonLarge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginTop: 8 },
  coachIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center' },
  coachButtonInfo: { flex: 1, marginLeft: 16 },
  coachButtonTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  coachButtonSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  menuButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  menuButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  shoppingListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  shoppingListButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8, flex: 1 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1, borderColor: colors.error, borderRadius: 12, marginTop: 32 },
  logoutButtonText: { color: colors.error, fontSize: 14, fontWeight: '500', marginLeft: 8 },
});
