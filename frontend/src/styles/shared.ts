// Shared styles for NutriScan
import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

export const sharedStyles = StyleSheet.create({
  // Container styles
  container: { flex: 1, backgroundColor: colors.background },
  mainContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.surface, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },

  // Hero Section
  heroSection: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },

  // Buttons
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: '600' },

  // Scan Button
  scanButton: { marginBottom: 24 },
  scanButtonInner: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  scanButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginLeft: 12 },

  // Section styles
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, marginTop: -4 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.surface, borderRadius: 16 },
  emptyStateText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginTop: 12 },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

  // Cards
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },

  // List Items
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  listItemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  listItemInfo: { flex: 1, marginLeft: 12 },
  listItemTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  listItemSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Score Badge
  scoreBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scoreBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },

  // Screen Header
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 20 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Loading
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },

  // Error
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 14, marginLeft: 8, flex: 1 },
});

export default sharedStyles;
