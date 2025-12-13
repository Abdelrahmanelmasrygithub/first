// components/UserCard.js

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
// 🟢 غيرت الـ path لـ utils/api (غيره حسب هيكل المجلدات عندك)
import { sendLike, removeLike, sendFriendRequest } from '@/constants/api'; // ← هنا التغيير الرئيسي

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth / 2) - 15; 

const UserCard = ({ user, currentUserId }) => {
    const router = useRouter(); 
    
    const [isLiked, setIsLiked] = useState(user.isUserLiked || false); 
    const [likeCount, setLikeCount] = useState(user.likeCount || 0);

    const handlePress = () => {
        router.push(`/users/${user.id}`); 
    };

    const handleLike = async () => {
        if (!currentUserId) {
            Alert.alert("تسجيل الدخول مطلوب", "يجب عليك تسجيل الدخول للإعجاب.");
            return;
        }

        if (currentUserId === user.id) {
            Alert.alert("خطأ", "لا يمكنك الإعجاب ببطاقتك الخاصة.");
            return;
        }

        const newLikeState = !isLiked;
        const newCount = newLikeState ? likeCount + 1 : likeCount - 1;

        setIsLiked(newLikeState); 
        setLikeCount(newCount > 0 ? newCount : 0);
        
        let result;
        if (newLikeState) {
            result = await sendLike(currentUserId, user.id);
        } else {
            result = await removeLike(currentUserId, user.id);
        }
        
        if (!result.success) {
            Alert.alert("خطأ", "فشل الإعجاب. يرجى المحاولة مرة أخرى.");
            setIsLiked(!newLikeState); 
            setLikeCount(newLikeState ? likeCount - 1 : likeCount + 1);
        } else {
            console.log("Like toggled successfully.");
        }
    };
    
    const handleAddFriend = async () => {
        if (!currentUserId) {
            Alert.alert("تسجيل الدخول مطلوب", "يجب عليك تسجيل الدخول لإرسال طلب الصداقة.");
            return;
        }

        const result = await sendFriendRequest(currentUserId, user.id);
        
        if (result.success) {
            Alert.alert("تم الإرسال", `تم إرسال طلب صداقة إلى ${user.name} بنجاح.`);
        } else {
            Alert.alert("خطأ", "فشل إرسال طلب الصداقة. قد يكون الطلب مرسلاً مسبقاً.");
        }
    };

    return (
        <TouchableOpacity 
            style={[styles.cardContainer, { width: cardWidth }]}
            onPress={handlePress} 
        >
            <Image source={{ uri: user.imageUrl }} style={styles.image} />
            
            {user.isVerified && (
                <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#66b2ff" />
                </View>
            )}

            <View style={styles.likeCounterContainer}>
                <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"}
                        size={18} 
                        color={isLiked ? "#ff69b4" : "#fff"} 
                    />
                </TouchableOpacity>
                <Text style={styles.likeCountText}>
                    {likeCount}
                </Text>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={styles.chatButton}
                        onPress={() => {
                            if (!currentUserId) {
                                Alert.alert("خطأ", "يجب تسجيل الدخول للبدء في المحادثة.");
                                return;
                            }
                            router.push(`/chat/${user.id}`);
                        }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleAddFriend}>
                        <Ionicons name="person-add-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.userInfo}>
                    {user.age} . {user.name} - {user.location}
                </Text>
                <Text style={styles.interests}>{user.interests.join(', ')}</Text>
            </View>
            
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        margin: 5,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 3, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minHeight: 250,
    },
    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    verifiedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 1,
        zIndex: 10,
    },
    likeCounterContainer: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 15,
        paddingHorizontal: 6,
        paddingVertical: 3,
        zIndex: 10,
    },
    likeCountText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 14,
    },
    likeButton: {
        // لا يوجد ستايل خاص للزر
    },
    infoContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
        flexShrink: 1, 
    },
    interests: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row-reverse', 
        marginLeft: 8,
    },
    chatButton: {
        backgroundColor: '#4ade80', 
        padding: 4,
        borderRadius: 5,
        marginLeft: 4,
    },
    addButton: {
        backgroundColor: '#66b2ff', 
        padding: 4,
        borderRadius: 5,
    }
});

export default UserCard;