import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Modal 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, UserPlus, Users, Link, X } from 'lucide-react-native';

export const FamilyMembersScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation();
  
  const [relationship, setRelationship] = useState('Child');
  const [linkedId, setLinkedId] = useState('');
  const [family, setFamily] = useState<any[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    if (!patient) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/patients/me/family');
      setFamily(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch patient family list', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkFamily = async () => {
    if (!linkedId.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid Patient ID to link.');
      return;
    }
    if (!patient) return;

    setIsLinking(true);
    try {
      await apiClient.post('/api/patients/me/family', {
        relationship,
        linked_patient_id: linkedId.trim()
      });

      Alert.alert('Success', 'Family member linked successfully.');
      setLinkedId('');
      fetchFamily();
      setIsModalVisible(false);
    } catch (e: any) {
      Alert.alert('Linkage Failed', e.response?.data?.detail || 'Verify the Linked Patient ID is correct.');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Linkage</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <TouchableOpacity 
          style={styles.openModalBtn} 
          onPress={() => setIsModalVisible(true)}
        >
          <UserPlus size={16} color={colors.white} />
          <Text style={styles.openModalBtnText}>Link a Family Profile</Text>
        </TouchableOpacity>

        <Text style={styles.listTitle}>Linked Family Circle</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 20 }} />
        ) : family.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Users size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No linked family members yet.</Text>
          </View>
        ) : (
          family.map((item) => (
            <View key={item.id} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name || 'Anonymous'}</Text>
                <Text style={styles.memberDetail}>
                  Relationship: {item.relationship} | Phone: {item.phone || 'N/A'}
                </Text>
              </View>
              <View style={styles.linkBadge}>
                <Link size={16} color={colors.accent} />
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Link Family Profile Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link a Family Profile</Text>
              <TouchableOpacity 
                style={styles.closeBtnCircle} 
                onPress={() => setIsModalVisible(false)}
              >
                <X size={14} color={colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Family Member's Patient ID</Text>
            <TextInput
              placeholder="Enter MongoDB Patient ID (e.g. 648f98...)"
              placeholderTextColor={colors.textMuted}
              value={linkedId}
              onChangeText={setLinkedId}
              style={styles.modalInput}
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Relationship</Text>
            <View style={styles.relationsSelector}>
              {['Spouse', 'Child', 'Parent', 'Sibling'].map((rel) => (
                <TouchableOpacity 
                  key={rel}
                  style={[styles.relBtn, relationship === rel && styles.activeRelBtn]}
                  onPress={() => setRelationship(rel)}
                >
                  <Text style={[styles.relBtnText, relationship === rel && styles.activeRelBtnText]}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, isLinking && styles.disabledBtn]} 
              onPress={handleLinkFamily}
              disabled={isLinking}
            >
              {isLinking ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <UserPlus size={16} color={colors.white} />
                  <Text style={styles.submitBtnText}>Attach Family Member</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  scroll: {
    flex: 1,
  },
  linkCard: {
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
  relationsSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  relBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  activeRelBtn: {
    borderColor: colors.accent,
    backgroundColor: '#f0fdfa',
  },
  relBtnText: {
    fontSize: 11,
    color: colors.secondary,
  },
  activeRelBtnText: {
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
  listTitle: {
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
  memberRow: {
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
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberDetail: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  linkBadge: {
    marginLeft: 12,
  },
  openModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  openModalBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  closeBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
});
