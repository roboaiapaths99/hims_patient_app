import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { ShieldCheck, Phone, KeyRound } from 'lucide-react-native';
import apiClient from '../api/client';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/patient/send-otp', { phone });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otp || otp.length < 4) {
      setError('Please enter a valid verification code.');
      return;
    }
    setIsLoading(true);
    try {
      await login(phone, otp);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate phone number.');
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
          <ShieldCheck size={50} color={colors.accent} />
          <Text style={styles.title}>Private Telehealth Portal</Text>
          <Text style={styles.subtitle}>SaaS Multi-Branch Hospital Information System</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{otpSent ? 'Enter Code' : 'Patient Registration / Sign In'}</Text>
          <Text style={styles.cardInfo}>
            {otpSent 
              ? 'Please enter the verification code sent to your mobile.' 
              : 'Enter your registered mobile phone number to log in or register a telehealth session.'
            }
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {!otpSent ? (
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Phone size={18} color={colors.secondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                maxLength={10}
              />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <KeyRound size={18} color={colors.secondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={otp}
                onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                maxLength={6}
              />
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : (
            <TouchableOpacity 
              style={styles.button}
              onPress={otpSent ? handleVerifyOtp : handleSendOtp}
            >
              <Text style={styles.buttonText}>{otpSent ? 'Verify OTP' : 'Request OTP Code'}</Text>
            </TouchableOpacity>
          )}

          {otpSent && !isLoading && (
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {
                setOtpSent(false);
                setOtp('');
                setError(null);
              }}
            >
              <Text style={styles.linkButtonText}>Change Mobile Number</Text>
            </TouchableOpacity>
          )}

          {!otpSent && !isLoading && (
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkButtonText}>Register a New Profile</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.footerNote}>Protected by end-to-end cloud database encryption.</Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 16,
    fontSize: 14,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkButtonText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 40,
  }
});
export default LoginScreen;
