import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  I18nManager,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchMyProfile, updateProfile } from '@/constants/api';
import useImagePicker from '../../../hooks/useImagePicker';
import styles from '../../../hooks/styles';
import InterestList from '../../../components/InterestList';

export default function ProfileEditScreen() {
  const navigation = useNavigation();

  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
      Alert.alert('إعادة تشغيل مطلوبة', 'أعد تشغيل التطبيق لتفعيل الدعم العربي');
    }

    const loadProfile = async () => {
      const data = await fetchMyProfile();
      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setAge(data.age ? data.age.toString() : '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setInterests(data.interests || []);
        setAvatarPreview(data.avatar_url || null);
      }
    };

    loadProfile();
  }, []);

  /* ✅ التعديل المهم هنا */
  const addInterest = (interest?: string) => {
    const value = (interest ?? newInterest).trim();

    if (!value) return;

    if (interests.includes(value)) {
      Alert.alert('تنبيه', 'هذا الاهتمام مضاف مسبقًا');
      return;
    }

    setInterests((prev) => [...prev, value]);
    setNewInterest('');
  };

  const removeInterest = (index: number) => {
    setInterests((prev) => prev.filter((_, i) => i !== index));
  };

  const pickImage = useImagePicker(setAvatarFile, setAvatarPreview);

  const handleUpdate = async () => {
    if (!username.trim()) {
      Alert.alert('خطأ', 'اسم المستخدم مطلوب');
      return;
    }

    const updates: any = {
      username: username.trim(),
      age: age ? parseInt(age, 10) : null,
      bio: bio.trim(),
      location: location.trim(),
      interests,
      avatar_url: profile?.avatar_url,
    };

    if (avatarFile) {
      updates.avatar_file = avatarFile;
    }

    const result = await updateProfile(updates);

    if (result.success) {
      Alert.alert('تم بنجاح', 'تم تحديث البروفايل');
      navigation.goBack();
    } else {
      Alert.alert('فشل', result.message || 'حدث خطأ');
    }
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>تعديل البروفايل</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        {avatarPreview ? (
          <Image source={{ uri: avatarPreview }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>إضافة صورة</Text>
          </View>
        )}
        <View style={styles.editIcon}>
          <Text style={{ color: '#fff', fontSize: 22 }}>+</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>اسم المستخدم</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} />

      <Text style={styles.label}>العمر</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <Text style={styles.label}>السيرة الذاتية</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Text style={styles.label}>المكان</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />

      {/* ✅ InterestList يعمل الآن مع الاقتراحات */}
      <InterestList
        interests={interests}
        newInterest={newInterest}
        setNewInterest={setNewInterest}
        addInterest={addInterest}
        removeInterest={removeInterest}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
        <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
