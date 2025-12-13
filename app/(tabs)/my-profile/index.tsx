import { fetchFriendsCount, fetchMyProfile, fetchUserLikesCount, fetchVisitorsCount } from '@/constants/api';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useRouter } from 'expo-router'; // فقط ده كفاية للـ routing

export default function MyProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [visitorsCount, setVisitorsCount] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      const data = await fetchMyProfile();
      if (data) {
        setProfile(data);
        const likes = await fetchUserLikesCount(data.id);
        setLikesCount(likes);
        const friends = await fetchFriendsCount(data.id);
        setFriendsCount(friends);
        const visitors = await fetchVisitorsCount(data.id);
        setVisitorsCount(visitors);
      }
    };
    loadProfile();
  }, []);

  const handleEdit = () => {
    router.push('/(tabs)/my-profile/edit'); // ده هيروح لـ edit.tsx داخل نفس المجلد
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
      {/* الهيدر مع الصورة والمعلومات الأساسية */}
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

      {/* الإحصائيات */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{visitorsCount}</Text>
          <Text style={styles.statLabel}>زوار</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{likesCount}</Text>
          <Text style={styles.statLabel}>إعجابات</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{friendsCount}</Text>
          <Text style={styles.statLabel}>أصدقاء</Text>
        </View>
      </View>

      {/* زر التعديل */}
      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Text style={styles.editButtonText}>تعديل البروفايل</Text>
      </TouchableOpacity>

      {/* الاهتمامات */}
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

      {/* الخيارات الإضافية */}
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
      </View>

      <View style={{ height: 50 }} />
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
});