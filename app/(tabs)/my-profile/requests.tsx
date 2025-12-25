// app/(tabs)/my-profile/requests.tsx

import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from '@/constants/api'; // حسب مسارك

interface RequestItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
}

export default function FriendRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      const data = await fetchPendingRequests();
      setRequests(data);
      setLoading(false);
    };
    loadRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      setRequests(requests.filter(req => req.id !== requestId));
      Alert.alert('تم', 'تم قبول الطلب!');
    } else {
      Alert.alert('خطأ', 'فشل قبول الطلب، حاول مرة أخرى.');
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectFriendRequest(requestId);
    if (result.success) {
      setRequests(requests.filter(req => req.id !== requestId));
      Alert.alert('تم', 'تم رفض الطلب.');
    } else {
      Alert.alert('خطأ', 'فشل رفض الطلب، حاول مرة أخرى.');
    }
  };

  const renderRequest = ({ item }: { item: RequestItem }) => (
    <View style={styles.requestItem}>
      <Image source={{ uri: item.senderAvatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.senderName}</Text>
        <Text style={styles.message}>أرسل طلب صداقة</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
          <Ionicons name="checkmark" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><Text>جاري التحميل...</Text></View>;
  }

  if (requests.length === 0) {
    return <View style={styles.center}><Text>لا يوجد طلبات صداقة معلقة.</Text></View>;
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderRequest}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  requestItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: 'bold' },
  message: { fontSize: 14, color: '#666' },
  actions: { flexDirection: 'row', gap: 8 },
  acceptButton: { backgroundColor: '#4ade80', padding: 8, borderRadius: 8 },
  rejectButton: { backgroundColor: '#ff4d4d', padding: 8, borderRadius: 8 },
});