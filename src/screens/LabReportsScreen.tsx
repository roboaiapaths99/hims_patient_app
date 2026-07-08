import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, FlatList, Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText, Activity, AlertTriangle, CheckCircle, Eye } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LabReportsScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchLabReports();
  }, []);

  const fetchLabReports = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/labs/results/patient');
      setOrders(res.data);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to retrieve laboratory reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = async (order: any) => {
    setSelectedOrder(order);
    setIsLoadingResults(true);
    try {
      const res = await apiClient.get(`/api/labs/orders/${order.id}/results`);
      setResults(res.data);
    } catch (e: any) {
      Alert.alert('Error', 'Results are still pending or not uploaded yet.');
      setSelectedOrder(null);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!selectedOrder) return;
    try {
      const token = await AsyncStorage.getItem('hmis_token');
      const url = `${apiClient.defaults.baseURL}/api/labs/results/patient/${selectedOrder.id}/pdf?token=${token}`;
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
        <Text style={styles.headerTitle}>Laboratory Reports</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No laboratory reports found.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>{item.order_number || `LAB-${item.id.slice(-8).toUpperCase()}`}</Text>
                <Text style={[
                  styles.statusTag, 
                  { 
                    backgroundColor: item.status === 'result_entered' ? '#ecfdf5' : '#fff7ed',
                    color: item.status === 'result_entered' ? '#059669' : '#d97706' 
                  }
                ]}>
                  {item.status === 'result_entered' ? 'COMPLETED' : item.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardText}>Doctor: {item.doctor_name || 'Clinic Specialist'}</Text>
              <Text style={styles.cardText}>Ordered: {new Date(item.created_at).toLocaleDateString()}</Text>
              
              <View style={styles.testsList}>
                {item.items?.map((test: any, idx: number) => (
                  <Text key={idx} style={styles.testItem}>• {test.test_name}</Text>
                ))}
              </View>

              {item.status === 'result_entered' && (
                <TouchableOpacity 
                  style={styles.viewBtn} 
                  onPress={() => handleViewResults(item)}
                >
                  <Text style={styles.viewBtnText}>View Clinical Values</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* Results Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lab Investigation Results</Text>
              <TouchableOpacity onPress={() => { setSelectedOrder(null); setResults(null); }}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            {isLoadingResults ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : results ? (
              <ScrollView style={styles.resultsScroll}>
                {results.results?.map((r: any, idx: number) => (
                  <View key={idx} style={styles.resultRow}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.testName}>{r.test_name}</Text>
                      <Text style={styles.normalRange}>Normal: {r.normal_range} {r.unit}</Text>
                    </View>
                    <View style={styles.resultValueCol}>
                      <Text style={[styles.resultValue, r.abnormal_flag && styles.abnormalText]}>
                        {r.result_value} {r.unit}
                      </Text>
                      {r.abnormal_flag && (
                        <View style={styles.alertBadge}>
                          <AlertTriangle size={10} color={colors.danger} />
                          <Text style={styles.alertText}>ABNORMAL</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {results.pdf_url && (
                  <TouchableOpacity style={styles.pdfSection} onPress={handleOpenPdf}>
                    <Eye size={16} color={colors.success} />
                    <Text style={styles.pdfText}>View Signed PDF Report</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : (
              <Text style={styles.errorText}>Failed to load details.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* PDF Viewer Modal */}
      <Modal
        visible={pdfViewerUrl !== null}
        animationType="slide"
        onRequestClose={() => setPdfViewerUrl(null)}
      >
        <View style={styles.pdfModalHeader}>
          <Text style={styles.pdfModalTitle}>Report PDF Viewer</Text>
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
  orderNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  testsList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  testItem: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  closeBtnText: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalCenter: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsScroll: {
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  normalRange: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  resultValueCol: {
    alignItems: 'flex-end',
  },
  resultValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.success,
  },
  abnormalText: {
    color: colors.danger,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  alertText: {
    fontSize: 8,
    color: colors.danger,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  pdfSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  pdfText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    color: colors.danger,
    marginTop: 20,
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
