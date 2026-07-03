import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { User, Phone, Mail, MapPin, Calendar, Heart, ShieldCheck, ArrowLeft, Building } from 'lucide-react-native';
import apiClient from '../api/client';

export const RegisterScreen: React.FC = () => {
  const { loginWithData } = useAuth();
  const navigation = useNavigation<any>();

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState('Male'); // Male, Female, Other
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Hospital Dropdown list states
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const res = await apiClient.get('/api/auth/public/hospitals');
      setHospitals(res.data);
    } catch (err) {
      console.warn('Failed to load active hospitals', err);
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
      h.name.toLowerCase().includes(text.toLowerCase()) ||
      h.subdomain.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredHospitals(filtered);
    setShowHospitalDropdown(true);
  };

  const handleSelectHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setHospitalQuery(hospital.name);
    setShowHospitalDropdown(false);
    
    // Auto-select the first branch if available
    if (hospital.branches && hospital.branches.length > 0) {
      setSelectedBranch(hospital.branches[0]);
    }
  };

  const handleRegister = async () => {
    setError(null);
    if (!firstName || !lastName || !phone || !dob || !address || !emergencyName || !emergencyPhone) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    if (phone.length !== 10 || emergencyPhone.length !== 10) {
      setError('Phone numbers must be exactly 10 digits.');
      return;
    }
    if (!selectedHospital || !selectedBranch) {
      setError('Please select a hospital and branch.');
      return;
    }

    // DOB Pattern validation YYYY-MM-DD
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(dob)) {
      setError('Date of birth must be in YYYY-MM-DD format.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email || null,
        dob: dob,
        gender: gender,
        address: address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        tenant_id: selectedHospital.id,
        branch_id: selectedBranch.id
      };

      const res = await apiClient.post('/api/auth/patient/register', payload);
      const { access_token, patient: patientData } = res.data;
      
      Alert.alert('Registration Successful', `Welcome to ${selectedHospital.name}! Your patient profile has been created.`);
      await loginWithData(access_token, patientData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ShieldCheck size={36} color={colors.accent} />
            <Text style={styles.title}>Register Patient Profile</Text>
            <Text style={styles.subtitle}>Private Digital Telehealth System</Text>
          </View>
        </View>

        <View style={styles.card}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Hospital Search */}
          <Text style={styles.fieldLabel}>Select Hospital Location *</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Building size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search hospital name"
              placeholderTextColor={colors.textMuted}
              value={hospitalQuery}
              onChangeText={handleHospitalSearch}
              onFocus={() => {
                if (!hospitalQuery.trim() && hospitals.length > 0) {
                  setFilteredHospitals(hospitals);
                  setShowHospitalDropdown(true);
                }
              }}
            />
          </View>

          {showHospitalDropdown && filteredHospitals.length > 0 && (
            <View style={styles.dropdownContainer}>
              <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                {filteredHospitals.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectHospital(item)}
                  >
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    <Text style={styles.dropdownItemSub}>{item.subdomain}.hmis.com</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected Hospital Info */}
          {selectedHospital && (
            <View style={styles.hospitalSelectionCard}>
              <Text style={styles.selectedHospText}>Selected: {selectedHospital.name}</Text>
              {selectedHospital.branches && selectedHospital.branches.length > 1 && (
                <View style={styles.branchSelectRow}>
                  <Text style={styles.branchSelectLabel}>Select Branch: </Text>
                  {selectedHospital.branches.map((b: any) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.branchTag,
                        selectedBranch?.id === b.id && styles.branchTagSelected
                      ]}
                      onPress={() => setSelectedBranch(b)}
                    >
                      <Text style={[
                        styles.branchTagText,
                        selectedBranch?.id === b.id && styles.branchTagTextSelected
                      ]}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.sectionHeader}>Personal Information</Text>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              placeholderTextColor={colors.textMuted}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Phone size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="10-digit Mobile Number *"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Mail size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address (Optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* DOB */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Calendar size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Date of Birth (YYYY-MM-DD) *"
              placeholderTextColor={colors.textMuted}
              value={dob}
              onChangeText={setDob}
            />
          </View>

          {/* Gender Selector */}
          <View style={styles.genderContainer}>
            <Text style={styles.genderLabel}>Gender: </Text>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderTag,
                  gender === g && styles.genderTagSelected
                ]}
                onPress={() => setGender(g)}
              >
                <Text style={[
                  styles.genderTagText,
                  gender === g && styles.genderTagTextSelected
                ]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Address */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <MapPin size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Residential Address *"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <Text style={styles.sectionHeader}>Emergency Contact</Text>

          {/* Emergency Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Contact Name *"
              placeholderTextColor={colors.textMuted}
              value={emergencyName}
              onChangeText={setEmergencyName}
            />
          </View>

          {/* Emergency Phone */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Phone size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Contact Mobile Number *"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={emergencyPhone}
              onChangeText={emergencyPhone => setEmergencyPhone(emergencyPhone)}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : (
            <TouchableOpacity 
              style={styles.button}
              onPress={handleRegister}
            >
              <Text style={styles.buttonText}>Create Profile & Log In</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: colors.secondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 14,
  },
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 14,
    fontSize: 13,
    color: colors.text,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginRight: 10,
  },
  genderTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.white,
  },
  genderTagSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderTagText: {
    fontSize: 12,
    color: colors.text,
  },
  genderTagTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: -10,
    marginBottom: 14,
    maxHeight: 150,
    overflow: 'hidden',
  },
  dropdownList: {
    padding: 6,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  dropdownItemSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  hospitalSelectionCard: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  selectedHospText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  branchSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  branchSelectLabel: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '600',
  },
  branchTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99f6e4',
    marginRight: 6,
    backgroundColor: colors.white,
  },
  branchTagSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  branchTagText: {
    fontSize: 10,
    color: '#0f766e',
  },
  branchTagTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loader: {
    marginVertical: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  }
});

export default RegisterScreen;
