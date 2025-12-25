// app/(tabs)/my-profile/index.tsx - النسخة المعدلة (مع زر "الحسابات المحظورة" + تحسين الحظر في قائمة الأصدقاء + دعم كامل للـ block system)

import { fetchFriendsCount, fetchMyProfile, isBlocked ,fetchUserLikesCount, fetchVisitorsCount, fetchPendingRequestsCount, fetchUserLikers, fetchUserFriends, unfriend, blockUser, fetchUnreadMessagesCount } from '@/constants/api';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/constants/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface Visitor {
  id: string;
  visitor: User;
  visited_at: string;
}

interface Profile {
  id: string;
  username: string;
  age: number | null;
  avatar_url: string | null;
  bio: string;
  location: string;
  interests: string[];
}

type SuccessResult = { success: true; message?: string; data?: any[]; error?: never };
type ErrorResult = { success: false; message: string; error?: PostgrestError; data?: never };
type OperationResult = SuccessResult | ErrorResult;

export default function MyProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [likers, setLikers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);

  // دالة لإعادة تحميل الإحصائيات
  const refreshStats = async () => {
    if (!profile?.id) return;
    const likes = await fetchUserLikesCount(profile.id);
    setLikesCount(likes);
    const friends = await fetchFriendsCount(profile.id);
    setFriendsCount(friends);
    const visitors = await fetchVisitorsCount(profile.id);
    setVisitorsCount(visitors);
    const pending = await fetchPendingRequestsCount();
    setPendingCount(pending);
    const unread = await fetchUnreadMessagesCount();
    setUnreadCount(unread);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const data = await fetchMyProfile();
      if (data) {
        setProfile(data);
      }
    };
    loadProfile();
  }, []);

  // إعادة تحميل الإحصائيات بعد تحديث profile
  useEffect(() => {
    if (profile) {
      refreshStats();
    }
  }, [profile]);

  // اشتراك Realtime (يبدأ بعد تحميل profile.id)
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `receiver_id=eq.${profile.id}`
      }, () => {
        console.log('Realtime: تغيير في طلبات الصداقة');
        refreshStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visits',
        filter: `viewed_id=eq.${profile.id}`
      }, () => {
        console.log('Realtime: تغيير في الزيارات');
        refreshStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `target_user_id=eq.${profile.id}`
      }, () => {
        console.log('Realtime: تغيير في الإعجابات');
        refreshStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blocks',
        filter: `blocker_id=eq.${profile.id}`
      }, () => {
        console.log('Realtime: تغيير في الحظر');
        refreshStats(); // لتحديث لو تأثرت الإحصائيات بالحظر
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscribed successfully');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime error:', status);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id]);

  const loadLikers = async () => {
    if (profile) {
      const data = await fetchUserLikers(profile.id);
      setLikers(data || []);
      setShowLikersModal(true);
    }
  };

  const loadFriends = async () => {
    if (profile) {
      const data = await fetchUserFriends(profile.id);
      const uniqueFriends = Array.from(new Map((data || []).map(f => [f.id, f])).values());
      setFriends(uniqueFriends);
      setShowFriendsModal(true);
    }
  };

  const loadVisitors = async () => {
    if (profile) {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          visitor:profiles!visitor_id (id, username, avatar_url)
        `)
        .eq('viewed_id', profile.id)
        .order('visited_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching visitors:', error);
        setVisitors([]);
      } else {
        // فلترة الزوار المحظورين
        const filteredVisitors = [];
        for (const visit of (data || [])) {
          if (!(await isBlocked(profile.id, visit.visitor.id))) {
            filteredVisitors.push(visit);
          }
        }
        setVisitors(filteredVisitors);
      }
      setShowVisitorsModal(true);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!profile?.id) {
      Alert.alert('خطأ', 'لا يمكن تحديد المستخدم الحالي.');
      return;
    }

    Alert.alert('تأكيد', 'هل تريد حذف هذا الصديق؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم',
        onPress: async () => {
          const result = await unfriend(profile.id, friendId) as OperationResult;
          if (result.success) {
            setFriends(prev => prev.filter(f => f.id !== friendId));
            setFriendsCount(prev => prev - 1);
            Alert.alert('تم', 'تم حذف الصديق بنجاح.');
          } else {
            Alert.alert('خطأ', (result as ErrorResult).message ?? 'فشل في حذف الصديق، حاول مرة أخرى.');
          }
        },
      },
    ]);
  };

  const handleBlock = async (friendId: string) => {
    if (!profile?.id) {
      Alert.alert('خطأ', 'لا يمكن تحديد المستخدم الحالي.');
      return;
    }

    Alert.alert('تأكيد', 'هل تريد حظر هذا المستخدم؟ سيتم حذف الصداقة أيضًا.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم، حظر',
        onPress: async () => {
          const result = await blockUser(profile.id, friendId) as OperationResult;
          if (result.success) {
            setFriends(prev => prev.filter(f => f.id !== friendId));
            setFriendsCount(prev => prev - 1);
            Alert.alert('تم', 'تم حظر المستخدم وحذف الصداقة بنجاح.');
          } else {
            Alert.alert('خطأ', (result as ErrorResult).message ?? 'فشل في الحظر، حاول مرة أخرى.');
          }
        },
      },
    ]);
  };

  const renderLiker = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/users/${item.id}`)}>
      <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} style={styles.listAvatar} />
      <Text style={styles.listName}>{item.username}</Text>
    </TouchableOpacity>
  );

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.listItem}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => router.push(`/users/${item.id}`)}>
        <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} style={styles.listAvatar} />
        <Text style={styles.listName}>{item.username}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleUnfriend(item.id)} style={styles.actionButton}>
        <Text style={styles.actionText}>حذف</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleBlock(item.id)} style={styles.actionButton}>
        <Text style={styles.actionText}>حظر</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVisitor = ({ item }: { item: Visitor }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/users/${item.visitor.id}`)}>
      <Image source={{ uri: item.visitor.avatar_url || 'https://via.placeholder.com/50' }} style={styles.listAvatar} />
      <View>
        <Text style={styles.listName}>{item.visitor.username}</Text>
        <Text style={styles.listSubtitle}>{new Date(item.visited_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleEdit = () => {
    router.push('/(tabs)/my-profile/edit');
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.username || 'غير معروف'}</Text>
        <Text style={styles.ageLocation}>
          {profile.age || 'غير محدد'} • {profile.location || 'غير محدد'}
        </Text>
        <Text style={styles.bio}>{profile.bio || 'لم يضف سيرة ذاتية بعد'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statItem} onPress={loadVisitors}>
          <Text style={styles.statNumber}>{visitorsCount}</Text>
          <Text style={styles.statLabel}>زوار</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={loadLikers}>
          <Text style={styles.statNumber}>{likesCount}</Text>
          <Text style={styles.statLabel}>إعجابات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={loadFriends}>
          <Text style={styles.statNumber}>{friendsCount}</Text>
          <Text style={styles.statLabel}>أصدقاء</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Text style={styles.editButtonText}>تعديل البروفايل</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.requestsButton} onPress={() => router.push('/(tabs)/my-profile/requests')}>
        <Text style={styles.requestsButtonText}>طلبات الصداقة ({pendingCount})</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.messagesButton} onPress={() => router.push('/messages')}>
        <Text style={styles.messagesButtonText}>رسائلي ({unreadCount})</Text>
      </TouchableOpacity>

      {profile.interests && profile.interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اهتماماتي</Text>
          <View style={styles.interestsList}>
            {profile.interests.map((interest: string, index: number) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>كن عضو VIP 👑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>Boost ملفك الشخصي ⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>الهدايا 🎁</Text>
        </TouchableOpacity>
        {/* إضافة زر الحسابات المحظورة */}
        <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/(drawer)/blocked-users')}>
          <Text style={styles.optionText}>الحسابات المحظورة 🚫</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 50 }} />

      {/* Modal للمعجبين */}
      <Modal visible={showLikersModal} animationType="slide" onRequestClose={() => setShowLikersModal(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>المعجبون ({likers.length})</Text>
          <FlatList
            data={likers}
            renderItem={renderLiker}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد معجبون حتى الآن</Text>}
          />
          <TouchableOpacity onPress={() => setShowLikersModal(false)} style={styles.closeButtonContainer}>
            <Text style={styles.closeButton}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal للأصدقاء */}
      <Modal visible={showFriendsModal} animationType="slide" onRequestClose={() => setShowFriendsModal(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>الأصدقاء ({friends.length})</Text>
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد أصدقاء حتى الآن</Text>}
          />
          <TouchableOpacity onPress={() => setShowFriendsModal(false)} style={styles.closeButtonContainer}>
            <Text style={styles.closeButton}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal للزوار */}
      <Modal visible={showVisitorsModal} animationType="slide" onRequestClose={() => setShowVisitorsModal(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>الزوار ({visitors.length})</Text>
          <FlatList
            data={visitors}
            renderItem={renderVisitor}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد زوار حتى الآن</Text>}
          />
          <TouchableOpacity onPress={() => setShowVisitorsModal(false)} style={styles.closeButtonContainer}>
            <Text style={styles.closeButton}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#0066cc',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  ageLocation: {
    fontSize: 16,
    color: '#666',
    marginVertical: 5,
  },
  bio: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#f9f9f9',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  editButton: {
    backgroundColor: '#0066cc',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsButton: {
    backgroundColor: '#66b2ff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesButton: {
    backgroundColor: '#4ade80',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  messagesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    color: '#0066cc',
    fontWeight: '600',
  },
  optionsContainer: {
    padding: 20,
  },
  optionItem: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  listName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  listSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  actionButton: {
    paddingHorizontal: 12,
  },
  actionText: {
    color: '#ff4444',
    fontWeight: '600',
  },
  closeButtonContainer: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginTop: 10,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  closeButton: {
    color: '#0066cc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 50,
  },
});