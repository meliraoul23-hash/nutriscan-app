// Scanner Screen - Fixed duplicate scan bug with useRef and debounce
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../src/contexts/AppContext';
import { colors } from '../src/styles/colors';

// Debounce delay to prevent duplicate scans (in ms)
const SCAN_DEBOUNCE_DELAY = 2000;

export default function ScannerScreen() {
  const router = useRouter();
  const { fetchProduct, productLoading } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  
  // Use refs to prevent race conditions with async state updates
  const isProcessingRef = useRef(false);
  const lastScannedBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    const now = Date.now();
    
    // Prevent duplicate scans using multiple checks:
    // 1. Check if already processing (ref is synchronous, unlike state)
    // 2. Check if same barcode was scanned recently
    // 3. Check if within debounce period
    if (isProcessingRef.current) {
      console.log('Already processing a scan, ignoring...');
      return;
    }
    
    if (productLoading) {
      console.log('Product loading, ignoring scan...');
      return;
    }
    
    if (data === lastScannedBarcodeRef.current && (now - lastScanTimeRef.current) < SCAN_DEBOUNCE_DELAY) {
      console.log('Same barcode scanned too quickly, ignoring...');
      return;
    }
    
    // Lock immediately using ref (synchronous)
    isProcessingRef.current = true;
    lastScannedBarcodeRef.current = data;
    lastScanTimeRef.current = now;
    setScanned(true);
    
    try {
      console.log('Processing barcode:', data);
      await fetchProduct(data);
      router.replace('/product');
    } catch (error) {
      console.log('Scan error:', error);
      // Reset processing state on error
      isProcessingRef.current = false;
      setScanned(false);
    }
  }, [fetchProduct, productLoading, router]);

  const handleScanAgain = useCallback(() => {
    // Reset all scan states
    isProcessingRef.current = false;
    lastScannedBarcodeRef.current = null;
    lastScanTimeRef.current = 0;
    setScanned(false);
  }, []);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.permissionText}>Caméra requise</Text>
        <Text style={styles.permissionSubtext}>
          Autorisez l'accès à la caméra pour scanner les produits
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.hint}>
            {productLoading ? 'Chargement...' : 'Placez le code-barres dans le cadre'}
          </Text>
          {scanned && !productLoading && (
            <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.scanAgainText}>Scanner un autre produit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Loading Overlay */}
      {productLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyse du produit...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background },
  permissionText: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  permissionSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  permissionButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 16, paddingVertical: 10 },
  backButtonText: { color: colors.primary, fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: { width: 280, height: 180, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 30 },
  hint: { color: '#FFF', fontSize: 16 },
  scanAgainButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, marginTop: 20 },
  scanAgainText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  closeButton: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 16, marginTop: 16 },
});
