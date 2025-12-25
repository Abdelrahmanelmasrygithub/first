// app/auth/reset-password.tsx (ملف جديد)
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/constants/supabase';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleReset = async () => {
    if (!email) {
      Alert.alert('خطأ', 'أدخل بريدك الإلكتروني.');
      return;
    }

    const trimmedEmail = email.trim();

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    setLoading(false);

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      Alert.alert('تم', 'تم إرسال كود إعادة التعيين إلى بريدك.');
      router.push({ pathname: '/auth/verify-otp', params: { email: trimmedEmail, type: 'recovery' } }); // اذهب إلى OTP screen
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>إعادة تعيين كلمة المرور</Text>
      <TextInput
        style={styles.input}
        placeholder="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'جاري...' : 'إرسال الكود'}</Text>
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