import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, Platform
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Truck, CheckCircle2, Navigation, Phone, Info } from 'lucide-react-native';

export const AmbulanceRequestScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation();
  
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  const fetchActiveBookings = async () => {
    setIsLoadingList(true);
    try {
      const res = await apiClient.get('/api/emergency/ambulance');
      // Filter bookings for this patient
      const filtered = res.data.filter((b: any) => 
        b.patient_phone === patient?.phone || b.patient_name === `${patient?.first_name} ${patient?.last_name}`
      );
      setActiveBookings(filtered);
    } catch (e: any) {
      console.warn('Failed to fetch active ambulance bookings', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleRequestAmbulance = async () => {
    if (!pickupAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter a complete pickup address.');
      return;
    }
    if (!patient) return;

    setIsRequesting(true);
    try {
      await apiClient.post('/api/emergency/ambulance/book', {
        driver_name: null,
        vehicle_number: null,
        pickup_address: pickupAddress,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phone: patient.phone,
        notes: notes.trim() || null
      });

      Alert.alert('Ambulance Requested', 'An ambulance request has been sent. The control room will dispatch a driver immediately.');
      setPickupAddress('');
      setNotes('');
      fetchActiveBookings();
    } catch (e: any) {
      Alert.alert('Request Failed', e.response?.data?.detail || 'Failed to request ambulance. Please contact support.');
    } finally {
      setIsRequesting(false);
    }
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'dispatched': return styles.statusDispatched;
        case 'arrived': return styles.statusArrived;
        case 'en_route_hospital': return styles.statusEnRoute;
        case 'completed': return styles.statusCompleted;
        default: return styles.statusDefault;
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'dispatched': return 'Driver Dispatched';
        case 'arrived': return 'Driver Arrived at Location';
        case 'en_route_hospital': return 'Heading to Hospital';
        case 'completed': return 'Trip Completed';
        default: return status.toUpperCase();
      }
    };

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <Truck size={20} color={colors.accent} />
          <Text style={styles.vehicleNo}>
            {item.vehicle_number ? `Vehicle: ${item.vehicle_number}` : 'Assigning Vehicle...'}
          </Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.addressText}><Navigation size={12} color={colors.textMuted} /> Pickup: {item.pickup_address}</Text>
          {item.driver_name && (
            <Text style={styles.driverText}><Info size={12} color={colors.textMuted} /> Assigned Driver: {item.driver_name}</Text>
          )}
          {item.notes && <Text style={styles.notesText}>Notes: "{item.notes}"</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ambulance Dispatch Support</Text>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Request Emergency Pickup</Text>
          
          <Text style={styles.label}>Pickup Location Address *</Text>
          <TextInput
            placeholder="Enter full home address or landmark..."
            placeholderTextColor={colors.textMuted}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Triage Details / Special Instructions (Optional)</Text>
          <TextInput
            placeholder="e.g. Chest pain, difficulty breathing, stretcher required..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            style={styles.input}
          />

          {isRequesting ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : (
            <TouchableOpacity 
              style={styles.button}
              onPress={handleRequestAmbulance}
            >
              <Text style={styles.buttonText}>Book Ambulance Now</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={fetchActiveBookings} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {isLoadingList ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
          ) : activeBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={35} color={colors.secondary} />
              <Text style={styles.emptyText}>No active ambulance bookings found for your phone number.</Text>
            </View>
          ) : (
            <FlatList
              data={activeBookings}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  loader: {
    marginVertical: 16,
  },
  listSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  vehicleNo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
  statusDispatched: {
    backgroundColor: colors.secondary,
  },
  statusArrived: {
    backgroundColor: colors.accent,
  },
  statusEnRoute: {
    backgroundColor: '#f59e0b',
  },
  statusCompleted: {
    backgroundColor: colors.success || '#10b981',
  },
  statusDefault: {
    backgroundColor: colors.textMuted,
  },
  cardBody: {
    paddingTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 16,
  },
  driverText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  }
});
export default AmbulanceRequestScreen;
