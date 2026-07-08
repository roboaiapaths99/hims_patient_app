import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  FlatList, ActivityIndicator, Modal, Platform, Alert, RefreshControl 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { colors } from '../theme/colors';
import { WebView } from 'react-native-webview';
import { CreditCard, FileText, X, Check, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BillingScreen: React.FC = () => {
  const { patient } = useAuth();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePaymentUrl, setActivePaymentUrl] = useState<string | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  // Frontend port for checkout WebView
  const FRONTEND_HOST = Platform.select({
    android: 'http://10.0.2.2:5173',
    default: 'http://localhost:5173'
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    if (!patient) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/billing/invoices/patient');
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInvoices();
  };

  const handleOpenCheckout = (invoiceId: string) => {
    // Points to frontend Checkout page
    const checkoutUrl = `${FRONTEND_HOST}/payment/checkout/${invoiceId}`;
    setActivePaymentUrl(checkoutUrl);
  };

  const handleOpenPdf = async (invoiceId: string) => {
    try {
      const token = await AsyncStorage.getItem('hmis_token');
      const url = `${apiClient.defaults.baseURL}/api/billing/invoices/patient/${invoiceId}/pdf?token=${token}`;
      setPdfViewerUrl(url);
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve secure authorization token.');
    }
  };

  // Track redirection changes to close webview on checkout success/failure
  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url;
    if (url.includes('/payment/success')) {
      setActivePaymentUrl(null);
      Alert.alert('Payment Successful', 'Your transaction was completed successfully. Your invoice status is now updated.');
      loadInvoices();
    } else if (url.includes('/payment/failure')) {
      setActivePaymentUrl(null);
      Alert.alert('Payment Failed', 'The transaction was cancelled or declined. Please check details or retry.');
      loadInvoices();
    }
  };

  const renderInvoiceItem = ({ item }: { item: any }) => {
    const isUnpaid = item.payment_status === 'unpaid' || item.payment_status === 'due';
    
    return (
      <View style={styles.invoiceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.invoiceMeta}>
            <FileText size={18} color={colors.secondary} />
            <Text style={styles.invoiceNumber}>{item.invoice_number.split('-').slice(-2).join('-')}</Text>
          </View>
          <Text style={[
            styles.statusTag,
            {
              backgroundColor: item.payment_status === 'paid' ? '#ecfdf5' : '#fee2e2',
              color: item.payment_status === 'paid' ? '#059669' : '#dc2626'
            }
          ]}>
            {item.payment_status.toUpperCase()}
          </Text>
        </View>

        {/* Invoice lines */}
        <View style={styles.itemsList}>
          {item.items?.map((line: any, idx: number) => (
            <View key={idx} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{line.description}</Text>
              <Text style={styles.linePrice}>₹{line.net_amount || line.line_total}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>Grand Total: <Text style={styles.totalAmount}>₹{item.grand_total}</Text></Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.pdfButton, { marginRight: 8 }]}
              onPress={() => handleOpenPdf(item.id)}
            >
              <FileText size={14} color={colors.primary} />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>

            {isUnpaid && (
              <TouchableOpacity 
                style={styles.payButton}
                onPress={() => handleOpenCheckout(item.id)}
              >
                <CreditCard size={14} color={colors.white} />
                <Text style={styles.payButtonText}>Pay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Billing & Invoices</Text>
        <TouchableOpacity onPress={loadInvoices}>
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching billing ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoiceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileText size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No invoices issued in your file.</Text>
            </View>
          }
        />
      )}

      {/* Online Payment Modal */}
      <Modal
        visible={activePaymentUrl !== null}
        animationType="slide"
        onRequestClose={() => setActivePaymentUrl(null)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Secure Checkout Integration</Text>
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={() => setActivePaymentUrl(null)}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          {activePaymentUrl && (
            <WebView
              source={{ uri: activePaymentUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
            />
          )}
        </View>
      </Modal>

      {/* PDF Viewer Modal */}
      <Modal
        visible={pdfViewerUrl !== null}
        animationType="slide"
        onRequestClose={() => setPdfViewerUrl(null)}
      >
        <View style={styles.pdfModalHeader}>
          <Text style={styles.pdfModalTitle}>Invoice PDF Viewer</Text>
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  invoiceCard: {
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  invoiceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusTag: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  itemsList: {
    marginBottom: 14,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  lineDesc: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  linePrice: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  totalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  totalAmount: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  payButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  closeModalButton: {
    padding: 6,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#f8fafc',
  },
  pdfButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 4,
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
export default BillingScreen;
