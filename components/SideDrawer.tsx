// components/SideDrawer.tsx - نسخة محسنة نهائيًا: حجم خطوط وصورة مناسب تمامًا زي التطبيقات الحديثة (Instagram, TikTok, X 2025)

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Animated, Dimensions, Image, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/constants/supabase';
import { fetchMyProfile } from '@/constants/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface MenuItem {
  id: string;
  title: string;
  onPress: () => void;
  icon: string;
  danger?: boolean;
}

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const router = useRouter();
  const [userData, setUserData] = useState<{ name: string; email: string; imageUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const backdropScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const profile = await fetchMyProfile();
        if (!profile) {
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        setUserData({
          name: profile.username || profile.full_name || user?.email?.split('@')[0] || 'مستخدم',
          email: user?.email || 'لا يوجد بريد',
          imageUrl: profile.avatar_url || 'https://picsum.photos/200',
        });
      } catch (err) {
        console.error('خطأ في جلب البروفايل:', err);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      fetchUser();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.6,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(backdropScale, {
          toValue: 0.94,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: DRAWER_WIDTH,
          duration: 350,
          easing: Easing.in(Easing.bezier(0.25, 0.1, 0.25, 1)),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(backdropScale, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => onClose());
    }
  }, [visible]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الخروج.');
      return;
    }
    router.replace('/auth/login');
  };

  const handleDeleteAccount = () => {
    onClose();
    router.push('/delete-account');
  };

  const handleTerms = () => {
    onClose();
    Alert.alert('الشروط', 'سيتم عرض الشروط هنا قريباً.');
  };

  const handleRules = () => {
    onClose();
    Alert.alert('الأحكام', 'سيتم عرض الأحكام هنا قريباً.');
  };

  const menuData: MenuItem[] = [
    {
      id: '1',
      title: 'الحسابات المحظورة',
      icon: 'ban-outline',
      onPress: () => {
        onClose();
        router.push('/(drawer)/blocked-users');
      },
    },
    { id: '2', title: 'الشروط', onPress: handleTerms, icon: 'document-text-outline' },
    { id: '3', title: 'الأحكام', onPress: handleRules, icon: 'shield-checkmark-outline' },
    { id: '4', title: 'حذف الحساب', onPress: handleDeleteAccount, icon: 'trash-outline', danger: true },
    { id: '5', title: 'تسجيل الخروج', onPress: handleSignOut, icon: 'log-out-outline', danger: true },
  ];

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
      <Ionicons name={item.icon as any} size={24} color={item.danger ? '#ff3b30' : '#555'} />
      <Text style={[styles.menuText, item.danger && styles.dangerText]}>{item.title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return null;
  }

  return (
    <Modal animationType="none" transparent={true} visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ flex: 1, transform: [{ scale: backdropScale }] }} pointerEvents="none" />
      </Animated.View>

      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
        <View style={styles.drawerHeader}>
          {userData && (
            <>
              <Image
                source={{ uri: userData.imageUrl }}
                style={styles.drawerImage}
                resizeMode="cover"
              />
              <Text style={styles.drawerName}>{userData.name}</Text>
              <Text style={styles.drawerEmail}>{userData.email}</Text>
            </>
          )}
        </View>

        <FlatList
          data={menuData}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuListContainer}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -12, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 40,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    overflow: 'hidden',
  },
  drawerHeader: {
    height: SCREEN_HEIGHT * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
    paddingBottom: 20,
  },
  drawerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  drawerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  drawerEmail: {
    fontSize: 14.5,
    color: '#777',
    fontWeight: '500',
  },
  menuListContainer: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  menuText: {
    fontSize: 17,
    color: '#333',
    marginLeft: 24,
    flex: 1,
    fontWeight: '500',
  },
  dangerText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
});