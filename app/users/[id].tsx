// app/users/[id].tsx (النسخة النهائية 100% شغالة)

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
    isUserLiked
} from '@/constants/api'; // تأكد إن المسار صحيح عندك

// تحديث الـ interface ليشمل interests
interface UserDetails {
    id: string;
    name: string;
    age: number;
    imageUrl: string;
    bio: string;
    location: string;
    interests: string[];     // جديد: اهتمامات كـ array
    likeCount: number;
    isUserLiked?: boolean;   // اختياري لأنه بيجي من fetchUserDetails
}

export default function UserDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

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

            const userData = await fetchUserDetails(targetId);

            if (userData) {
                setUser(userData);
                setLikeCount(userData.likeCount || 0);
                setIsLiked(userData.isUserLiked || false); // من fetchUserDetails مباشرة
            }

            setLoading(false);
        };

        loadData();
    }, [id]);

    const handleLike = async () => {
        if (!currentUserId || !user) {
            Alert.alert("خطأ", "يجب تسجيل الدخول أولاً.");
            return;
        }

        const newIsLiked = !isLiked;
        const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // تحديث فوري (Optimistic UI)
        setIsLiked(newIsLiked);
        setLikeCount(Math.max(0, newCount));

        const result = newIsLiked
            ? await sendLike(currentUserId, user.id)
            : await removeLike(currentUserId, user.id);

        if (!result.success) {
            // إرجاع الحالة لو فشل
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
            Alert.alert("معلومة", "الطلب مرسل من قبل أو حدث خطأ.");
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#66b2ff" />
                <Text style={{ marginTop: 10 }}>جاري تحميل التفاصيل...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>لم يتم العثور على المستخدم.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />

                <View style={styles.infoBox}>
                    <Text style={styles.name}>{user.name}, {user.age}</Text>
                    <Text style={styles.location}>
                        <Ionicons name="location-outline" size={16} color="#666" /> {user.location}
                    </Text>

                    <View style={styles.likeCountContainer}>
                        <Ionicons name="heart" size={20} color="#ff69b4" />
                        <Text style={styles.likeCountText}>{likeCount} إعجاب</Text>
                    </View>
                </View>

                {/* اهتمامات */}
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

                {/* السيرة الذاتية */}
                <View style={styles.bioBox}>
                    <Text style={styles.sectionTitle}>عني</Text>
                    <Text style={styles.bioText}>{user.bio}</Text>
                </View>

                {/* شريط الأزرار السفلي */}
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
                        onPress={() => router.push(`/chat/${user.id}`)}
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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    scrollContent: { paddingBottom: 100 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileImage: { width: '100%', height: 400, resizeMode: 'cover' },
    infoBox: { padding: 15, backgroundColor: '#fff' },
    name: { fontSize: 28, fontWeight: 'bold', textAlign: 'right' },
    location: { fontSize: 16, color: '#666', textAlign: 'right', marginTop: 5 },
    likeCountContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 10 },
    likeCountText: { fontSize: 16, color: '#ff69b4', fontWeight: 'bold', marginRight: 6 },

    interestsBox: { padding: 15, backgroundColor: '#fff', marginTop: 10 },
    interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
    interestTag: { backgroundColor: '#e6f2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    interestText: { color: '#0066cc', fontSize: 14 },

    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
    bioBox: { padding: 15, backgroundColor: '#fff', marginTop: 10 },
    bioText: { fontSize: 16, color: '#333', textAlign: 'right', lineHeight: 24 },

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
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 6,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    likeButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff69b4' },
    likedButton: { backgroundColor: '#ff69b4' },
    chatButton: { backgroundColor: '#4ade80' },
    requestButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#66b2ff' },
    buttonText: { marginTop: 6, fontSize: 13, fontWeight: 'bold' },
    errorText: { color: 'red', fontSize: 18 },
});