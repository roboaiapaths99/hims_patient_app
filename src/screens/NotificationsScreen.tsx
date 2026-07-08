import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, BellOff, CheckCircle } from 'lucide-react-native';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/notifications/me');
      setNotifications(res.data);
    } catch (e: any) {
      console.warn('Failed to retrieve notifications', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.post(`/api/notifications/${id}/read`);
      // Update state locally
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/api/notifications/mark-read', { ids: notifications.map(n => n.id) });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (e) {
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Syncing inbox...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <BellOff size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Your notification inbox is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.accent]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.notiCard, item.is_read && styles.readCard]} 
              onPress={() => !item.is_read && handleMarkAsRead(item.id)}
              disabled={item.is_read}
            >
              <View style={styles.notiIconCol}>
                <View style={[styles.bellBadge, item.is_read && styles.readBell]}>
                  <Bell size={16} color={item.is_read ? colors.secondary : colors.accent} />
                </View>
              </View>
              <View style={styles.notiContent}>
                <Text style={[styles.notiTitle, item.is_read && styles.readText]}>{item.title}</Text>
                <Text style={styles.notiBody}>{item.message}</Text>
                <Text style={styles.notiTime}>{new Date(item.created_at || Date.now()).toLocaleString()}</Text>
              </View>
              {!item.is_read && (
                <TouchableOpacity onPress={() => handleMarkAsRead(item.id)} style={styles.checkBtn}>
                  <CheckCircle size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 16,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  markAllText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 12,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  notiCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  readCard: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    opacity: 0.8,
  },
  notiIconCol: {
    marginRight: 12,
  },
  bellBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readBell: {
    backgroundColor: '#f1f5f9',
  },
  notiContent: {
    flex: 1,
  },
  notiTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  readText: {
    color: colors.secondary,
    fontWeight: 'normal',
  },
  notiBody: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 3,
  },
  notiTime: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 6,
  },
  checkBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default NotificationsScreen;
