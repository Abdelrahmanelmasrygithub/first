// app/users/[id].tsx - مع منع الوصول الكامل للمحظورين + إلغاء التأكيد مؤقتًا + logs للتشخيص

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    fetchUserDetails,
    sendLike,
    removeLike,
    sendFriendRequest,
    getCurrentUserId,
    recordVisit,
    isBlocked,
    blockUser
} from '@/constants/api';
import { supabase } from '@/constants/supabase';

interface UserDetails {
    id: string;
    name: string;
    age: number;
    imageUrl: string;
    bio: string;
    location: string;
    interests: string[];
    likeCount: number;
    isUserLiked?: boolean;
}

export default function UserDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isFriend, setIsFriend] = useState(false);
    const [isBlockedUser, setIsBlockedUser] = useState(false);

    useEffect(() => {
        const targetId = Array.isArray(id) ? id[0] : id;
        if (!targetId) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            const userId = await getCurrentUserId();
            setCurrentUserId(userId);

            if (!userId) {
                setLoading(false);
                return;
            }

            // ✅ تحقق من الحظر في الاتجاهين (هذا الأهم!)
            const blocked = await isBlocked(userId, targetId);
            if (blocked) {
                Alert.alert(
                    'تنبيه',
                    'لا يمكن عرض هذا البروفايل.',
                    [{
                        text: 'حسناً',
                        onPress: () => router.back()
                    }]
                );
                setLoading(false);
                return; // ✅ نوقف التنفيذ هنا
            }

            const userData = await fetchUserDetails(targetId);
            if (userData) {
                setUser(userData);
                setLikeCount(userData.likeCount || 0);
                setIsLiked(userData.isUserLiked || false);

                // تحقق الصداقة
                const { data: friendship } = await supabase
                    .from('friendships')
                    .select('id')
                    .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${userId})`)
                    .eq('status', 'accepted')
                    .maybeSingle();

                setIsFriend(!!friendship);
                setIsBlockedUser(false); // ✅ إذا وصلنا هنا، يعني مش محظور
            } else {
                Alert.alert(
                    'خطأ',
                    'المستخدم غير موجود.',
                    [{
                        text: 'حسناً',
                        onPress: () => router.back()
                    }]
                );
            }

            setLoading(false);
        };

        loadData();

        // تسجيل الزيارة (لو مش محظور)
        const logVisit = async () => {
            const userId = await getCurrentUserId();
            if (userId && userId !== targetId && !(await isBlocked(userId, targetId))) {
                await recordVisit(userId, targetId);
            }
        };
        logVisit();
    }, [id]);

    const handleLike = async () => {
        if (!currentUserId || !user) return;
        const newIsLiked = !isLiked;
        const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;
        setIsLiked(newIsLiked);
        setLikeCount(Math.max(0, newCount));
        const result = newIsLiked
            ? await sendLike(currentUserId, user.id)
            : await removeLike(currentUserId, user.id);
        if (!result.success) {
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            Alert.alert("خطأ", "فشلت العملية، حاول مرة أخرى.");
        }
    };

    const handleAddFriend = async () => {
        if (!currentUserId || !user) return;
        const result = await sendFriendRequest(currentUserId, user.id);
        if (result.success) {
            Alert.alert("تم", `تم إرسال طلب صداقة إلى ${user.name}`);
        } else {
            Alert.alert("معلومة", result.message || "الطلب مرسل من قبل أو حدث خطأ.");
        }
    };

    const handleChat = async () => {
        if (!currentUserId || !user) return;
        if (!isFriend) {
            Alert.alert("معلومة", "يجب أن تكون أصدقاء للدردشة.");
            return;
        }
        router.push({ pathname: '/chat/[id]', params: { id: user.id } });
    };

    // إلغاء رسالة التأكيد مؤقتًا + logs للتشخيص
    const handleBlock = async () => {
        if (!currentUserId || !user) {
            Alert.alert('خطأ', 'لا يمكن تحديد المستخدم.');
            return;
        }

        console.log('بدء عملية حظر: currentUserId=', currentUserId, 'targetId=', user.id);

        const result = await blockUser(currentUserId, user.id);

        console.log('نتيجة blockUser:', result);

        if (result.success) {
            Alert.alert('تم', 'تم حظر المستخدم بنجاح.');
            router.back();
        } else {
            Alert.alert('خطأ', result.message || 'فشل الحظر، حاول مرة أخرى.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#66b2ff" />
                <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>جاري تحميل التفاصيل...</Text>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.errorText}>لا يمكن عرض هذا البروفايل.</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>العودة</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image source={{ uri: user.imageUrl || 'https://via.placeholder.com/400' }} style={styles.profileImage} />
                <View style={styles.infoBox}>
                    <Text style={styles.name}>{user.name}, {user.age || 'غير محدد'}</Text>
                    <Text style={styles.location}>
                        <Ionicons name="location-outline" size={16} color="#666" /> {user.location || 'غير محدد'}
                    </Text>
                    <View style={styles.likeCountContainer}>
                        <Ionicons name="heart" size={20} color="#ff69b4" />
                        <Text style={styles.likeCountText}>{likeCount} إعجاب</Text>
                    </View>
                </View>

                {user.interests && user.interests.length > 0 && (
                    <View style={styles.interestsBox}>
                        <Text style={styles.sectionTitle}>اهتماماتي</Text>
                        <View style={styles.interestsContainer}>
                            {user.interests.map((interest, index) => (
                                <View key={index} style={styles.interestTag}>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.bioBox}>
                    <Text style={styles.sectionTitle}>عني</Text>
                    <Text style={styles.bioText}>{user.bio || 'لم يضف سيرة ذاتية بعد'}</Text>
                </View>

                <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
                    <Ionicons name="ban-outline" size={20} color="#ff3b30" />
                    <Text style={styles.blockText}>
                        {isFriend ? 'إنهاء الصداقة والحظر' : 'حظر هذا المستخدم'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.actionButton, isLiked ? styles.likedButton : styles.likeButton]}
                    onPress={handleLike}
                >
                    <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={28}
                        color={isLiked ? "white" : "#ff69b4"}
                    />
                    <Text style={[styles.buttonText, { color: isLiked ? 'white' : '#ff69b4' }]}>
                        {isLiked ? 'أعجبني' : 'إعجاب'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={handleChat}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
                    <Text style={styles.buttonText}>محادثة</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.requestButton]}
                    onPress={handleAddFriend}
                >
                    <Ionicons name="person-add-outline" size={28} color="#66b2ff" />
                    <Text style={[styles.buttonText, { color: '#66b2ff' }]}>إضافة صديق</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
    scrollContent: { paddingBottom: 100 },
    profileImage: { width: '100%', height: 400, resizeMode: 'cover' },
    infoBox: { padding: 20, backgroundColor: '#fff', marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    name: { fontSize: 28, fontWeight: 'bold', textAlign: 'right', color: '#333' },
    location: { fontSize: 16, color: '#666', textAlign: 'right', marginTop: 8, flexDirection: 'row-reverse', alignItems: 'center' },
    likeCountContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 12 },
    likeCountText: { fontSize: 16, color: '#ff69b4', fontWeight: 'bold', marginRight: 8 },
    interestsBox: { padding: 20, backgroundColor: '#fff', marginTop: 10 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'right', color: '#333' },
    interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
    interestTag: { backgroundColor: '#e6f2ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    interestText: { color: '#0066cc', fontSize: 14, fontWeight: '600' },
    bioBox: { padding: 20, backgroundColor: '#fff', marginTop: 10 },
    bioText: { fontSize: 16, color: '#444', textAlign: 'right', lineHeight: 24 },
    blockButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        backgroundColor: '#fff',
        margin: 20,
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ff3b30'
    },
    blockText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 8,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    likeButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff69b4' },
    likedButton: { backgroundColor: '#ff69b4' },
    chatButton: { backgroundColor: '#4ade80' },
    requestButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#66b2ff' },
    buttonText: { marginTop: 6, fontSize: 14, fontWeight: 'bold' },
    errorText: { color: '#ff3b30', fontSize: 18, textAlign: 'center', marginBottom: 20 },
    backButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});