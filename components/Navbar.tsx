import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '@/constants/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // استيراد الأيقونات للأزرار

export default function Navbar() {
  const router = useRouter();

  // دالة تسجيل الخروج
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      // يمكنك عرض تنبيه للمستخدم هنا
      return;
    }
    
    // التوجيه إلى شاشة تسجيل الدخول بعد تسجيل الخروج
    router.replace('/auth/login'); 
  };

  // دالة التنقل إلى صفحة البروفايل
  const handleProfile = () => {
    router.push('/(tabs)/profile'); // افترض أن الصفحة موجودة في app/(tabs)/profile.tsx
  };

  return (
    <View style={styles.navbar}>
      <Text style={styles.title}>AppName</Text>
      
      {/* أيقونة البروفايل في المنتصف أو حسب التصميم */}
      <TouchableOpacity 
        onPress={handleProfile} 
        style={styles.profileButton}
      >
        <Ionicons name="person-circle-outline" size={28} color="#000" />
      </TouchableOpacity>
      
      {/* زر تسجيل الخروج */}
      <TouchableOpacity 
        onPress={handleSignOut} 
        style={styles.signOutButton}
      >
        <Ionicons name="log-out-outline" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // مسافة علوية لتجنب نوتش الهاتف/شريط الحالة
    paddingBottom: 15,
    backgroundColor: '#fff', 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  profileButton: {
    padding: 8,
    borderRadius: 8,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
  },
});