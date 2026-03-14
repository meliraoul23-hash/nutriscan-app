// User Preferences - Dietary Restrictions & Premium Features
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { getUserPreferencesAPI, saveUserPreferencesAPI, getOfflineCacheAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';

interface DietaryPreferences {
  gluten_free: boolean;
  vegan: boolean;
  vegetarian: boolean;
  low_salt: boolean;
  low_sugar: boolean;
  lactose_free: boolean;
  nut_free: boolean;
  halal: boolean;
  kosher: boolean;
  offline_mode_enabled: boolean;
  advanced_reports_enabled: boolean;
}

const defaultPreferences: DietaryPreferences = {
  gluten_free: false,
  vegan: false,
  vegetarian: false,
  low_salt: false,
  low_sugar: false,
  lactose_free: false,
  nut_free: false,
  halal: false,
  kosher: false,
  offline_mode_enabled: false,
  advanced_reports_enabled: false,
};

const DIETARY_OPTIONS = [
  { key: 'gluten_free', label: 'Sans gluten', icon: 'leaf', description: 'Éviter les produits contenant du gluten' },
  { key: 'vegan', label: 'Végan', icon: 'leaf-outline', description: 'Aucun produit d\'origine animale' },
  { key: 'vegetarian', label: 'Végétarien', icon: 'nutrition', description: 'Sans viande ni poisson' },
  { key: 'low_salt', label: 'Pauvre en sel', icon: 'water', description: 'Alertes si sel > 1.5g/100g' },
  { key: 'low_sugar', label: 'Pauvre en sucre', icon: 'cube', description: 'Alertes si sucre > 12.5g/100g' },
  { key: 'lactose_free', label: 'Sans lactose', icon: 'cafe', description: 'Éviter les produits laitiers' },
  { key: 'nut_free', label: 'Sans fruits à coque', icon: 'warning', description: 'Éviter noix, amandes, etc.' },
  { key: 'halal', label: 'Halal', icon: 'star', description: 'Produits certifiés halal' },
  { key: 'kosher', label: 'Casher', icon: 'star-outline', description: 'Produits certifiés casher' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DietaryPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offlineCacheSize, setOfflineCacheSize] = useState(0);
  const [downloadingCache, setDownloadingCache] = useState(false);

  const { isPremium } = useAuth();

  useEffect(() => {
    loadPreferences();
    checkOfflineCache();
  }, [user]);

  const loadPreferences = async () => {
    try {
      // Load from local storage first
      const localPrefs = await AsyncStorage.getItem('dietary_preferences');
      if (localPrefs) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(localPrefs) });
      }

      // Then sync from server if logged in
      if (user?.email) {
        const serverPrefs = await getUserPreferencesAPI(user.email);
        if (serverPrefs?.preferences) {
          const merged = { ...defaultPreferences, ...serverPrefs.preferences };
          setPreferences(merged);
          await AsyncStorage.setItem('dietary_preferences', JSON.stringify(merged));
        }
      }
    } catch (error) {
      console.log('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkOfflineCache = async () => {
    try {
      const cache = await AsyncStorage.getItem('offline_products_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        setOfflineCacheSize(parsed.products?.length || 0);
      }
    } catch (error) {
      console.log('Error checking cache:', error);
    }
  };

  const togglePreference = async (key: keyof DietaryPreferences) => {
    // Check premium for offline mode
    if (key === 'offline_mode_enabled' && !isPremium) {
      Alert.alert(
        '🔒 Fonctionnalité Premium',
        'Le mode hors-ligne nécessite un abonnement Premium.\n\nAvantages :\n• Accès aux produits sans connexion\n• Cache de 500+ produits populaires\n• Idéal en supermarché',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Découvrir Premium', onPress: () => router.push('/premium') }
        ]
      );
      return;
    }

    if (key === 'advanced_reports_enabled' && !isPremium) {
      Alert.alert(
        '🔒 Fonctionnalité Premium',
        'Les rapports avancés sur les additifs nécessitent un abonnement Premium.\n\nAvantages :\n• Analyse détaillée des additifs\n• Études scientifiques\n• Recommandations personnalisées',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Découvrir Premium', onPress: () => router.push('/premium') }
        ]
      );
      return;
    }

    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);

    // Save to local storage immediately
    await AsyncStorage.setItem('dietary_preferences', JSON.stringify(newPrefs));

    // Sync to server if logged in
    if (user?.email) {
      try {
        await saveUserPreferencesAPI(user.email, newPrefs);
      } catch (error) {
        console.log('Error syncing preferences:', error);
      }
    }
  };

  const downloadOfflineCache = async () => {
    if (!isPremium) {
      Alert.alert('Premium requis', 'Le mode hors-ligne est une fonctionnalité Premium');
      return;
    }

    setDownloadingCache(true);
    try {
      const data = await getOfflineCacheAPI(500);
      await AsyncStorage.setItem('offline_products_cache', JSON.stringify(data));
      setOfflineCacheSize(data.products?.length || 0);
      Alert.alert('✅ Succès', `${data.products?.length || 0} produits téléchargés pour le mode hors-ligne`);
    } catch (error) {
      console.log('Error downloading cache:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le cache');
    } finally {
      setDownloadingCache(false);
    }
  };

  const clearOfflineCache = async () => {
    Alert.alert(
      'Effacer le cache',
      'Voulez-vous supprimer tous les produits stockés hors-ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('offline_products_cache');
            setOfflineCacheSize(0);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Préférences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥗 Restrictions Alimentaires</Text>
          <Text style={styles.sectionDescription}>
            Les produits incompatibles seront signalés lors des scans
          </Text>
          
          {DIETARY_OPTIONS.map((option) => (
            <View key={option.key} style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name={option.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={preferences[option.key as keyof DietaryPreferences]}
                onValueChange={() => togglePreference(option.key as keyof DietaryPreferences)}
                trackColor={{ false: '#E0E0E0', true: colors.primaryLight }}
                thumbColor={preferences[option.key as keyof DietaryPreferences] ? colors.primary : '#FFF'}
              />
            </View>
          ))}
        </View>

        {/* Premium Features */}
        <View style={styles.section}>
          <View style={styles.premiumHeader}>
            <Text style={styles.sectionTitle}>💎 Fonctionnalités Premium</Text>
            {!isPremium && (
              <TouchableOpacity style={styles.premiumBadge} onPress={() => router.push('/premium')}>
                <Ionicons name="lock-closed" size={14} color="#FFF" />
                <Text style={styles.premiumBadgeText}>Débloquer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Offline Mode */}
          <View style={[styles.optionRow, !isPremium && styles.optionLocked]}>
            <View style={styles.optionInfo}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="cloud-offline" size={20} color="#1976D2" />
              </View>
              <View style={styles.optionText}>
                <View style={styles.optionLabelRow}>
                  <Text style={styles.optionLabel}>Mode Hors-ligne</Text>
                  {!isPremium ? <Ionicons name="lock-closed" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} /> : null}
                </View>
                <Text style={styles.optionDescription}>
                  Scannez sans connexion internet
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.offline_mode_enabled}
              onValueChange={() => togglePreference('offline_mode_enabled')}
              trackColor={{ false: '#E0E0E0', true: '#1976D2' }}
              thumbColor={preferences.offline_mode_enabled ? '#1976D2' : '#FFF'}
              disabled={!isPremium}
            />
          </View>

          {/* Offline Cache Status */}
          {isPremium && preferences.offline_mode_enabled && (
            <View style={styles.cacheSection}>
              <View style={styles.cacheInfo}>
                <Ionicons name="folder" size={20} color={colors.textSecondary} />
                <Text style={styles.cacheText}>
                  {offlineCacheSize > 0 
                    ? `${offlineCacheSize} produits en cache` 
                    : 'Aucun produit en cache'}
                </Text>
              </View>
              <View style={styles.cacheButtons}>
                <TouchableOpacity 
                  style={styles.downloadBtn} 
                  onPress={downloadOfflineCache}
                  disabled={downloadingCache}
                >
                  {downloadingCache ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="download" size={16} color="#FFF" />
                      <Text style={styles.downloadBtnText}>Télécharger</Text>
                    </>
                  )}
                </TouchableOpacity>
                {offlineCacheSize > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearOfflineCache}>
                    <Ionicons name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Advanced Reports */}
          <View style={[styles.optionRow, !isPremium && styles.optionLocked]}>
            <View style={styles.optionInfo}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={20} color="#FF9800" />
              </View>
              <View style={styles.optionText}>
                <View style={styles.optionLabelRow}>
                  <Text style={styles.optionLabel}>Rapports Additifs Avancés</Text>
                  {!isPremium ? <Ionicons name="lock-closed" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} /> : null}
                </View>
                <Text style={styles.optionDescription}>
                  Études scientifiques et analyses détaillées
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.advanced_reports_enabled}
              onValueChange={() => togglePreference('advanced_reports_enabled')}
              trackColor={{ false: '#E0E0E0', true: '#FF9800' }}
              thumbColor={preferences.advanced_reports_enabled ? '#FF9800' : '#FFF'}
              disabled={!isPremium}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Vos préférences sont sauvegardées automatiquement et synchronisées sur tous vos appareils.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { flex: 1, padding: 16 },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionDescription: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.premium,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  premiumBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionLocked: { opacity: 0.7 },
  optionInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: { flex: 1 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cacheSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  cacheInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cacheText: { fontSize: 14, color: colors.textSecondary, marginLeft: 8 },
  cacheButtons: { flexDirection: 'row', alignItems: 'center' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  downloadBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  clearBtn: {
    padding: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
