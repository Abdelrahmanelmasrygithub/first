import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack initialRouteName="index">  
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ title: 'تعديل البروفايل' }} />
    </Stack>
  );
}