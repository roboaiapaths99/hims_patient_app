import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || '';
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8002`;
  }
  
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8002';
  }
  return 'http://localhost:8002';
};

const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('hmis_token');
    const branchId = await AsyncStorage.getItem('hmis_current_branch_id');
    const tenantId = await AsyncStorage.getItem('hmis_user_tenant_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (branchId) {
      config.headers['X-Branch-ID'] = branchId;
    }
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
