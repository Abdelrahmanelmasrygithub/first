// app/(tabs)/_layout.tsx - الملف الذي تم تعديله

import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// استيراد عميل Supabase من المسار الذي تم تصحيحه
import { supabase } from '../../constants/supabase'; 

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. الاشتراك في تغييرات حالة المصادقة (لتحديث حالة التطبيق فوراً عند تسجيل الدخول/الخروج)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // 3. مسح (Cleanup)
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // 4. عرض شاشة تحميل أثناء التحقق من حالة المستخدم
  if (loading) {
    return <></>; 
  }

  // 5. منطق التوجيه: إذا لم يكن هناك جلسة، قم بالتوجيه إلى شاشة تسجيل الدخول
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  // 6. إذا كان مسجل دخول، اعرض التبويبات
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
         name="my-profile" // اسم المجلد
         options={{
         title: 'البروفايل',
         tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle.fill" color={color} />,
  }}
/>
      <Tabs.Screen
          name="exploree"
          options={{
          title: 'Exploree',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}