// Menu Generation Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { generateMenuAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';

export default function MenuScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { weeklyMenu, setWeeklyMenu, shoppingList, setShoppingList } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [familySize, setFamilySize] = useState(2);

  const generateMenu = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const menu = await generateMenuAPI(user.email, user.user_id, familySize);
      setWeeklyMenu(menu);
      
      // Extract shopping list
      if (menu.liste_courses) {
        setShoppingList(menu.liste_courses);
      }
    } catch (error) {
      console.log('Error generating menu:', error);
      Alert.alert('Erreur', 'Impossible de générer le menu. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const formatMenuForShare = () => {
    if (!weeklyMenu) return '';
    
    let text = '🍽️ MENU DE LA SEMAINE \n\n';
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    
    days.forEach(day => {
      const dayMenu = weeklyMenu[day];
      if (dayMenu && typeof dayMenu === 'object' && !Array.isArray(dayMenu)) {
        text += `📅 ${day.toUpperCase()}\n`;
        if (dayMenu.petit_dejeuner) text += `  🍳 ${dayMenu.petit_dejeuner}\n`;
        if (dayMenu.dejeuner) text += `  🍝 ${dayMenu.dejeuner}\n`;
        if (dayMenu.diner) text += `  🌙 ${dayMenu.diner}\n`;
        text += '\n';
      }
    });
    
    if (shoppingList.length > 0) {
      text += '🛒 LISTE DE COURSES\n';
      shoppingList.forEach(item => {
        text += `  • ${item}\n`;
      });
    }
    
    return text;
  };

  const handleCopy = async () => {
    const text = formatMenuForShare();
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié !', 'Le menu a été copié dans le presse-papier');
  };

  const handleShare = async () => {
    const text = formatMenuForShare();
    try {
      await Share.share({ message: text });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const renderDayMenu = (day: string) => {
    const dayMenu = weeklyMenu?.[day];
    if (!dayMenu || typeof dayMenu !== 'object' || Array.isArray(dayMenu)) return null;
    
    return (
      <View key={day} style={styles.dayCard}>
        <Text style={styles.dayTitle}>{day}</Text>
        {dayMenu.petit_dejeuner && (
          <View style={styles.mealRow}>
            <Ionicons name="sunny" size={16} color={colors.warning} />
            <Text style={styles.mealText}>{dayMenu.petit_dejeuner}</Text>
          </View>
        )}
        {dayMenu.dejeuner && (
          <View style={styles.mealRow}>
            <Ionicons name="restaurant" size={16} color={colors.primary} />
            <Text style={styles.mealText}>{dayMenu.dejeuner}</Text>
          </View>
        )}
        {dayMenu.diner && (
          <View style={styles.mealRow}>
            <Ionicons name="moon" size={16} color="#9C27B0" />
            <Text style={styles.mealText}>{dayMenu.diner}</Text>
          </View>
        )}
      </View>
    );
  };

  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Menu Hebdomadaire</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Family Size Selector */}
        <View style={styles.familySizeContainer}>
          <Text style={styles.familySizeLabel}>Nombre de personnes</Text>
          <View style={styles.familySizeSelector}>
            {[1, 2, 3, 4, 5, 6].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.familySizeOption, familySize === num && styles.familySizeOptionActive]}
                onPress={() => setFamilySize(num)}
              >
                <Text style={[styles.familySizeOptionText, familySize === num && styles.familySizeOptionTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate / Regenerate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateMenu}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name={weeklyMenu ? 'refresh' : 'restaurant'} size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>
                {weeklyMenu ? 'Regénérer le menu' : 'Générer mon menu'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Menu */}
        {weeklyMenu && (
          <>
            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>
            </View>

            {/* Days */}
            {days.map(day => renderDayMenu(day))}

            {/* Shopping List */}
            {shoppingList.length > 0 && (
              <View style={styles.shoppingListCard}>
                <Text style={styles.shoppingListTitle}>
                  🛒 Liste de courses ({shoppingList.length} articles)
                </Text>
                {shoppingList.map((item, index) => (
                  <View key={index} style={styles.shoppingListItem}>
                    <Ionicons name="checkbox-outline" size={16} color={colors.success} />
                    <Text style={styles.shoppingListText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Empty State */}
        {!weeklyMenu && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Pas encore de menu</Text>
            <Text style={styles.emptyStateSubtext}>
              Générez un menu personnalisé basé sur vos objectifs santé
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  familySizeContainer: { marginBottom: 16 },
  familySizeLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  familySizeSelector: { flexDirection: 'row', gap: 8 },
  familySizeOption: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  familySizeOptionActive: { backgroundColor: colors.primary },
  familySizeOptionText: { fontSize: 16, fontWeight: '600', color: colors.text },
  familySizeOptionTextActive: { color: '#FFF' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginBottom: 24 },
  generateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF', marginLeft: 8 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  actionText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 6 },
  dayCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 12, textTransform: 'capitalize' },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  mealText: { fontSize: 14, color: colors.text, marginLeft: 10, flex: 1, lineHeight: 20 },
  shoppingListCard: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16, marginTop: 20 },
  shoppingListTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  shoppingListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  shoppingListText: { fontSize: 14, color: colors.text, marginLeft: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
