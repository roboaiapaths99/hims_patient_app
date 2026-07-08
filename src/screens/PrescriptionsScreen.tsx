import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, Modal 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ClipboardList, ShieldCheck, FileText } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PrescriptionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/pharmacy/prescriptions/patient');
      setPrescriptions(res.data);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to retrieve prescriptions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPdf = async (prescId: string) => {
    try {
      const token = await AsyncStorage.getItem('hmis_token');
      const url = `${apiClient.defaults.baseURL}/api/pharmacy/prescriptions/patient/${prescId}/pdf?token=${token}`;
      setPdfViewerUrl(url);
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve secure authorization token.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.center}>
          <ClipboardList size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No prescriptions filed yet.</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.prescId}>Rx Order: {item.id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.prescDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>

              <View style={styles.doctorInfo}>
                <ShieldCheck size={14} color={colors.accent} />
                <Text style={styles.doctorText}>Prescribed by Dr. {item.doctor_name || 'Clinic Consultant'}</Text>
              </View>

              <View style={styles.medsList}>
                {item.items?.map((med: any, idx: number) => (
                  <View key={idx} style={styles.medItem}>
                    <Text style={styles.medName}>• {med.medicine_name}</Text>
                    <Text style={styles.medDetail}>
                      Dosage: {med.dosage} | Frequency: {med.frequency} | Duration: {med.duration}
                    </Text>
                    {med.instructions && (
                      <Text style={styles.medInstruct}>Info: {med.instructions}</Text>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.statusRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.statusLabel}>Status: </Text>
                  <Text style={[
                    styles.statusValue, 
                    { color: item.status === 'dispensed' ? colors.success : colors.warning }
                  ]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.pdfButton}
                  onPress={() => handleOpenPdf(item.id)}
                >
                  <FileText size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={styles.pdfButtonText}>View PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* PDF Viewer Modal */}
      <Modal
        visible={pdfViewerUrl !== null}
        animationType="slide"
        onRequestClose={() => setPdfViewerUrl(null)}
      >
        <View style={styles.pdfModalHeader}>
          <Text style={styles.pdfModalTitle}>Prescription PDF Viewer</Text>
          <TouchableOpacity 
            style={styles.closePdfButton}
            onPress={() => setPdfViewerUrl(null)}
          >
            <Text style={styles.closePdfButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          {pdfViewerUrl && (
            <WebView
              source={{ uri: pdfViewerUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
            />
          )}
        </View>
      </Modal>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  prescDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  doctorText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  medsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  medItem: {
    marginBottom: 10,
  },
  medName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  medDetail: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
    paddingLeft: 10,
  },
  medInstruct: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: '#f5f3ff',
  },
  pdfButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.accent,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pdfModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  closePdfButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  closePdfButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
});
