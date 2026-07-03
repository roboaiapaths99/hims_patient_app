import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  FlatList, ActivityIndicator, Alert, RefreshControl, Platform 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { 
  Video, Calendar, ClipboardList, LogOut, RefreshCw, 
  User, PlusCircle, ShieldAlert, Award, FileText, UploadCloud, Users, QrCode, HeartHandshake, Truck
} from 'lucide-react-native';

export const DashboardScreen: React.FC = () => {
  const { patient, logout } = useAuth();
  const navigation = useNavigation<any>();

  // States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [queueToken, setQueueToken] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!patient) return;
    setIsLoading(true);
    try {
      // 1. Fetch Patient Appointments
      const apptRes = await apiClient.get('/api/appointments', {
        params: { patient_id: patient.id }
      });
      const sortedAppts = apptRes.data.sort((a: any, b: any) => 
        new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      );
      setAppointments(sortedAppts);

      // 2. Fetch Patient Prescription History
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions', {
        params: { patient_id: patient.id }
      });
      setPrescriptions(prescRes.data);

      // 3. Search active queue tokens to check check-in status
      try {
        const queueRes = await apiClient.get('/api/appointments/queue');
        // Find if this patient has a token active today
        const patientToken = queueRes.data.find((t: any) => 
          t.patient_name.toLowerCase().includes(patient.first_name.toLowerCase()) && 
          ['waiting', 'in_vitals', 'ready_for_doctor', 'in_consultation'].includes(t.status)
        );
        setQueueToken(patientToken || null);
      } catch (e) {
        console.warn('Queue data fetch skipped or failed', e);
      }

      // 4. Check if any upcoming appointment has an active telemedicine session
      let activeRoom = null;
      for (const appt of sortedAppts) {
        if (['checked_in', 'waiting', 'in_vitals', 'ready_for_doctor', 'in_consultation'].includes(appt.status)) {
          try {
            const teleRes = await apiClient.get(`/api/telemedicine/sessions/appointment/${appt.id}`);
            if (teleRes.data && teleRes.data.status === 'active') {
              activeRoom = teleRes.data;
              break;
            }
          } catch (e) {
            // Skips if no active session is found for this slot
          }
        }
      }
      setActiveSession(activeRoom);

    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your patient profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: logout, style: 'destructive' }
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading && !isRefreshing) {
    return (
      <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background } as any}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.secondary, fontSize: 12, fontWeight: 'bold' }}>Syncing Clinic Records...</Text>
      </div>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.accent]} />
      }
    >
      {/* Patient Header Summary */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.patientName}>{patient?.first_name} {patient?.last_name}</Text>
          <Text style={styles.mrnText}>MRN: {patient?.mrn}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Dynamic Telehealth Alert Panel */}
      {activeSession && (
        <View style={styles.telehealthAlert}>
          <View style={styles.telehealthHeader}>
            <Video size={20} color={colors.white} />
            <Text style={styles.telehealthTitle}>Live Consultation Active</Text>
          </View>
          <Text style={styles.telehealthInfo}>
            Your doctor has started the secure virtual meeting room. Tap connect below to join immediately.
          </Text>
          <TouchableOpacity 
            style={styles.telehealthButton}
            onPress={() => navigation.navigate('Telehealth', { sessionId: activeSession.id })}
          >
            <Text style={styles.telehealthButtonText}>Join Video Call Room</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Real-time OPD Queue Tracker */}
      {queueToken && (
        <View style={styles.queueCard}>
          <View style={styles.queueHeader}>
            <Award size={18} color={colors.accent} />
            <Text style={styles.queueTitle}>OPD Check-In Token Status</Text>
          </View>
          <View style={styles.queueBody}>
            <View style={styles.queueTokenBadge}>
              <Text style={styles.queueTokenLabel}>TOKEN</Text>
              <Text style={styles.queueTokenNumber}>{queueToken.token_number}</Text>
            </View>
            <View style={styles.queueDetails}>
              <Text style={styles.queueDoctor}>Doctor: {queueToken.doctor_name}</Text>
              <Text style={styles.queueDept}>Dept: {queueToken.department_name}</Text>
              <View style={styles.statusRow}>
                <Text style={styles.queueStatusLabel}>Status: </Text>
                <Text style={[styles.queueStatus, { color: queueToken.status === 'in_consultation' ? colors.accent : colors.success }]}>
                  {queueToken.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Action shortcuts Grid */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Patient Portal Actions</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('BookAppointment')}
          >
            <PlusCircle size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Book Appointment</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('LabReports')}
          >
            <FileText size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Lab Results</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('Prescriptions')}
          >
            <ClipboardList size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Prescriptions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('UploadDocuments')}
          >
            <UploadCloud size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Upload Records</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('FamilyMembers')}
          >
            <Users size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Family Members</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('AbhaProfile')}
          >
            <QrCode size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>ABHA Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('Feedback')}
          >
            <HeartHandshake size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Clinic Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridBtn}
            onPress={() => navigation.navigate('AmbulanceRequest')}
          >
            <Truck size={24} color={colors.accent} />
            <Text style={styles.gridBtnText}>Ambulance Dispatch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduled Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Schedules & Bookings</Text>
        {appointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No appointments booked.</Text>
          </View>
        ) : (
          appointments.map((item) => (
            <View key={item.id} style={styles.apptCard}>
              <View style={styles.apptHeader}>
                <Text style={styles.apptDate}>{formatDate(item.appointment_date)}</Text>
                <Text style={[
                  styles.statusTag, 
                  { 
                    backgroundColor: item.status === 'scheduled' ? '#eff6ff' : '#ecfdf5',
                    color: item.status === 'scheduled' ? '#2563eb' : '#059669' 
                  }
                ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.apptDoctor}>Practitioner: {item.doctor_name}</Text>
              <Text style={styles.apptDept}>Specialty: {item.department_name}</Text>
              <Text style={styles.apptTime}>Time Window: {item.start_time} - {item.end_time}</Text>
            </View>
          ))
        )}
      </View>

      {/* Prescriptions History Ledger */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescription Ledger</Text>
        {prescriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardList size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No prescriptions filed.</Text>
          </View>
        ) : (
          prescriptions.map((item) => (
            <View key={item.id} style={styles.prescriptionCard}>
              <View style={styles.prescriptionHeader}>
                <Text style={styles.prescId}>Rx Order: {item.id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.prescDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.medsList}>
                {item.items?.map((med: any, idx: number) => (
                  <Text key={idx} style={styles.medsItem}>
                    • {med.medicine_name} — {med.dosage} ({med.frequency} | {med.duration})
                  </Text>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  mrnText: {
    fontSize: 10,
    color: colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  telehealthAlert: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  telehealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  telehealthTitle: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  telehealthInfo: {
    color: '#dbeafe',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  telehealthButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  telehealthButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  queueCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  queueBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueTokenBadge: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginRight: 16,
  },
  queueTokenLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.accent,
  },
  queueTokenNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  queueDetails: {
    flex: 1,
  },
  queueDoctor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  queueDept: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  queueStatusLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  queueStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickActions: {
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    width: '48%',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  gridBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  apptCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 10,
  },
  apptDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  apptDoctor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  apptDept: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  apptTime: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
    marginTop: 8,
  },
  prescriptionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 10,
  },
  prescId: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  prescDate: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  medsList: {
    marginTop: 4,
  },
  medsItem: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '500',
  }
});
export default DashboardScreen;
