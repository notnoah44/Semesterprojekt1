import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function FeedbackScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      Alert.alert('Please select a rating');
      return;
    }
    setIsLoading(true);
    try {
      await supabase.from('app_feedback').insert({ profile_id: user.id, rating, comment });
      Alert.alert('Thank you!', 'Your feedback has been sent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to send feedback');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Send Feedback</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
          How would you rate your experience with PawStay?
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)}>
              <MaterialCommunityIcons
                name={s <= rating ? 'star' : 'star-outline'}
                size={40}
                color={s <= rating ? '#F59E0B' : theme.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Tell us more (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={5}
          placeholder="What do you love? What could be better?"
          style={{ height: 120, textAlignVertical: 'top' }}
        />

        <Button
          label="Submit Feedback"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={rating === 0}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}
