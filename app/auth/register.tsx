import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/constants/supabase'; 

// ملاحظة: لإضافة تدرج لوني حقيقي (Gradient)، ستحتاج إلى مكتبة مثل expo-linear-gradient واستخدامها بدلاً من View الخارجي.

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('خطأ', 'الرجاء ملء جميع الحقول (الاسم، البريد الإلكتروني، وكلمة المرور).');
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    // مسح الحقول بعد محاولة التسجيل
    setName('');
    setEmail('');
    setPassword('');

    if (error) {
      Alert.alert('خطأ في التسجيل', error.message);
    } else if (data.user) {
      if (data.session === null) {
        Alert.alert(
          'تأكيد البريد الإلكتروني',
          'تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني لتأكيد التسجيل قبل محاولة تسجيل الدخول.'
        );
        router.replace('/auth/login'); 
      } else {
        Alert.alert('تم بنجاح', 'تم تسجيل حسابك وتسجيل دخولك بنجاح.');
        router.replace('/'); 
      }
    } else {
      Alert.alert('رسالة', 'تم إرسال طلب التسجيل. يرجى التحقق من بريدك الإلكتروني.');
      router.replace('/auth/login');
    }

    setLoading(false);
  };
  
  // ----------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        <Text style={styles.title}>Find Your Match ❤️</Text>

        <TextInput
          style={styles.input}
          placeholder="الاسم الكامل"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="البريد الإلكتروني"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.btn} 
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? '...جاري التسجيل' : 'إنشاء حساب'}
          </Text>
        </TouchableOpacity>

        <Link href="/auth/login" style={styles.linkText}>
          لديك حساب بالفعل؟ تسجيل الدخول
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f5f7fa', // لون خلفية هادئ (يمكن استبداله بـ Gradient)
  },
  contentBox: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 25,
    shadowColor: '#000', // إضافة ظل خفيف لإبراز الواجهة
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
  },
  title: { 
    fontSize: 28, 
    marginBottom: 30, 
    textAlign: 'center', 
    fontWeight: '800', // خط سميك وجريء
    color: '#333',
  },
  input: { 
    backgroundColor: '#f9f9f9', // خلفية خفيفة للمدخلات
    padding: 15, 
    borderRadius: 30, // حواف مستديرة بالكامل
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  btn: { 
    backgroundColor: '#ff69b4', // لون رومانسي (Pink/Magenta) للزر
    padding: 18, 
    borderRadius: 30, // حواف مستديرة
    marginTop: 10,
    marginBottom: 15,
  },
  btnText: { 
    color: '#fff', 
    textAlign: 'center', 
    fontSize: 18, 
    fontWeight: 'bold',
  },
  linkText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#ff69b4', // نفس لون الزر للرابط
    fontWeight: '600',
  }
});