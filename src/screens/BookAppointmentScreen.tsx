import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ArrowLeft, Calendar, Clock, Check } from 'lucide-react-native';

export const BookAppointmentScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation<any>();

  // Wizard Steps: 1 = Branch, 2 = Department, 3 = Doctor, 4 = Time Slot & Reason
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded Options
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Selected parameters
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  
  // Date & Time parameters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  // 15-minute mock slots helper
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/org/branches');
      setBranches(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch hospital branches.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBranch = async (branch: any) => {
    setSelectedBranch(branch);
    setIsLoading(true);
    setError(null);
    try {
      // Load departments
      const deptRes = await apiClient.get('/api/config/departments');
      setDepartments(deptRes.data.filter((d: any) => d.is_active));
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch departments for this branch.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDepartment = async (dept: any) => {
    setSelectedDepartment(dept);
    setIsLoading(true);
    setError(null);
    try {
      // Load doctors for this branch
      const docRes = await apiClient.get('/api/org/users', {
        params: { branch_id: selectedBranch.id }
      });
      // Filter for doctors/surgeons/anesthetists
      const filteredDocs = docRes.data.filter((u: any) => 
        ['doctor', 'surgeon', 'anesthetist'].includes(u.role)
      );
      setDoctors(filteredDocs);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch doctors list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    // Set a default date of tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setStep(4);
  };

  const handleBookAppointment = async () => {
    if (!selectedTime || !reason.trim() || !patient) {
      Alert.alert('Incomplete Form', 'Please select a time slot and enter the reason for consultation.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Compute start and end times
    const startParts = selectedTime.split(':');
    const startMin = parseInt(startParts[1]);
    const startHour = parseInt(startParts[0]);
    let endHour = startHour;
    let endMin = startMin + 30;
    if (endMin >= 60) {
      endMin = 0;
      endHour += 1;
    }
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    const payload = {
      patient_id: patient.id,
      doctor_id: selectedDoctor.id,
      department_id: selectedDepartment.id,
      appointment_date: `${selectedDate}T00:00:00Z`,
      start_time: selectedTime,
      end_time: endTimeStr,
      status: 'scheduled',
      reason: reason.trim()
    };

    try {
      // Submit appointment
      await apiClient.post('/api/appointments', payload);
      Alert.alert(
        'Booking Confirmed', 
        'Your teleconsultation appointment has been scheduled successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit appointment slot.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = () => {
    let title = 'Select Branch';
    if (step === 2) title = 'Select Department';
    if (step === 3) title = 'Select Doctor';
    if (step === 4) title = 'Choose Time Slot';

    return (
      <View style={styles.headerContainer}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Connecting to schedules...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* STEP 1: Select Branch */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepInfo}>Choose the hospital facility branch you wish to consult with.</Text>
              {branches.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.selectCard}
                  onPress={() => handleSelectBranch(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMainText}>{item.name}</Text>
                    <Text style={styles.cardSubText}>{item.address}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 2: Select Specialty Department */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepInfo}>Select the specialized medical department for this case.</Text>
              {departments.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.selectCard}
                  onPress={() => handleSelectDepartment(item)}
                >
                  <Text style={styles.cardMainText}>{item.name}</Text>
                  <ChevronRight size={18} color={colors.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 3: Select Doctor */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepInfo}>Choose a practitioner for your teleconsultation.</Text>
              {doctors.length === 0 ? (
                <Text style={styles.emptyText}>No available consulting doctors in this department.</Text>
              ) : (
                doctors.map(item => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.selectCard}
                    onPress={() => handleSelectDoctor(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardMainText}>Dr. {item.name}</Text>
                      <Text style={styles.cardSubText}>{item.email}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.secondary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* STEP 4: Choose Slot & Reason */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Selected Case Details:</Text>
                <Text style={styles.summaryText}>• Branch: {selectedBranch.name}</Text>
                <Text style={styles.summaryText}>• Department: {selectedDepartment.name}</Text>
                <Text style={styles.summaryText}>• Doctor: Dr. {selectedDoctor.name}</Text>
              </View>

              {/* Date Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Appointment Date</Text>
                <View style={styles.dateSelector}>
                  <Calendar size={18} color={colors.secondary} />
                  <TextInput
                    style={styles.dateInput}
                    value={selectedDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={setSelectedDate}
                  />
                </View>
              </View>

              {/* Time Slots grid */}
              <Text style={styles.inputLabel}>Available Slot</Text>
              <View style={styles.slotsGrid}>
                {timeSlots.map(time => {
                  const isSelected = selectedTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[styles.slotItem, isSelected && styles.slotItemActive]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Clock size={12} color={isSelected ? colors.white : colors.secondary} />
                      <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{time}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Reason for Appointment */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason / Presenting Symptoms</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={3}
                  value={reason}
                  placeholder="Describe details (e.g. follow-up consult, cough and cold)..."
                  placeholderTextColor={colors.textMuted}
                  onChangeText={setReason}
                />
              </View>

              <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
                <Check size={18} color={colors.white} />
                <Text style={styles.bookButtonText}>Confirm Appointment Slot</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    paddingBottom: 40,
  },
  stepInfo: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  selectCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardMainText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
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
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  summaryBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 18,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: colors.text,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 20,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30.5%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: '1.4%',
    marginVertical: 4,
  },
  slotItemActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 4,
  },
  slotTextActive: {
    color: colors.white,
  },
  textArea: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  bookButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  }
});
export default BookAppointmentScreen;
