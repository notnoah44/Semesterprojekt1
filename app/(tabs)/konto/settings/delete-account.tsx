import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const theme = useAppTheme();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = () => {
    if (confirmation !== 'DELETE') {
      Alert.alert('Confirmation required', 'Please type DELETE to confirm');
      return;
    }
    Alert.alert(
      'Delete Account',
      'Your account will be scheduled for deletion in 30 days. You can cancel this by logging in again before then.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await supabase.auth.signOut();
            clear();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Delete Account</Text>
      </View>

      <View style={{ padding: 20, gap: 20 }}>
        <Card style={{ backgroundColor: '#FEF2F2', borderColor: theme.error }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="warning" size={22} color={theme.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.error, marginBottom: 6 }}>
                This action is irreversible
              </Text>
              <Text style={{ fontSize: 14, color: '#991B1B', fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>
                Your account will be scheduled for deletion. You have 30 days to log back in and cancel. After that, all your data will be permanently deleted.
              </Text>
            </View>
          </View>
        </Card>

        <Input
          label='Type "DELETE" to confirm'
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          placeholder="DELETE"
        />

        <Button
          label="Delete My Account"
          onPress={handleDelete}
          variant="danger"
          loading={isLoading}
          disabled={confirmation !== 'DELETE'}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
