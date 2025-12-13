// utils/api.js (النسخة النهائية والمحدثة - 2025 - معالجة الخطأ 409 Conflict + إضافة دوال الإحصائيات)

import { supabase } from './supabase';
import { Buffer } from 'buffer'; // إضافة جديدة للتحويل الموثوق

/**
 * جلب ID المستخدم الحالي
 */
export async function getCurrentUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
}

// ----------------------------------------------------------------------
// 1. جلب الكروت في الهوم
export async function fetchUserCards() {
    const currentUserId = await getCurrentUserId();

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, username, age, avatar_url, bio, location, interests,
            likes_count:likes!likes_target_user_id_fkey(count),
            is_liked:likes!likes_target_user_id_fkey(user_id)
        `)
        .neq('id', currentUserId)
        .limit(50);

    if (error) {
        console.error("Error fetching user cards:", error);
        return null;
    }

    return data.map(profile => {
        const userLiked = profile.is_liked?.some(l => l.user_id === currentUserId) || false;

        return {
            id: profile.id,
            name: profile.username || 'غير معروف',
            age: profile.age || 0,
            imageUrl: profile.avatar_url || '',
            bio: profile.bio || '',
            location: profile.location || 'غير محدد',
            interests: profile.interests || [],
            likeCount: profile.likes_count?.[0]?.count || 0,
            isUserLiked: userLiked,
        };
    });
}

// ----------------------------------------------------------------------
// 2. جلب تفاصيل مستخدم واحد
export async function fetchUserDetails(userId) {
    const currentUserId = await getCurrentUserId();

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, username, age, avatar_url, bio, location, interests,
            likes_count:likes!likes_target_user_id_fkey(count),
            is_liked:likes!likes_target_user_id_fkey(user_id)
        `)
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error("Error fetching user details:", error);
        return null;
    }

    const userLiked = data.is_liked?.some(l => l.user_id === currentUserId) || false;

    return {
        id: data.id,
        name: data.username || 'غير معروف',
        age: data.age || 0,
        imageUrl: data.avatar_url || '',
        bio: data.bio || 'لم يضف المستخدم سيرة ذاتية بعد.',
        location: data.location || 'غير محدد',
        interests: data.interests || [],
        likeCount: data.likes_count?.[0]?.count || 0,
        isUserLiked: userLiked,
    };
}

// ----------------------------------------------------------------------
export async function isUserLiked(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId) return false;

    const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('target_user_id', targetUserId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.error("Error checking like:", error);
        return false;
    }
    return !!data;
}

