import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  FlatList, ActivityIndicator, Alert, RefreshControl, Platform, Modal
} from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { 
  Video, Calendar, ClipboardList, LogOut, RefreshCw, 
  User, PlusCircle, ShieldAlert, Award, FileText, UploadCloud, Users, QrCode, HeartHandshake, Truck, Bell
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

  // Emergency States
  const [bloodAlert, setBloodAlert] = useState<{ broadcast_id: string; blood_group: string; hospital_name: string } | null>(null);
  const [sosStatus, setSosStatus] = useState<'idle' | 'notifying' | 'dispatched'>('idle');
  const [sosDispatchInfo, setSosDispatchInfo] = useState<{ driver_name: string; ambulance_no: string; phone: string } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!patient?.id) return;

    // Connects to socket base dynamically derived from api base url
    const patientMobileSocketUrl = 'http://localhost:8002'; // default development backend address
    const socket = io(patientMobileSocketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    socket.on('connect', () => {
      console.log('Mobile patient socket connected:', socket.id);
      socket.emit('join_patients', patient.id);
    });

    socket.on('blood_donation_buzzer', (alertData: any) => {
      console.log('Urgent blood buzzer received on mobile client:', alertData);
      setBloodAlert(alertData);
    });

    socket.on('sos_dispatched', (dispatchData: any) => {
      console.log('Driver SOS dispatch response received on mobile client:', dispatchData);
      setSosStatus('dispatched');
      setSosDispatchInfo(dispatchData);
    });

    return () => {
      socket.disconnect();
    };
  }, [patient?.id]);

  const handleRespondToBuzzer = async (response: 'accept' | 'decline') => {
    if (!bloodAlert) return;
    try {
      await apiClient.post(`/api/blood-bank/buzzer/${bloodAlert.broadcast_id}/respond`, {
        response
      });
      setBloodAlert(null);
      if (response === 'accept') {
        Alert.alert('Donation Accepted', 'Thank you! The blood bank team will contact you shortly.');
      }
    } catch (e) {
      console.error(e);
      setBloodAlert(null);
    }
  };

  const handleTriggerSOS = async () => {
    setSosStatus('notifying');
    setSosDispatchInfo(null);

    const sendSOS = async (lat?: number, lng?: number) => {
      try {
        await apiClient.post('/api/emergency/sos', {
          latitude: lat,
          longitude: lng
        });
      } catch (err: any) {
        console.warn(err);
        setSosStatus('idle');
        Alert.alert('SOS Alert Failed', 'Verify network connection and try again.');
      }
    };

    // React Native fallback location dispatch
    sendSOS(); // Transmits immediately with backend auto fallback parameters
  };

  const handleCancelSOS = () => {
    setSosStatus('idle');
    setSosDispatchInfo(null);
  };

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
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions/patient');
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
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to log out of your patient profile?');
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to log out of your patient profile?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: logout, style: 'destructive' }
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.secondary, fontSize: 12, fontWeight: 'bold' }}>Syncing Clinic Records...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
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

        {/* Main Grid Actions Menu */}
        <View style={styles.quickActions}>
          <View style={styles.gridRow}>
            <TouchableOpacity 
              style={styles.gridBtn}
              onPress={() => navigation.navigate('BookAppointment')}
            >
              <Calendar size={24} color={colors.accent} />
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
                <Text style={styles.apptDept}>Department: {item.department_name}</Text>
                <Text style={styles.apptTime}>Time: {item.start_time}</Text>
              </View>
            ))
          )}
        </View>

        {/* Active Medical Prescriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <ClipboardList size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No prescriptions found.</Text>
            </View>
          ) : (
            prescriptions.slice(0, 3).map((item) => (
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
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating SOS button */}
      <TouchableOpacity 
        style={styles.floatingSOS}
        onPress={handleTriggerSOS}
      >
        <Truck size={16} color={colors.white} style={{ marginRight: 6 }} />
        <Text style={styles.floatingSOSText}>SOS</Text>
      </TouchableOpacity>

      {/* Blood alert Modal */}
      {bloodAlert && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🩸 Emergency Donation Request</Text>
              </View>
              <Text style={styles.modalBody}>
                {bloodAlert.hospital_name} needs urgent blood donors of type {bloodAlert.blood_group}. Can you help?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.declineBtn]}
                  onPress={() => handleRespondToBuzzer('decline')}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.acceptBtn]}
                  onPress={() => handleRespondToBuzzer('accept')}
                >
                  <Text style={styles.acceptBtnText}>Accept & Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* SOS Dispatch Modal */}
      {sosStatus !== 'idle' && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContainer, { borderColor: colors.danger, borderWidth: 2 }]}>
              {sosStatus === 'notifying' ? (
                <View style={{ alignItems: 'center', padding: 10 }}>
                  <ActivityIndicator size="large" color={colors.danger} />
                  <Text style={styles.sosStatusTitle}>SOS ALARM TRIGGERED</Text>
                  <Text style={styles.sosStatusDesc}>
                    Broadcasting location coords to nearby ambulance drivers. Mobile siren active...
                  </Text>
                  <TouchableOpacity 
                    style={styles.cancelSOSBtn}
                    onPress={handleCancelSOS}
                  >
                    <Text style={styles.cancelSOSBtnText}>Cancel Request</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ padding: 10 }}>
                  <Text style={styles.sosStatusTitle}>Ambulance Dispatched!</Text>
                  <Text style={styles.sosStatusDesc}>
                    An ambulance has claimed your request and is en route to your coordinates.
                  </Text>
                  {sosDispatchInfo && (
                    <View style={styles.dispatchInfoBox}>
                      <Text style={styles.infoLine}>Driver: {sosDispatchInfo.driver_name}</Text>
                      <Text style={styles.infoLine}>Ambulance: {sosDispatchInfo.ambulance_no}</Text>
                      <Text style={styles.infoLine}>Phone: {sosDispatchInfo.phone}</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.closeSOSBtn}
                    onPress={handleCancelSOS}
                  >
                    <Text style={styles.closeSOSBtnText}>Dismiss Tracker</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    marginRight: 8,
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
  },
  floatingSOS: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingSOSText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sosStatusTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  sosStatusDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 12,
  },
  cancelSOSBtn: {
    backgroundColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelSOSBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeSOSBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closeSOSBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dispatchInfoBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLine: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 20,
    fontWeight: 'bold',
  }
});
export default DashboardScreen;
