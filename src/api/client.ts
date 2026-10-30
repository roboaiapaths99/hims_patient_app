import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const PRODUCTION_API_URL = 'https://technulahims.technula.com';
export const PRODUCTION_WEB_URL = 'https://technulahims.technula.com';

export const getBaseUrl = (): string => {
  // 1. Explicit environment variable set at build/runtime
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. Extra config from app.json
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl) {
    return extraUrl;
  }

  // 3. Fallback to production live API URL (never fails on physical release builds)
  return PRODUCTION_API_URL;
};

export const getWebBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return process.env.EXPO_PUBLIC_WEB_URL;
  }
  const extraWebUrl = Constants.expoConfig?.extra?.webUrl;
  if (extraWebUrl) {
    return extraWebUrl;
  }
  return PRODUCTION_WEB_URL;
};

export const API_BASE_URL = getBaseUrl();
export const WEB_BASE_URL = getWebBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
