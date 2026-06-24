import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/authStore';
import { upsertProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [age, setAge] = useState(user?.age?.toString() ?? '');
  const [job, setJob] = useState(user?.job ?? '');
  const [origin, setOrigin] = useState(user?.origin ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updated = await upsertProfile({
        id: user.id,
        full_name: fullName,
        age: age ? parseInt(age, 10) : undefined,
        job: job || undefined,
        origin: origin || undefined,
        bio: bio || undefined,
      });
      setUser(updated);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user) return;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
      contentType: `image/${ext}`,
      upsert: true,
    });
    if (error) return;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const updated = await upsertProfile({ id: user.id, avatar_url: data.publicUrl });
    setUser(updated);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Edit Profile</Text>
        <Button label="Save" onPress={handleSave} loading={isLoading} size="sm" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ position: 'relative' }}>
            <Avatar uri={user?.avatar_url} name={user?.full_name} size={96} />
            <TouchableOpacity
              onPress={handlePickAvatar}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: theme.primary, borderRadius: 99,
                width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: theme.surface,
              }}
            >
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Input label="Full Name" value={fullName} onChangeText={setFullName} />
        <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
        <Input label="Job / Occupation" value={job} onChangeText={setJob} />
        <Input label="Where you're from" value={origin} onChangeText={setOrigin} />
        <Input
          label="About you"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
          style={{ height: 120, textAlignVertical: 'top' }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
