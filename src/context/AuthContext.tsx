import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { registerForPushNotificationsAsync } from '../utils/notifications';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  phone: string;
  tenant_id: string;
  branch_id: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  patient: Patient | null;
  login: (phone: string, otp: string) => Promise<void>;
  loginWithData: (token: string, patientData: Patient) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync().catch(err => console.log('Push notification registration failed', err));
    }
  }, [isAuthenticated]);

  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('hmis_token');
      const storedPatient = await AsyncStorage.getItem('hmis_patient_data');
      if (token && storedPatient) {
        setPatient(JSON.parse(storedPatient));
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Failed to load stored auth details', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      const res = await apiClient.post('/api/auth/patient/login-phone', { phone, otp });
      const { access_token, patient: patientData } = res.data;

      await AsyncStorage.setItem('hmis_token', access_token);
      await AsyncStorage.setItem('hmis_patient_data', JSON.stringify(patientData));
      await AsyncStorage.setItem('hmis_current_branch_id', patientData.branch_id);
      await AsyncStorage.setItem('hmis_user_tenant_id', patientData.tenant_id);

      setPatient(patientData);
      setIsAuthenticated(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to authenticate phone number.';
      throw new Error(msg);
    }
  };

  const loginWithData = async (token: string, patientData: Patient) => {
    try {
      await AsyncStorage.setItem('hmis_token', token);
      await AsyncStorage.setItem('hmis_patient_data', JSON.stringify(patientData));
      await AsyncStorage.setItem('hmis_current_branch_id', patientData.branch_id);
      await AsyncStorage.setItem('hmis_user_tenant_id', patientData.tenant_id);

      setPatient(patientData);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to save register login data', e);
      throw new Error('Failed to complete session storage.');
    }
  };

  const logout = async () => {
    try {
      console.log('Clearing auth session...');
      await AsyncStorage.removeItem('hmis_token');
      await AsyncStorage.removeItem('hmis_patient_data');
      await AsyncStorage.removeItem('hmis_current_branch_id');
      await AsyncStorage.removeItem('hmis_user_tenant_id');
      console.log('Auth data cleared, updating state...');
      setPatient(null);
      setIsAuthenticated(false);
      console.log('Logout complete');
    } catch (e) {
      console.error('Failed to clear session details', e);
      throw e; // Re-throw so caller knows there was an error
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, patient, login, loginWithData, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
