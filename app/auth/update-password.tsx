// app/auth/update-password.tsx (ملف جديد)
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/constants/supabase';

export default function UpdatePasswordScreen() {
  const { access_token } = useLocalSearchParams(); // من session بعد OTP
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleUpdate = async () => {
    if (newPassword !== confirmPassword || newPassword.length < 6) {
      Alert.alert('خطأ', 'كلمات المرور غير متطابقة أو قصيرة.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      Alert.alert('تم', 'تم تغيير كلمة المرور!');
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>أدخل كلمة مرور جديدة</Text>
      <TextInput
        style={styles.input}
        placeholder="كلمة المرور الجديدة"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="تأكيد كلمة المرور"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={styles.btn} onPress={handleUpdate} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'جاري...' : 'تحديث'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 25, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 32, 
    marginBottom: 40, 
    textAlign: 'center', 
    fontWeight: '900',
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd',
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15,
    fontSize: 16,
  },
  btn: { 
    backgroundColor: '#ff69b4', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 10,
  },
  btnText: { 
    color: '#fff', 
    textAlign: 'center', 
    fontSize: 18, 
    fontWeight: '700' 
  }
});