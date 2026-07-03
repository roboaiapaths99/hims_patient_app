import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert 
} from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star, HeartHandshake } from 'lucide-react-native';

export const FeedbackScreen: React.FC = () => {
  const { patient } = useAuth();
  const navigation = useNavigation();
  
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!patient) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/portal/feedback', {
        rating,
        comments: comments.trim(),
        patient_id: patient.id
      });

      Alert.alert(
        'Thank You', 
        'Your feedback response has been submitted successfully to our service enhancement team.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Submission Error', 'Failed to dispatch survey feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinic Feedback</Text>
      </View>

      <View style={styles.feedbackCard}>
        <View style={styles.iconBox}>
          <HeartHandshake size={36} color={colors.accent} />
        </View>
        <Text style={styles.welcomeText}>How was your care experience?</Text>
        <Text style={styles.descText}>
          Your feedback helps our clinical administration teams improve hospital workflows and specialist care.
        </Text>

        <Text style={styles.label}>Rate Service Quality</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity key={num} onPress={() => setRating(num)}>
              <Star 
                size={32} 
                color={num <= rating ? colors.warning : colors.border} 
                fill={num <= rating ? colors.warning : 'transparent'}
                style={{ marginHorizontal: 4 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Your Comments (Optional)</Text>
        <TextInput
          placeholder="Share your thoughts on medical care, queue times, and staff consultation..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={comments}
          onChangeText={setComments}
          style={styles.textArea}
        />

        <TouchableOpacity 
          style={[styles.submitBtn, isSubmitting && styles.disabledBtn]} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Patient Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginTop: 24,
    marginBottom: 20,
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
  feedbackCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconBox: {
    backgroundColor: '#f0fdfa',
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  descText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  textArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 20,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
