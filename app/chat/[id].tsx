// app/chat/[id].tsx - النسخة النهائية والمحسنة جدًا (Realtime فوري، منع تكرار، سكرول مثالي، تأكيد logs، تحديث is_read، optimistic UI، reconnect قوي، فحص دوري للحظر)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getCurrentUserId,
  fetchMessagesWithUser,
  sendMessage,
  subscribeToMessages,
  fetchUserDetails,
  isBlockedBy,
  hasBlocked,
  unblockUser,
} from '@/constants/api';
import { supabase } from '@/constants/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

export default function ChatScreen() {
  const { id: otherUserId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserName, setOtherUserName] = useState('جاري التحميل...');
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false); // إذا حظرني الآخر
  const [isBlocking, setIsBlocking] = useState(false); // إذا حظرته أنا
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);

  // تحميل البيانات الأولية
  useEffect(() => {
    const initChat = async () => {
      if (!otherUserId) {
        Alert.alert('خطأ', 'معرف المستخدم غير صحيح.');
        router.back();
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        Alert.alert('خطأ', 'يجب تسجيل الدخول للدردشة.');
        router.replace('/auth/login');
        return;
      }

      setCurrentUserId(userId);

      // تحقق من حالة الحظر أولاً
      const blockedByOther = await isBlockedBy(userId, otherUserId);
      const hasBlockedOther = await hasBlocked(userId, otherUserId);

      console.log('حالة الحظر:', {
        blockedByOther, // true = الآخر حظرني
        hasBlockedOther // true = أنا حظرته
      });

      setIsBlocked(blockedByOther);
      setIsBlocking(hasBlockedOther);

      const userDetails = await fetchUserDetails(otherUserId);
      setOtherUserName(userDetails?.name || 'غير معروف');

      // لو في حظر من أي نوع → لا نجلب رسائل وننهي التحميل
      if (blockedByOther || hasBlockedOther) {
        setMessages([]); // نضمن عدم ظهور أي رسائل قديمة
        setLoading(false);
        return;
      }

      // لو مفيش حظر → نجلب الرسائل عادي
      const msgs = await fetchMessagesWithUser(userId, otherUserId);
      setMessages(msgs || []);
      setLoading(false);
    };

    initChat();
  }, [otherUserId]);

  // Realtime subscription مع reconnect قوي ومنع تكرار
  useEffect(() => {
    if (!currentUserId || !otherUserId || isBlocked || isBlocking) return;

    const setupSubscription = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = subscribeToMessages(
        currentUserId,
        otherUserId as string,
        (newMsg: Message) => {
          console.log('رسالة جديدة وصلت فورًا عبر Realtime! 🎉', newMsg.content);
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );

      subscriptionRef.current.subscribe((status: string) => {
        console.log('Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('تم الاشتراك بنجاح في Realtime!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime connection issue, retrying in 3s...');
          setTimeout(setupSubscription, 3000);
        }
      });
    };

    setupSubscription();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        console.log('Auth event:', event, '→ إعادة الاشتراك في Realtime');
        setupSubscription();
      }
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      authListener?.subscription.unsubscribe();
    };
  }, [currentUserId, otherUserId, isBlocked, isBlocking]);

  // سكرول أوتوماتيك عند تحميل الرسائل أو إضافة رسالة
  useEffect(() => {
    if (!loading && messages.length > 0 && !isBlocked && !isBlocking) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [loading, messages, isBlocked, isBlocking]);

  // تحديث is_read للرسائل الواردة عند فتح الشات
  useEffect(() => {
    if (!loading && currentUserId && messages.length > 0 && !isBlocked && !isBlocking) {
      const unreadIds = messages
        .filter((m) => m.receiver_id === currentUserId && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds)
          .then(({ error }) => {
            if (error) console.error('Error marking messages as read:', error);
            else console.log(`تم تحديث ${unreadIds.length} رسالة كمقروءة`);
          });
      }
    }
  }, [loading, messages, currentUserId, isBlocked, isBlocking]);

  // 🆕 فحص دوري للحظر كل 10 ثواني (للتأكد من تحديث الحالة)
  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const checkBlockStatus = async () => {
      try {
        const blockedByOther = await isBlockedBy(currentUserId, otherUserId);
        const hasBlockedOther = await hasBlocked(currentUserId, otherUserId);

        // لو تغيرت حالة الحظر → نحدث الـ state
        if (blockedByOther !== isBlocked) {
          console.log('⚠️ تم اكتشاف تغيير في حالة الحظر: الآخر حظرك');
          setIsBlocked(blockedByOther);
          setMessages([]); // نمسح الرسائل
          if (blockedByOther) {
            Alert.alert('تنبيه', 'تم حظرك من قبل هذا المستخدم');
          }
        }

        if (hasBlockedOther !== isBlocking) {
          console.log('⚠️ تم اكتشاف تغيير في حالة الحظر: أنت حظرته');
          setIsBlocking(hasBlockedOther);
          setMessages([]); // نمسح الرسائل
        }
      } catch (error) {
        console.error('خطأ في فحص حالة الحظر:', error);
      }
    };

    // فحص فوري عند فتح الشات
    checkBlockStatus();

    // فحص دوري كل 10 ثواني
    const interval = setInterval(checkBlockStatus, 10000);

    return () => clearInterval(interval);
  }, [currentUserId, otherUserId, isBlocked, isBlocking]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !otherUserId) return;

    // فحص الحظر قبل الإرسال
    if (isBlocked) {
      Alert.alert('تنبيه', 'هذا المستخدم قام بحظرك، لا يمكنك إرسال رسائل إليه.');
      return;
    }

    if (isBlocking) {
      Alert.alert('تنبيه', 'لقد قمت بحظر هذا المستخدم، لا يمكنك إرسال رسائل إليه.');
      return;
    }

    const tempMessage = newMessage.trim();
    setNewMessage(''); // ننظف الحقل فورًا

    const result = await sendMessage(currentUserId, otherUserId as string, tempMessage);

    if (!result.success) {
      // عرض رسالة مخصصة بناءً على نوع الخطأ
      if (result.message?.includes('حظرك')) {
        Alert.alert('تنبيه', 'هذا المستخدم قام بحظرك، لا يمكنك إرسال رسائل إليه.');
      } else if (result.message?.includes('قمت بحظر')) {
        Alert.alert('تنبيه', 'لقد قمت بحظر هذا المستخدم، لا يمكنك إرسال رسائل إليه.');
      } else {
        Alert.alert('خطأ', result.message || 'فشل إرسال الرسالة، حاول مرة أخرى.');
      }
      setNewMessage(tempMessage); // نرجع الرسالة لو فشل الإرسال
    }
    // الرسالة هتضاف تلقائيًا عبر Realtime لو نجحت
  };

  const handleUnblock = async () => {
    if (!currentUserId || !otherUserId) return;

    const result = await unblockUser(currentUserId, otherUserId);
    if (result.success) {
      setIsBlocking(false);
      
      // جلب الرسائل بعد إلغاء الحظر
      const msgs = await fetchMessagesWithUser(currentUserId, otherUserId);
      setMessages(msgs || []);
      
      Alert.alert('نجاح', 'تم إلغاء الحظر بنجاح. يمكنك الآن المحادثة.');
    } else {
      Alert.alert('خطأ', 'فشل إلغاء الحظر، حاول مرة أخرى.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender_id === currentUserId ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>جاري تحميل المحادثة...</Text>
      </View>
    );
  }

  if (isBlocked) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed" size={80} color="#ff0000" />
        <Text style={styles.blockedText}>هذا المستخدم قام بحظرك</Text>
        <Text style={styles.blockedSubText}>لا يمكنك المحادثة معه</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonBlocked}>
          <Text style={styles.backButtonText}>عودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isBlocking) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="close-circle" size={80} color="#ff0000" />
        <Text style={styles.blockedText}>لقد قمت بحظر هذا المستخدم</Text>
        <TouchableOpacity onPress={handleUnblock} style={styles.unblockButton}>
          <Text style={styles.unblockButtonText}>إلغاء الحظر</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonBlocked}>
          <Text style={styles.backButtonText}>عودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>محادثة مع {otherUserName}</Text>
      </View>

      {/* قائمة الرسائل */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
      />

      {/* حقل الإرسال */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor="#aaa"
          multiline
          textAlignVertical="center"
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#4ade80',
    elevation: 4,
  },
  backButton: { marginLeft: 15 },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  messageList: { padding: 10, paddingBottom: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginVertical: 6 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#4ade80', borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  messageText: { fontSize: 16, color: '#333', lineHeight: 22 },
  timestamp: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 6 },
  inputContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  sendButton: { backgroundColor: '#4ade80', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#aaa' },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  blockedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff0000',
    marginTop: 20,
    textAlign: 'center',
  },
  blockedSubText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  unblockButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  unblockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonBlocked: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ddd',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
  },
});