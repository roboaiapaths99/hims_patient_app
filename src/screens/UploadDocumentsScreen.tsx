import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, UploadCloud, FileText, CheckCircle } from 'lucide-react-native';

export const UploadDocumentsScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation();
  
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Lab Report');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    if (!patient) return;
    setIsLoadingList(true);
    try {
      const res = await apiClient.get('/api/patients/me/documents');
      setDocuments(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch patient documents list', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleUpload = async () => {
    if (!docName.trim()) {
      Alert.alert('Validation Error', 'Please enter a document descriptive name.');
      return;
    }
    if (!patient) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      const mockFile = {
        uri: 'data:text/plain;base64,JVBERi0xLjQKMSAwIG9iagogLi4u', // stub representation
        name: `${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        type: 'application/pdf'
      } as any;
      formData.append('file', mockFile);
      formData.append('document_name', docName);
      formData.append('document_type', docType);

      await apiClient.post('/api/patients/me/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Medical document uploaded and securely attached to your record.');
      setDocName('');
      fetchDocuments();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.detail || 'Connection error.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attach Medical Records</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.uploadCard}>
          <Text style={styles.sectionTitle}>Add New Record</Text>
          
          <Text style={styles.label}>Document Title</Text>
          <TextInput
            placeholder="e.g. Annual Blood Panel, ID Proof"
            placeholderTextColor={colors.textMuted}
            value={docName}
            onChangeText={setDocName}
            style={styles.input}
          />

          <Text style={styles.label}>Category Type</Text>
          <View style={styles.typeSelector}>
            {['Lab Report', 'Prescription', 'ID Proof', 'Other'].map((type) => (
              <TouchableOpacity 
                key={type}
                style={[styles.typeBtn, docType === type && styles.activeTypeBtn]}
                onPress={() => setDocType(type)}
              >
                <Text style={[styles.typeBtnText, docType === type && styles.activeTypeBtnText]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isUploading && styles.disabledBtn]} 
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <UploadCloud size={16} color={colors.white} />
                <Text style={styles.submitBtnText}>Select & Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.historyTitle}>Secure Attached Files</Text>
        {isLoadingList ? (
          <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 20 }} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyCenter}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No documents attached yet.</Text>
          </View>
        ) : (
          documents.map((item) => (
            <View key={item.id} style={styles.docRow}>
              <View style={styles.docInfo}>
                <Text style={styles.docNameText}>{item.document_name}</Text>
                <Text style={styles.docDetailText}>
                  Type: {item.document_type} | Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.okBadge}>
                <CheckCircle size={16} color={colors.success} />
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  uploadCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  typeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  activeTypeBtn: {
    borderColor: colors.accent,
    backgroundColor: '#f0fdfa',
  },
  typeBtnText: {
    fontSize: 11,
    color: colors.secondary,
  },
  activeTypeBtnText: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  emptyCenter: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  docInfo: {
    flex: 1,
  },
  docNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  docDetailText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  okBadge: {
    marginLeft: 12,
  },
});
