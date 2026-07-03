import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Landmark, QrCode } from 'lucide-react-native';

export const AbhaProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAbhaProfile();
  }, []);

  const fetchAbhaProfile = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/abdm/profile');
      setProfile(res.data);
    } catch (e: any) {
      Alert.alert('Error', 'No active ABHA Health Profile linked to your patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Health Card</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Retrieving credentials...</Text>
        </View>
      ) : profile && profile.abha_number ? (
        <View style={styles.cardContainer}>
          {/* High Fidelity ABHA Card Layout */}
          <View style={styles.abhaCard}>
            <View style={styles.cardTop}>
              <Landmark size={24} color={colors.white} />
              <View style={styles.topHeaders}>
                <Text style={styles.govtHeader}>AYUSHMAN BHARAT DIGITAL MISSION</Text>
                <Text style={styles.cardTypeHeader}>ABHA Health ID Card</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.detailsCol}>
                <Text style={styles.cardLabel}>Patient Full Name</Text>
                <Text style={styles.cardValName}>{profile.name}</Text>

                <Text style={styles.cardLabel}>ABHA Number</Text>
                <Text style={styles.cardValNumber}>{profile.abha_number}</Text>

                <Text style={styles.cardLabel}>PHR Address</Text>
                <Text style={styles.cardValAddress}>{profile.abha_address || 'Not Registered'}</Text>
                
                <View style={styles.demogRow}>
                  <View style={{ marginRight: 24 }}>
                    <Text style={styles.cardLabel}>Gender</Text>
                    <Text style={styles.cardValText}>{profile.gender}</Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>Date of Birth</Text>
                    <Text style={styles.cardValText}>
                      {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.qrCol}>
                <View style={styles.qrBox}>
                  <QrCode size={64} color={colors.primary} />
                </View>
                <Text style={styles.qrText}>Verified ABDM</Text>
              </View>
            </View>
          </View>
          <Text style={styles.disclaimerText}>
            This digital credential can be scanned at any partner ABDM provider facility to share clinical records securely.
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <QrCode size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No linked ABHA health records found.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 12,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  cardContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  abhaCard: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
  },
  topHeaders: {
    marginLeft: 12,
  },
  govtHeader: {
    fontSize: 9,
    color: '#93c5fd',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTypeHeader: {
    fontSize: 13,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e3a8a',
  },
  detailsCol: {
    flex: 1,
  },
  qrCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  qrBox: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 8,
  },
  qrText: {
    fontSize: 8,
    color: '#93c5fd',
    fontWeight: 'bold',
    marginTop: 6,
  },
  cardLabel: {
    fontSize: 8,
    color: '#93c5fd',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  cardValName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 1,
  },
  cardValNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  cardValAddress: {
    fontSize: 10,
    color: '#dbeafe',
    marginTop: 1,
  },
  demogRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  cardValText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 1,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
