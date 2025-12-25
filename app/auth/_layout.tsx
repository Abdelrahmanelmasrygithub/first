// app/auth/_layout.tsx
// هذا الملف يجب أن يحتوي فقط على شاشات المصادقة
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      {/* إخفاء الـ Header في شاشات الدخول والتسجيل */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="update-password" options={{ headerShown: false }} />
      {/* أي ملف آخر داخل مجلد auth يجب أن يتم تعريفه هنا أيضاً */}
    </Stack>
  );
}