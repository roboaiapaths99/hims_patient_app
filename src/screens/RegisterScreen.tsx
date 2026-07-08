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

  // ABDM / ABHA identity verification state
  const [verificationMethod, setVerificationMethod] = useState<'abha' | 'gov_id'>('abha');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaTxnId, setAbhaTxnId] = useState('');
  const [isAbhaOtpSent, setIsAbhaOtpSent] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [abhaError, setAbhaError] = useState<string | null>(null);
  const [abhaSuccess, setAbhaSuccess] = useState<string | null>(null);

  // Alternative Government ID states
  const [govIdType, setGovIdType] = useState<'PAN' | 'VOTER_ID' | 'DRIVING_LICENSE' | 'AADHAAR'>('PAN');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [govIdDocUrl, setGovIdDocUrl] = useState('');
  const [isGovIdVerified, setIsGovIdVerified] = useState(false);
  const [govIdLoading, setGovIdLoading] = useState(false);
  const [govIdError, setGovIdError] = useState<string | null>(null);
  const [govIdSuccess, setGovIdSuccess] = useState<string | null>(null);

  // Aadhaar OTP states
  const [aadhaarRefId, setAadhaarRefId] = useState('');
  const [isAadhaarOtpSent, setIsAadhaarOtpSent] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState('');

  // Hospital Dropdown list states
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setIsLoadingHospitals(true);
    try {
      const res = await apiClient.get('/api/auth/public/hospitals');
      setHospitals(res.data);
      if (!res.data || res.data.length === 0) {
        setError('No hospitals found. Please contact support.');
      }
    } catch (err: any) {
      console.warn('Failed to load active hospitals', err);
      setError('Unable to load hospital directory. Please check your network connection and try again.');
    } finally {
      setIsLoadingHospitals(false);
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

  const handleSendAbhaOtp = async () => {
    if (!abhaNumber || abhaNumber.replace(/-/g, '').length !== 14) {
      setAbhaError('Please enter a valid 14-digit ABHA number.');
      return;
    }
    setAbhaLoading(true);
    setAbhaError(null);
    setAbhaSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/abdm/verify', {
        abha_number: abhaNumber
      });
      setAbhaTxnId(res.data.transaction_id);
      setIsAbhaOtpSent(true);
      setAbhaSuccess(res.data.message || 'OTP verification code sent.');
    } catch (err: any) {
      console.warn(err);
      setAbhaError(err.response?.data?.detail || 'Failed to dispatch verification code.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleVerifyAbhaOtp = async () => {
    if (!abhaOtp || abhaOtp.length !== 6) {
      setAbhaError('Please enter a 6-digit verification code.');
      return;
    }
    setAbhaLoading(true);
    setAbhaError(null);
    try {
      const res = await apiClient.post('/api/auth/public/abdm/confirm', {
        abha_number: abhaNumber,
        otp: abhaOtp,
        transaction_id: abhaTxnId
      });
      
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      setPhone(details.phone);
      setDob(details.dob);
      setGender(details.gender);
      setAddress(details.address);
      setAbhaAddress(details.abha_address);
      
      setIsIdentityVerified(true);
      setIsAbhaOtpSent(false);
      setAbhaSuccess('Aadhaar identity verified! Legal name, DOB, and Mobile are synced and locked.');
    } catch (err: any) {
      console.warn(err);
      setAbhaError(err.response?.data?.detail || 'Invalid verification OTP code.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    const cleanAadhaar = govIdNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      setGovIdError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/aadhaar/send-otp', {
        aadhaar_number: cleanAadhaar
      });
      setAadhaarRefId(res.data.ref_id);
      setIsAadhaarOtpSent(true);
      setGovIdSuccess('Verification OTP sent to Aadhaar-registered mobile.');
    } catch (err: any) {
      console.warn(err);
      setGovIdError(err.response?.data?.detail || 'Failed to dispatch Aadhaar OTP.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length !== 6) {
      setGovIdError('Please enter a valid 6-digit OTP.');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    try {
      const res = await apiClient.post('/api/auth/public/aadhaar/verify-otp', {
        otp: aadhaarOtp,
        ref_id: aadhaarRefId
      });
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      if (details.phone) setPhone(details.phone);
      if (details.dob) setDob(details.dob);
      if (details.gender) setGender(details.gender);
      if (details.address) setAddress(details.address);
      setIsGovIdVerified(true);
      setIsAadhaarOtpSent(false);
      setGovIdSuccess('Aadhaar identity verified successfully.');
    } catch (err: any) {
      console.warn(err);
      setGovIdError(err.response?.data?.detail || 'Invalid Aadhaar OTP code.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleVerifyGovId = async () => {
    if (!govIdNumber) {
      setGovIdError('Please enter your Government ID number.');
      return;
    }
    if (!firstName) {
      setGovIdError('Please enter your First Name before verifying (used to match registry details).');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const typedName = `${firstName} ${lastName}`.trim();
      const res = await apiClient.post('/api/auth/public/govt-id/verify', {
        id_type: govIdType,
        id_number: govIdNumber,
        legal_name: typedName
      });
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      if (details.dob) setDob(details.dob);
      if (details.gender) setGender(details.gender);
      if (details.address) setAddress(details.address);
      setIsGovIdVerified(true);
      setGovIdSuccess(`${govIdType} registry record matched and verified successfully!`);
    } catch (err: any) {
      console.warn(err);
      setGovIdError(err.response?.data?.detail || 'Failed to verify Government ID registry record.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleUploadGovIdDoc = async (fileData: any) => {
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', fileData);
      } else {
        formData.append('file', {
          uri: fileData.uri,
          name: fileData.name,
          type: fileData.type
        } as any);
      }
      
      const res = await apiClient.post('/api/auth/public/upload-license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGovIdDocUrl(res.data.url);
      setGovIdSuccess('Government ID copy uploaded successfully.');
    } catch (err: any) {
      console.warn(err);
      setGovIdError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const triggerFilePicker = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          handleUploadGovIdDoc(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Upload Government ID Copy',
        'Simulate ID document scan & upload?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upload Scan', 
            onPress: () => {
              handleUploadGovIdDoc({
                uri: 'file://mock_gov_id_scan.png',
                name: 'mock_gov_id_scan.png',
                type: 'image/png'
              });
            } 
          }
        ]
      );
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

    if (verificationMethod === 'abha' && !isIdentityVerified) {
      setError('Please complete the Aadhaar ABHA OTP identity verification.');
      return;
    }

    if (verificationMethod === 'gov_id' && !isGovIdVerified) {
      setError('Please verify your alternative Government ID registry record.');
      return;
    }

    if (verificationMethod === 'gov_id' && !govIdDocUrl) {
      setError('Please upload a copy of your Government ID document.');
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
        branch_id: selectedBranch.id,
        abha_number: verificationMethod === 'abha' ? (abhaNumber || null) : null,
        abha_address: verificationMethod === 'abha' ? (abhaAddress || null) : null,
        govt_id_type: verificationMethod === 'gov_id' ? govIdType : null,
        govt_id_number: verificationMethod === 'gov_id' ? govIdNumber : null,
        govt_id_document_url: verificationMethod === 'gov_id' ? govIdDocUrl : null,
        consent_signed: isIdentityVerified || isGovIdVerified
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
          {isLoadingHospitals ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Loading hospitals...</Text>
            </View>
          ) : (
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
          )}

          {!isLoadingHospitals && (showHospitalDropdown && filteredHospitals.length > 0 ? (
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
          ) : (hospitalQuery.trim() && showHospitalDropdown && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No hospitals found matching "{hospitalQuery}"</Text>
            </View>
          )))}

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

          {/* Verification Method Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                verificationMethod === 'abha' && styles.tabButtonActive
              ]}
              onPress={() => {
                setVerificationMethod('abha');
                setIsIdentityVerified(false);
                setIsGovIdVerified(false);
                setAbhaError(null);
                setGovIdError(null);
              }}
            >
              <Text style={[
                styles.tabButtonText,
                verificationMethod === 'abha' && styles.tabButtonTextActive
              ]}>ABHA ID Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                verificationMethod === 'gov_id' && styles.tabButtonActive
              ]}
              onPress={() => {
                setVerificationMethod('gov_id');
                setIsIdentityVerified(false);
                setIsGovIdVerified(false);
                setAbhaError(null);
                setGovIdError(null);
              }}
            >
              <Text style={[
                styles.tabButtonText,
                verificationMethod === 'gov_id' && styles.tabButtonTextActive
              ]}>Alternative Govt ID</Text>
            </TouchableOpacity>
          </View>

          {/* ABHA ID Section */}
          {verificationMethod === 'abha' && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationHeader}>
                <ShieldCheck size={18} color={colors.accent} />
                <Text style={styles.verificationTitle}>Option A: Link ABDM ABHA ID</Text>
                {isIdentityVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>KYC Verified</Text>
                  </View>
                )}
              </View>

              {abhaError && <Text style={styles.verifErrorText}>{abhaError}</Text>}
              {abhaSuccess && <Text style={styles.verifSuccessText}>{abhaSuccess}</Text>}

              {!isIdentityVerified ? (
                <View style={styles.verificationBody}>
                  <View style={styles.rowInlineInput}>
                    <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="14-Digit ABHA (e.g. 91-1234-5678-9012)"
                        placeholderTextColor={colors.textMuted}
                        value={abhaNumber}
                        onChangeText={setAbhaNumber}
                        editable={!isAbhaOtpSent}
                      />
                    </View>
                    {!isAbhaOtpSent && (
                      <TouchableOpacity
                        style={[styles.smallButton, abhaLoading && { opacity: 0.7 }]}
                        onPress={handleSendAbhaOtp}
                        disabled={abhaLoading}
                      >
                        {abhaLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.smallButtonText}>Send OTP</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {isAbhaOtpSent && (
                    <View style={[styles.rowInlineInput, { marginTop: 10 }]}>
                      <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                        <TextInput
                          style={styles.input}
                          placeholder="6-Digit OTP Code"
                          placeholderTextColor={colors.textMuted}
                          value={abhaOtp}
                          onChangeText={setAbhaOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.smallButton, abhaLoading && { opacity: 0.7 }]}
                        onPress={handleVerifyAbhaOtp}
                        disabled={abhaLoading}
                      >
                        {abhaLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.smallButtonText}>Verify OTP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.verifMetaText}>Linked: {abhaAddress || abhaNumber}</Text>
              )}
            </View>
          )}

          {/* Govt ID Section */}
          {verificationMethod === 'gov_id' && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationHeader}>
                <ShieldCheck size={18} color={colors.accent} />
                <Text style={styles.verificationTitle}>Option B: Government ID</Text>
                {isGovIdVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
              </View>

              {govIdError && <Text style={styles.verifErrorText}>{govIdError}</Text>}
              {govIdSuccess && <Text style={styles.verifSuccessText}>{govIdSuccess}</Text>}

              {!isGovIdVerified ? (
                <View style={styles.verificationBody}>
                  {/* ID Type Selector */}
                  <View style={styles.idTypeRow}>
                    {['PAN', 'VOTER_ID', 'DRIVING_LICENSE', 'AADHAAR'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.idTypeTag,
                          govIdType === type && styles.idTypeTagSelected
                        ]}
                        onPress={() => {
                          setGovIdType(type as any);
                          setIsAadhaarOtpSent(false);
                          setGovIdError(null);
                          setGovIdSuccess(null);
                        }}
                      >
                        <Text style={[
                          styles.idTypeTagText,
                          govIdType === type && styles.idTypeTagTextSelected
                        ]}>{type === 'DRIVING_LICENSE' ? 'DL' : type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.rowInlineInput}>
                    <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder={govIdType === 'AADHAAR' ? '12-Digit Aadhaar' : `${govIdType} Number`}
                        placeholderTextColor={colors.textMuted}
                        value={govIdNumber}
                        onChangeText={setGovIdNumber}
                        editable={!isAadhaarOtpSent}
                      />
                    </View>
                    {govIdType === 'AADHAAR' && !isAadhaarOtpSent && (
                      <TouchableOpacity
                        style={[styles.smallButton, govIdLoading && { opacity: 0.7 }]}
                        onPress={handleSendAadhaarOtp}
                        disabled={govIdLoading}
                      >
                        {govIdLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.smallButtonText}>Send OTP</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {govIdType !== 'AADHAAR' && (
                      <TouchableOpacity
                        style={[styles.smallButton, govIdLoading && { opacity: 0.7 }]}
                        onPress={handleVerifyGovId}
                        disabled={govIdLoading}
                      >
                        {govIdLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.smallButtonText}>Verify</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {isAadhaarOtpSent && (
                    <View style={[styles.rowInlineInput, { marginTop: 10 }]}>
                      <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                        <TextInput
                          style={styles.input}
                          placeholder="6-Digit Aadhaar OTP"
                          placeholderTextColor={colors.textMuted}
                          value={aadhaarOtp}
                          onChangeText={setAadhaarOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.smallButton, govIdLoading && { opacity: 0.7 }]}
                        onPress={handleVerifyAadhaarOtp}
                        disabled={govIdLoading}
                      >
                        {govIdLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.smallButtonText}>Verify OTP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.verifMetaText}>Verified ID: {govIdNumber} ({govIdType})</Text>
              )}

              {/* Upload Document Section */}
              <View style={styles.uploadDocSection}>
                <Text style={styles.uploadDocLabel}>Upload Government ID Copy *</Text>
                {govIdDocUrl ? (
                  <View style={styles.uploadedDocRow}>
                    <ShieldCheck size={16} color={colors.success} />
                    <Text style={styles.uploadedDocText} numberOfLines={1}>Document uploaded successfully</Text>
                    <TouchableOpacity
                      onPress={() => setGovIdDocUrl('')}
                      style={styles.clearDocBtn}
                    >
                      <Text style={styles.clearDocText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadButton, govIdLoading && { opacity: 0.7 }]}
                    onPress={triggerFilePicker}
                    disabled={govIdLoading}
                  >
                    {govIdLoading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text style={styles.uploadButtonText}>Select & Upload Document</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <Text style={styles.sectionHeader}>Personal Information</Text>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={[styles.input, (isIdentityVerified || isGovIdVerified) && { backgroundColor: '#f1f5f9' }]}
              placeholder="First Name *"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
              editable={!(isIdentityVerified || isGovIdVerified)}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <User size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={[styles.input, (isIdentityVerified || isGovIdVerified) && { backgroundColor: '#f1f5f9' }]}
              placeholder="Last Name *"
              placeholderTextColor={colors.textMuted}
              value={lastName}
              onChangeText={setLastName}
              editable={!(isIdentityVerified || isGovIdVerified)}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Phone size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={[styles.input, (isIdentityVerified || isGovIdVerified) && { backgroundColor: '#f1f5f9' }]}
              placeholder="10-digit Mobile Number *"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              editable={!(isIdentityVerified || isGovIdVerified)}
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
              style={[styles.input, (isIdentityVerified || isGovIdVerified) && { backgroundColor: '#f1f5f9' }]}
              placeholder="Date of Birth (YYYY-MM-DD) *"
              placeholderTextColor={colors.textMuted}
              value={dob}
              onChangeText={setDob}
              editable={!(isIdentityVerified || isGovIdVerified)}
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
                  gender === g && styles.genderTagSelected,
                  (isIdentityVerified || isGovIdVerified) && { opacity: 0.8 }
                ]}
                onPress={() => {
                  if (!(isIdentityVerified || isGovIdVerified)) {
                    setGender(g);
                  }
                }}
                disabled={isIdentityVerified || isGovIdVerified}
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
              style={[styles.input, (isIdentityVerified || isGovIdVerified) && { backgroundColor: '#f1f5f9' }]}
              placeholder="Residential Address *"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
              editable={!(isIdentityVerified || isGovIdVerified)}
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 14,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: colors.secondary,
  },
  noResultsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: -10,
    marginBottom: 14,
  },
  noResultsText: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  verificationCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 6,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#d1fae5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    textTransform: 'uppercase',
  },
  verificationBody: {
    marginTop: 4,
  },
  rowInlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  verifMetaText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
    marginTop: 6,
  },
  verifErrorText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  verifSuccessText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  idTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  idTypeTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  idTypeTagSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  idTypeTagText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  idTypeTagTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  uploadDocSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  uploadDocLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  uploadedDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  uploadedDocText: {
    fontSize: 11,
    color: '#065f46',
    flex: 1,
  },
  clearDocBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  clearDocText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
  },
  uploadButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  }
});

export default RegisterScreen;
