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

  // Wizard Steps: 1 = Hospital/Branch, 2 = Department, 3 = Doctor, 4 = Time Slot & Reason
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded Options
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Selected parameters
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  
  // Search parameters
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  
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
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/auth/public/hospitals');
      setHospitals(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch hospital listing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHospitalSearch = (text: string) => {
    setHospitalQuery(text);
    setSelectedHospital(null);
    setSelectedBranch(null);
    if (!text.trim()) {
      setFilteredHospitals([]);
      setShowHospitalDropdown(false);
      return;
    }
    const filtered = hospitals.filter(h => 
      h.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredHospitals(filtered);
    setShowHospitalDropdown(true);
  };

  const handleSelectHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setHospitalQuery(hospital.name);
    setShowHospitalDropdown(false);
  };

  const handleSelectBranch = async (branch: any) => {
    setSelectedBranch(branch);
    setIsLoading(true);
    setError(null);
    try {
      // Load departments for this selected hospital tenant
      const deptRes = await apiClient.get('/api/config/departments', {
        params: { tenant_id: selectedHospital.id }
      });
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setStep(4);
  };

  const handleBookAppointment = async () => {
    if (!selectedTime || !reason.trim() || !patient || !selectedHospital || !selectedBranch) {
      Alert.alert('Incomplete Form', 'Please complete all details.');
      return;
    }

    setIsLoading(true);
    setError(null);

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
      reason: reason.trim(),
      tenant_id: selectedHospital.id,
      branch_id: selectedBranch.id
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

          {/* STEP 1: Search Hospital & Select Branch */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepInfo}>Search and select a hospital first, then choose a branch facility.</Text>
              
              {/* Hospital Search Input */}
              <View style={styles.searchBox}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type to search hospitals..."
                  placeholderTextColor={colors.textMuted}
                  value={hospitalQuery}
                  onChangeText={handleHospitalSearch}
                />
              </View>

              {/* Hospital Selection Dropdown */}
              {showHospitalDropdown && filteredHospitals.length > 0 && (
                <View style={styles.dropdown}>
                  {filteredHospitals.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectHospital(item)}
                    >
                      <Text style={styles.dropdownText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Hospital Display and Branch List */}
              {selectedHospital && (
                <View style={styles.branchListContainer}>
                  <Text style={styles.selectedHospitalLabel}>Branches of {selectedHospital.name}:</Text>
                  {selectedHospital.branches && selectedHospital.branches.length > 0 ? (
                    selectedHospital.branches.map((item: any) => (
                      <TouchableOpacity 
                        key={item.id}
                        style={styles.selectCard}
                        onPress={() => handleSelectBranch(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardMainText}>{item.name}</Text>
                          <Text style={styles.cardSubText}>Branch Code: {item.code}</Text>
                        </View>
                        <ChevronRight size={18} color={colors.secondary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No registered branches for this hospital.</Text>
                  )}
                </View>
              )}
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
  },
  searchBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    maxHeight: 150,
    marginBottom: 15,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownText: {
    fontSize: 13,
    color: colors.text,
  },
  branchListContainer: {
    marginTop: 10,
  },
  selectedHospitalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  }
});
export default BookAppointmentScreen;
