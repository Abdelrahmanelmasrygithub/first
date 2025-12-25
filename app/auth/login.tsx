// app/auth/login.tsx
import { Link, useRouter } from 'expo-router'; // استيراد useRouter لتوجيه المستخدمين
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/constants/supabase'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); 

  const router = useRouter();

  // 1. الدالة المسؤولة عن تسجيل الدخول باستخدام Supabase
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      Alert.alert('خطأ في تسجيل الدخول', error.message);
    } else {
      // في حالة النجاح:
      Alert.alert('تم بنجاح', 'تم تسجيل الدخول بنجاح!');
      
      // مسح الحقول بعد النجاح
      setEmail('');
      setPassword('');
      
      // *** التوجيه إلى الصفحة الرئيسية (/) بعد تسجيل الدخول بنجاح ***
      router.replace('/'); 
    }

    setLoading(false);
  };
  
  // ----------------------------------------------------

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back 👋</Text>

      <TextInput
        style={styles.input}
        placeholder="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none" 
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="كلمة المرور"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity 
        style={styles.btn} 
        onPress={handleLogin} 
        disabled={loading} 
      >
        <Text style={styles.btnText}>
          {loading ? '...جاري التحميل' : 'Login'}
        </Text>
      </TouchableOpacity>

      <Link href="/auth/register" style={styles.linkText}>
        Create Account
      </Link>

      <Link href="/auth/reset-password" style={styles.linkText}>
        Forgot Password?
      </Link>
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
    fontWeight: '900', // أكثر سمكاً
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', // لون حدود أفتح
    padding: 15, // حجم أكبر
    borderRadius: 12, // زوايا دائرية
    marginBottom: 15,
    fontSize: 16,
  },
  btn: { 
    backgroundColor: '#000', 
    padding: 15, 
    borderRadius: 12, // زوايا دائرية
    marginTop: 10,
  },
  btnText: { 
    color: '#fff', 
    textAlign: 'center', 
    fontSize: 18, // خط أكبر
    fontWeight: '700' 
  },
  linkText: {
    marginTop: 25, 
    textAlign: 'center', 
    color: '#666',
    fontWeight: '600'
  }
});