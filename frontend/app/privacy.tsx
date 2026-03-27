// Privacy Policy Screen
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/styles/colors';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Politique de Confidentialité</Text>
        <Text style={styles.subtitle}>NutriScan</Text>
        <Text style={styles.date}>Dernière mise à jour : Mars 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          NutriScan ("nous", "notre" ou "l'application") s'engage à protéger votre vie privée. 
          Cette politique de confidentialité explique comment nous collectons, utilisons et 
          protégeons vos informations personnelles.
        </Text>

        <Text style={styles.sectionTitle}>2. Données collectées</Text>
        <Text style={styles.paragraph}>
          Nous collectons les types de données suivants :{'\n'}
          • Informations de compte : email, nom d'utilisateur{'\n'}
          • Données d'utilisation : historique des scans, préférences alimentaires{'\n'}
          • Données de l'appareil : accès à la caméra pour scanner les codes-barres
        </Text>

        <Text style={styles.sectionTitle}>3. Utilisation de la caméra</Text>
        <Text style={styles.paragraph}>
          L'application utilise la caméra de votre appareil uniquement pour scanner les 
          codes-barres des produits alimentaires. Aucune image n'est stockée ou transmise 
          à des serveurs externes.
        </Text>

        <Text style={styles.sectionTitle}>4. Utilisation des données</Text>
        <Text style={styles.paragraph}>
          Vos données sont utilisées pour :{'\n'}
          • Fournir les fonctionnalités de l'application{'\n'}
          • Personnaliser votre expérience{'\n'}
          • Améliorer nos services{'\n'}
          • Communiquer avec vous concernant votre compte
        </Text>

        <Text style={styles.sectionTitle}>5. Partage des données</Text>
        <Text style={styles.paragraph}>
          Nous ne vendons pas vos données personnelles. Vos informations peuvent être 
          partagées avec des tiers uniquement pour :{'\n'}
          • Traiter les paiements (Stripe){'\n'}
          • Analyser l'utilisation de l'application{'\n'}
          • Respecter les obligations légales
        </Text>

        <Text style={styles.sectionTitle}>6. Sécurité</Text>
        <Text style={styles.paragraph}>
          Nous utilisons des mesures de sécurité standard de l'industrie pour protéger 
          vos données, notamment le chiffrement SSL/TLS et l'authentification sécurisée.
        </Text>

        <Text style={styles.sectionTitle}>7. Vos droits</Text>
        <Text style={styles.paragraph}>
          Vous avez le droit de :{'\n'}
          • Accéder à vos données personnelles{'\n'}
          • Corriger vos données{'\n'}
          • Supprimer votre compte{'\n'}
          • Exporter vos données
        </Text>

        <Text style={styles.sectionTitle}>8. Contact</Text>
        <Text style={styles.paragraph}>
          Pour toute question concernant cette politique de confidentialité, 
          contactez-nous à : meliraoul67@gmail.com
        </Text>

        <Text style={styles.footer}>
          © 2026 NutriScan. Tous droits réservés.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
