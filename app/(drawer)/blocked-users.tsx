// app/(drawer)/blocked-users.tsx - النسخة المعدلة (تصحيح عمود 'blocker_id' + تحقق أفضل + أداء عالي)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchBlockedUsers, unblockUser ,getCurrentUserId} from '@/constants/api'; // استيراد الدوال

interface BlockedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlockedUsers = async () => {
    setLoading(true);
    const data = await fetchBlockedUsers();
    setBlockedUsers(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

const [currentUserId, setCurrentUserId] = useState<string | null>(null);

// إضافة useEffect لجلب currentUserId
useEffect(() => {
  const loadUser = async () => {
    const userId = await getCurrentUserId();
    setCurrentUserId(userId);
  };
  loadUser();
}, []);

// تحديث handleUnblock
const handleUnblock = async (blockedId: string) => {
  if (!currentUserId) {
    Alert.alert('خطأ', 'لم يتم تسجيل الدخول');
    return;
  }

  Alert.alert(
    'إلغاء الحظر',
    'هل أنت متأكد أنك تريد إلغاء حظر هذا المستخدم؟',
    [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم، إلغاء الحظر',
        style: 'destructive',
        onPress: async () => {
          const result = await unblockUser(currentUserId, blockedId); // ✅ تمرير currentUserId
          if (result.success) {
            setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
            Alert.alert('تم', 'تم إلغاء الحظر بنجاح');
          } else {
            Alert.alert('خطأ', result.message || 'فشل إلغاء الحظر، حاول مرة أخرى');
          }
        },
      },
    ]
  );
};

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => router.push(`/users/${item.id}`)}
      >
        <Image
          source={{ uri: item.avatar_url || 'https://picsum.photos/100' }}
          style={styles.avatar}
          resizeMode="cover"
        />
        <Text style={styles.username}>{item.username}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.id)}
      >
        <Text style={styles.unblockText}>إلغاء الحظر</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>الحسابات المحظورة</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header مع زر رجوع */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>الحسابات المحظورة</Text>
        <View style={{ width: 28 }} />
      </View>
      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>لا توجد حسابات محظورة</Text>
          <Text style={styles.emptySubtitle}>جميع المستخدمين يمكنهم التفاعل معك</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadBlockedUsers();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80, // إضافة padding تحت للـ FlatList
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    backgroundColor: '#ddd',
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  unblockButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  unblockText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});