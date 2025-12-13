// app/(tabs)/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import Navbar from '../../components/Navbar'; 
import UserCard from '../../components/UserCard'; 

import { fetchUserCards, getCurrentUserId } from '@/constants/api'; 


interface UserCardData {
  id: string;
  name: string;
  age: number;
  imageUrl: string;
  bio: string;
  location: string;
  interests: string[];
  likeCount: number;
  isUserLiked: boolean;
  isVerified?: boolean; // خليه اختياري بدل مطلوب
}
const POLLING_INTERVAL = 30000; 

export default function HomeScreen() {
  const [users, setUsers] = useState<UserCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // حالة جديدة للـ refresh يدوي

  const loadUserCards = async (isInitialLoad: boolean = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const data = await fetchUserCards(); 
      if (data && data.length > 0) { // تحقق إضافي لو الداتا فارغة
        setUsers(data);
        setError(null);
      } else {
        setError("فشل في تحميل المستخدمين. تحقق من اتصال الشبكة أو سياسات RLS في Supabase.");
      }
    } catch (err) {
      console.error("Error fetching user cards:", err); // طبع الإيرور بالتفصيل (مهم للـ debug)
      setError("حدث خطأ غير متوقع أثناء جلب البيانات.");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId); 
      loadUserCards(true);
    };
    
    loadInitialData();

    const intervalId = setInterval(() => {
      loadUserCards(false); 
      console.log('Polling triggered: User cards refreshed.');
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); 
  }, []);

  // دالة الـ refresh يدوي (مستخدمة useCallback عشان الأداء)
  const onRefresh = useCallback(() => {
    loadUserCards(false);
  }, []);

  const renderItem = ({ item }: { item: UserCardData }) => (
    <UserCard user={item} currentUserId={currentUserId} /> 
  );

  return (
    <View style={styles.container}> 
      <Navbar /> 
      
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator size="large" color="#66b2ff" style={{ marginTop: 50 }} />
        )}

        {error && users.length === 0 && ( 
          <Text style={styles.errorText}>{error}</Text>
        )}

        {!loading && (
          <>
            <Text style={styles.header}>اكتشف</Text> 
            <FlatList
              data={users}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#66b2ff']} // لون الـ spinner
                />
              }
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1, 
    paddingTop: 10,
    paddingHorizontal: 5, // إضافة padding جانبي للـ content
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right', 
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  list: {
    paddingBottom: 20, 
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    paddingHorizontal: 20, // لجعلها أوسع
  }
});