// ----------------------------------------------------------------------
export async function sendLike(currentUserId, targetUserId) {
  // احصل على اليوزر لو ما اتمرر
  if (!currentUserId) {
    const id = await getCurrentUserId();
    if (!id) return { success: false, message: "غير مسجل الدخول" };
    currentUserId = id;
  }
  if (!targetUserId) return { success: false, message: "targetUserId مفقود" };

  // --- تأكد أن البروفايل الخاص بالمرسل موجود ---
  const { data: senderProfile, error: senderErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', currentUserId)
    .maybeSingle();

  if (senderErr && senderErr.code !== 'PGRST116') {
    console.error('Error checking sender profile:', senderErr);
    return { success: false, error: senderErr };
  }

  if (!senderProfile) {
    // حاول تنشئ بروفايل بسيط تلقائياً (اختياري)
    const { error: createErr } = await supabase
      .from('profiles')
      .insert({ id: currentUserId, username: null })
      .select();
    if (createErr) {
      console.error('Failed to create sender profile:', createErr);
      return { success: false, message: 'حسابك لا يوجد له بروفايل ولا يمكن إنشاؤه تلقائياً', error: createErr };
    }
  }

  // --- تأكد أن بروفايل الهدف موجود ---
  const { data: targetProfile, error: targetErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetErr && targetErr.code !== 'PGRST116') {
    console.error('Error checking target profile:', targetErr);
    return { success: false, error: targetErr };
  }
  if (!targetProfile) {
    return { success: false, message: 'المستخدم المستهدف غير موجود في النظام (no profile)' };
  }

  // --- الآن نفذ الإدخال مع معالجة خطأ التعارض (لايك موجود مسبقًا) ---
  const { data, error } = await supabase
    .from('likes')
    .insert([{ user_id: currentUserId, target_user_id: targetUserId }])
    .select();

  if (error) {
    // 23505 -> unique violation (اللايك موجود مسبقًا)
    if (error.code === '23505' || error.code === 'PGRST116') {
      return { success: true, message: 'الإعجاب موجود بالفعل' };
    }
    console.error('Error sending like:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

// ----------------------------------------------------------------------
export async function removeLike(currentUserId, targetUserId) {
    if (!currentUserId) return { success: false, message: "غير مسجل الدخول" };

    const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUserId)
        .eq('target_user_id', targetUserId);

    if (error) return { success: false, error };
    return { success: true };
}

// ----------------------------------------------------------------------
export async function sendFriendRequest(currentUserId, receiverId) {
    const { error } = await supabase
        .from('friendships')
        .insert({ sender_id: currentUserId, receiver_id: receiverId, status: 'pending' });

    if (error) {
        if (error.code === '23505') return { success: true, message: "الطلب مرسل من قبل" };
        return { success: false, error };
    }
    return { success: true };
}

// ----------------------------------------------------------------------
// جلب بروفايل المستخدم الحالي
export async function fetchMyProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, age, avatar_url, bio, location, interests')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching my profile:", error);
    return null;
  }

  // لو مفيش بروفايل، نرجع object فاضي
  if (!data) {
    return {
      id: userId,
      username: '',
      age: null,
      avatar_url: null,
      bio: '',
      location: '',
      interests: [],
    };
  }

  return data;
}

// ----------------------------------------------------------------------
// تحديث البروفايل + رفع الصورة (يدعم Web + Mobile + ضغط تلقائي)
export async function updateProfile(updates) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: "غير مسجل الدخول" };

    let avatarUrl = updates.avatar_url || null;

    if (updates.avatar_file) {
        const fileExt = updates.avatar_file.name?.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // تحويل base64 إلى ArrayBuffer باستخدام Buffer (بدون fetch)
        const { base64, type: contentType } = updates.avatar_file;
        let arrayBuffer;
        try {
            const buffer = Buffer.from(base64, 'base64');
            arrayBuffer = buffer.buffer; // يعطي ArrayBuffer مباشرة
        } catch (e) {
            console.error("فشل تحويل base64 إلى ArrayBuffer:", e);
            return { success: false, message: "فشل تحويل الصورة إلى تنسيق مدعوم" };
        }

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, arrayBuffer, {
                cacheControl: '3600',
                upsert: true,
                contentType,
            });

        if (uploadError) {
            console.error("فشل الرفع:", uploadError);
            return { success: false, message: "فشل رفع الصورة", error: uploadError };
        }

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            username: updates.username?.trim() || null,
            age: updates.age ? Number(updates.age) : null,
            bio: updates.bio?.trim() || null,
            location: updates.location?.trim() || null,
            interests: updates.interests || [],
            avatar_url: avatarUrl,
        })
        .eq('id', userId);

    if (error) {
        console.error("خطأ في تحديث البروفايل:", error);
        return { success: false, error };
    }

    return { success: true };
}

// ----------------------------------------------------------------------
// إضافات جديدة لشاشة البروفايل العام (الإحصائيات)

// جلب عدد الإعجابات التي تلقاها المستخدم (من الآخرين)
export async function fetchUserLikesCount(userId) {
    if (!userId) return 0;
    const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', userId);

    if (error) {
        console.error('Error fetching likes count:', error);
        return 0;
    }
    return count || 0;
}

// جلب عدد الأصدقاء (صداقات مقبولة)
export async function fetchFriendsCount(userId) {
    if (!userId) return 0;
    const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');

    if (error) {
        console.error('Error fetching friends count:', error);
        return 0;
    }
    return count || 0;
}

// جلب عدد الزوار (افترض وجود جدول visits مع أعمدة: viewed_id, viewer_id)
export async function fetchVisitorsCount(userId) {
    if (!userId) return 0;
    const { count, error } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_id', userId);

    if (error) {
        console.error('Error fetching visitors count:', error);
        return 0;
    }
    return count || 0;
}

// دالة لتسجيل زيارة (استدعيها عند عرض بروفايل شخص آخر)
export async function recordVisit(viewerId, viewedId) {
    if (!viewerId || !viewedId || viewerId === viewedId) return { success: true };

    const { error } = await supabase
        .from('visits')
        .insert({ viewer_id: viewerId, viewed_id: viewedId });

    if (error && error.code !== '23505') { // 23505 = unique violation (زيارة مسجلة بالفعل)
        console.error('Error recording visit:', error);
    }
    return { success: true };
}