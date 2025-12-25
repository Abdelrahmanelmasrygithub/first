// app/auth/verify-otp.tsx (ملف جديد)
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/constants/supabase';

export default function VerifyOTPScreen() {
  const { email, type, password } = useLocalSearchParams(); // params من Register أو Reset
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('خطأ', 'أدخل الكود.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email as string,
      token: otp,
      type: type as 'signup' | 'recovery' // signup للتسجيل، recovery لـ reset
    });

    setLoading(false);

    if (error) {
      Alert.alert('خطأ', error.message);
    } else {
      if (type === 'signup') {
        // بعد التأكيد، سجل الدخول بباسورد (إذا كان موجود)
        if (password) {
          await supabase.auth.signInWithPassword({ email: email as string, password: password as string });
        }
        Alert.alert('تم', 'تم التسجيل والتأكيد!');
        router.replace('/');
      } else if (type === 'recovery') {
        // اذهب إلى شاشة إدخال باسورد جديد
        router.push({ pathname: '/auth/update-password', params: { access_token: data.session?.access_token } });
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>أدخل كود التأكيد</Text>
      <TextInput
        style={styles.input}
        placeholder="الكود (6 أرقام)"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'جاري...' : 'تأكيد'}</Text>
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