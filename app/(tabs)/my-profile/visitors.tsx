import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '@/constants/supabase';  // مسار supabase.ts
import UserCard from '@/components/UserCard';  // افتراضي إن عندك كومبوننت لعرض المستخدم

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitors = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          visitor:visitor_id (id, username, avatar_url)  // أضف الحقول اللي عايزها من جدول users
        `)
        .eq('viewed_id', user.id)  // زوار المستخدم الحالي
        .order('visited_at', { ascending: false })  // الأحدث أولاً
        .limit(50);  // حد أقصى

      if (error) {
        console.error('Error fetching visitors:', error);
      } else {
        setVisitors(data);
      }
      setLoading(false);
    };
    fetchVisitors();
  }, []);

  if (loading) return <Text>جاري التحميل...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>زوار ملفك الشخصي</Text>
      {visitors.length === 0 ? (
        <Text>لا يوجد زوار بعد.</Text>
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard
              user={item.visitor}  // عرض بيانات الزائر
              subtitle={`زار في: ${new Date(item.visited_at).toLocaleString()}`}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});