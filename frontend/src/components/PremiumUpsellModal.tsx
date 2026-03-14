// Premium Upsell Modal - Shows every 2 days for free users
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  { icon: 'analytics', title: 'Suivi de progression', desc: 'Graphiques poids, calories, score sante' },
  { icon: 'person-circle', title: 'Profil personnalise', desc: 'Conseils IA adaptes a vos objectifs' },
  { icon: 'restaurant', title: 'Menus IA illimites', desc: 'Menus hebdomadaires personnalises' },
  { icon: 'chatbubbles', title: 'Coach IA illimite', desc: 'Questions nutrition sans limite' },
  { icon: 'film', title: 'Recettes video', desc: 'Tutoriels cuisine exclusifs' },
  { icon: 'cloud-download', title: 'Mode hors-ligne', desc: 'Sauvegardez vos recettes favorites' },
];

interface PremiumUpsellModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export const PremiumUpsellModal: React.FC<PremiumUpsellModalProps> = ({ forceShow = false, onClose }) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
    } else {
      checkIfShouldShow();
    }
  }, [forceShow]);

  const checkIfShouldShow = async () => {
    try {
      const lastShown = await AsyncStorage.getItem('premium_upsell_last_shown');
      const now = new Date().getTime();
      
      if (!lastShown) {
        // First time - show after 1 day
        const firstOpen = await AsyncStorage.getItem('app_first_open');
        if (!firstOpen) {
          await AsyncStorage.setItem('app_first_open', now.toString());
          return;
        }
        
        const daysSinceFirstOpen = (now - parseInt(firstOpen)) / (1000 * 60 * 60 * 24);
        if (daysSinceFirstOpen >= 1) {
          setIsVisible(true);
          await AsyncStorage.setItem('premium_upsell_last_shown', now.toString());
        }
      } else {
        // Check if 2 days have passed
        const daysSinceLastShown = (now - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastShown >= 2) {
          setIsVisible(true);
          await AsyncStorage.setItem('premium_upsell_last_shown', now.toString());
        }
      }
    } catch (error) {
      console.log('Error checking premium upsell:', error);
    }
  };

  const handleClose = async () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleSubscribe = () => {
    setIsVisible(false);
    router.push('/premium');
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.crownContainer}>
              <Ionicons name="star" size={40} color="#FFD700" />
            </View>
            <Text style={styles.title}>Passez Premium</Text>
            <Text style={styles.subtitle}>Debloquez toutes les fonctionnalites</Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            ))}
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubscribe}>
              <Text style={styles.primaryButtonText}>Devenir Premium</Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>9.99€/mois</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.trustText}>Annulez a tout moment</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Hook to use the premium upsell in any screen
export const usePremiumUpsell = (isPremium: boolean) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      checkAndShowUpsell();
    }
  }, [isPremium]);

  const checkAndShowUpsell = async () => {
    try {
      const lastShown = await AsyncStorage.getItem('premium_upsell_last_shown');
      const now = new Date().getTime();
      
      if (!lastShown) {
        const firstOpen = await AsyncStorage.getItem('app_first_open');
        if (!firstOpen) {
          await AsyncStorage.setItem('app_first_open', now.toString());
          return;
        }
        
        const daysSinceFirstOpen = (now - parseInt(firstOpen)) / (1000 * 60 * 60 * 24);
        if (daysSinceFirstOpen >= 1) {
          setShowModal(true);
          await AsyncStorage.setItem('premium_upsell_last_shown', now.toString());
        }
      } else {
        const daysSinceLastShown = (now - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastShown >= 2) {
          setShowModal(true);
          await AsyncStorage.setItem('premium_upsell_last_shown', now.toString());
        }
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };

  return { showModal, setShowModal };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ctaContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  trustText: {
    fontSize: 13,
    color: colors.success,
  },
});

export default PremiumUpsellModal;
