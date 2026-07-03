import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import TelehealthScreen from '../screens/TelehealthScreen';
import BillingScreen from '../screens/BillingScreen';
import { LabReportsScreen } from '../screens/LabReportsScreen';
import { PrescriptionsScreen } from '../screens/PrescriptionsScreen';
import { UploadDocumentsScreen } from '../screens/UploadDocumentsScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { AbhaProfileScreen } from '../screens/AbhaProfileScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';


// Icons
import { LayoutDashboard, Receipt } from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main dashboard and billing lists
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.white,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="BillingTab" 
        component={BillingScreen} 
        options={{
          tabBarLabel: 'Billing',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Receipt size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

import { AmbulanceRequestScreen } from '../screens/AmbulanceRequestScreen';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Context will display its own spinner
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
          <Stack.Screen name="Telehealth" component={TelehealthScreen} />
          <Stack.Screen name="LabReports" component={LabReportsScreen} />
          <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
          <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />
          <Stack.Screen name="AbhaProfile" component={AbhaProfileScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
          <Stack.Screen name="AmbulanceRequest" component={AmbulanceRequestScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
export default AppNavigator;
