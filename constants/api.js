// constants/api.js - النسخة النهائية الكاملة (مع دعم الحظر الكامل + RLS جاهز + أداء عالي + أمان)

import { supabase } from '@/constants/supabase';
import { Buffer } from 'buffer';

/**
 * جلب ID المستخدم الحالي
 */
export async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// ----------------------------------------------------------------------
// دوال مساعدة للحظر (سريعة وآمنة)

// دوال داخلية (غير مُصدّرة)
async function isBlockedByMe(currentUserId, targetId) {
  if (!currentUserId || !targetId) return false;
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', targetId)
    .maybeSingle();
  return !!data;
}

async function isBlockedByOther(currentUserId, targetId) {
  if (!currentUserId || !targetId) return false;
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', targetId)
    .eq('blocked_id', currentUserId)
    .maybeSingle();
  return !!data;
}

// دوال مُصدّرة (عامة)
export async function isBlocked(currentUserId, targetId) {
  if (!currentUserId || !targetId) return false;
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${currentUserId})`)
    .maybeSingle();
  return !!data;
}

export async function isBlockedBy(currentUserId, targetId) {
  return await isBlockedByOther(currentUserId, targetId);
}

export async function hasBlocked(currentUserId, targetId) {
  return await isBlockedByMe(currentUserId, targetId);
}

export async function getBlockStatus(currentUserId, targetId) {
  if (!currentUserId || !targetId) {
    return { 
      isBlocked: false, 
      iBlockedThem: false, 
      theyBlockedMe: false 
    };
  }

  const iBlockedThem = await isBlockedByMe(currentUserId, targetId);
  const theyBlockedMe = await isBlockedByOther(currentUserId, targetId);

  return {
    isBlocked: iBlockedThem || theyBlockedMe,
    iBlockedThem,
    theyBlockedMe,
  };
}

// ----------------------------------------------------------------------
// 1. جلب الكروت في الهوم (مع استبعاد المحظورين من الاتجاهين)
// في constants/api.js
// استبدل دالة fetchUserCards بهذه النسخة المحسنة

export async function fetchUserCards() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return [];

  // ✅ 1. جلب قائمة المحظورين مرة واحدة (أسرع من التحقق لكل مستخدم)
  const { data: blocksData } = await supabase
    .from('blocks')
    .select('blocked_id, blocker_id')
    .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

  const blockedIds = new Set();
  if (blocksData) {
    blocksData.forEach(block => {
      if (block.blocker_id === currentUserId) {
        blockedIds.add(block.blocked_id); // أنا حظرته
      } else {
        blockedIds.add(block.blocker_id); // هو حظرني
      }
    });
  }

  // ✅ 2. جلب البروفايلات
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, username, age, avatar_url, bio, location, interests,
      likes_count:likes!likes_target_user_id_fkey(count),
      is_liked:likes!likes_target_user_id_fkey(user_id)
    `)
    .neq('id', currentUserId)
    .limit(100);

  if (error || !data) {
    console.error("Error fetching user cards:", error);
    return [];
  }

  // ✅ 3. فلترة المحظورين
  const filtered = data
    .filter(profile => !blockedIds.has(profile.id)) // ✅ إخفاء المحظورين
    .map(profile => {
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

  return filtered.slice(0, 50);
}

// ----------------------------------------------------------------------
// 2. جلب تفاصيل مستخدم واحد (مع تحقق الحظر)
// في constants/api.js
// استبدل دالة fetchUserDetails بهذه النسخة المحسنة

export async function fetchUserDetails(userId) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId || !userId) {
    console.log('Missing currentUserId or userId');
    return null;
  }

  // التحقق من الحظر في الاتجاهين قبل أي استعلام
  const blocked = await isBlocked(currentUserId, userId);
  if (blocked) {
    console.log('Blocked: cannot fetch details for user', userId);
    return null; // لا نرجع أي بيانات إذا كان هناك حظر في أي اتجاه
  }

  console.log('Fetching profile details for user:', userId, 'from current user:', currentUserId);

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

  // تحقق إضافي بعد جلب البيانات (للأمان)
  if (await isBlocked(currentUserId, userId)) {
    console.log('Blocked after fetch - returning null');
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

// ✅ دالة لجلب الزيارات مع إخفاء المحظورين
export async function fetchUserVisitors(userId) {
  if (!userId) return [];
  const currentUserId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('visits')
    .select('visitor_id, created_at, profiles!visits_visitor_id_fkey (id, username, avatar_url)')
    .eq('viewed_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching visitors:', error);
    return [];
  }

  // ✅ فلترة المحظورين
  const filtered = [];
  for (const visit of (data || [])) {
    const blocked = await isBlocked(currentUserId, visit.visitor_id);
    if (!blocked) {
      filtered.push({
        id: visit.visitor_id,
        username: visit.profiles.username || 'غير معروف',
        avatar_url: visit.profiles.avatar_url || 'https://placehold.co/50',
        visited_at: visit.created_at
      });
    }
  }
  
  return filtered;
}

// ----------------------------------------------------------------------
export async function sendLike(currentUserId, targetUserId) {
  if (!currentUserId) {
    const id = await getCurrentUserId();
    if (!id) return { success: false, message: "غير مسجل الدخول" };
    currentUserId = id;
  }
  if (!targetUserId) return { success: false, message: "targetUserId مفقود" };

  if (await isBlocked(currentUserId, targetUserId)) {
    return { success: false, message: 'لا يمكن الإعجاب بمستخدم محظور' };
  }

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', currentUserId)
    .maybeSingle();

  if (!senderProfile) {
    await supabase.from('profiles').insert({ id: currentUserId, username: null });
  }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return { success: false, message: 'المستخدم المستهدف غير موجود' };
  }

  const { data, error } = await supabase
    .from('likes')
    .insert([{ user_id: currentUserId, target_user_id: targetUserId }])
    .select();

  if (error) {
    if (error.code === '23505') {
      return { success: true, message: 'الإعجاب موجود بالفعل' };
    }
    console.error('Error sending like:', error);
    return { success: false, error };
  }
  return { success: true, data };
}

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
  if (!currentUserId || !receiverId || currentUserId === receiverId) {
    return { success: false, message: 'لا يمكن إرسال طلب صداقة لنفسك' };
  }

  if (await isBlocked(currentUserId, receiverId)) {
    return { success: false, message: 'لا يمكن إرسال طلب صداقة لمستخدم محظور' };
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ sender_id: currentUserId, receiver_id: receiverId, status: 'pending' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          return { success: false, message: 'طلب الصداقة مرسل بالفعل وفي انتظار القبول' };
        } else if (existing.status === 'accepted') {
          return { success: false, message: 'أنتما بالفعل أصدقاء' };
        }
      }
      return { success: false, message: 'طلب الصداقة موجود بالفعل' };
    }
    console.error('Error sending friend request:', error);
    return { success: false, message: 'فشل إرسال الطلب، حاول مرة أخرى' };
  }

  return { success: true, message: 'تم إرسال طلب الصداقة بنجاح' };
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
// تحديث البروفايل + رفع الصورة
export async function updateProfile(updates) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: "غير مسجل الدخول" };
  let avatarUrl = updates.avatar_url || null;
  if (updates.avatar_file) {
    const fileExt = updates.avatar_file.name?.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    const { base64, type: contentType } = updates.avatar_file;
    let arrayBuffer;
    try {
      const buffer = Buffer.from(base64, 'base64');
      arrayBuffer = buffer.buffer;
    } catch (e) {
      console.error("فشل تحويل base64:", e);
      return { success: false, message: "فشل تحويل الصورة" };
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
      return { success: false, message: "فشل رفع الصورة" };
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
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
// إحصائيات
export async function fetchUserLikesCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('target_user_id', userId);
  if (error) console.error('Error fetching likes count:', error);
  return count || 0;
}

export async function fetchFriendsCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted');
  if (error) console.error('Error fetching friends count:', error);
  return count || 0;
}

export async function fetchVisitorsCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_id', userId);
  if (error) console.error('Error fetching visitors count:', error);
  return count || 0;
}

export async function recordVisit(visitorId, viewedId) {
  if (!visitorId || !viewedId || visitorId === viewedId) return { success: true };
  if (await isBlocked(visitorId, viewedId)) return { success: true };
  const { error } = await supabase
    .from('visits')
    .insert({ visitor_id: visitorId, viewed_id: viewedId });
  if (error && error.code !== '23505') console.error('Error recording visit:', error);
  return { success: true };
}

// ----------------------------------------------------------------------
// دوال الشات مع دعم الحظر الكامل
export async function fetchChatPartners() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return [];

  // جلب جميع الرسائل
  const { data: messages, error } = await supabase
    .from('messages')
    .select('sender_id, receiver_id, content, created_at, is_read')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false });

  if (error || !messages || messages.length === 0) return [];

  // استخراج IDs الشركاء
  const partnerIds = new Set();
  messages.forEach(msg => {
    if (msg.sender_id !== currentUserId) partnerIds.add(msg.sender_id);
    if (msg.receiver_id !== currentUserId) partnerIds.add(msg.receiver_id);
  });

  // ✅ فلترة المحظورين (إخفاء فقط)
  const filteredIds = [];
  for (const id of partnerIds) {
    const blocked = await isBlocked(currentUserId, id);
    if (!blocked) {
      filteredIds.push(id);
    }
  }

  if (filteredIds.length === 0) return [];

  // جلب بيانات البروفايلات
  const { data: partners } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', filteredIds);

  const partnersMap = new Map(partners?.map(p => [p.id, p]) || []);

  const conversations = new Map();
  messages.forEach(msg => {
    const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
    if (!filteredIds.includes(partnerId)) return;

    const partner = partnersMap.get(partnerId);
    if (!partner) return;

    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, {
        id: partnerId,
        username: partner.username || 'غير معروف',
        avatar_url: partner.avatar_url,
        last_message: msg.content,
        last_message_time: msg.created_at,
        unread_count: msg.receiver_id === currentUserId && !msg.is_read ? 1 : 0,
      });
    } else {
      const conv = conversations.get(partnerId);
      if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
        conv.last_message = msg.content;
        conv.last_message_time = msg.created_at;
      }
      if (msg.receiver_id === currentUserId && !msg.is_read) {
        conv.unread_count += 1;
      }
    }
  });

  return Array.from(conversations.values()).sort(
    (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
  );
}

export async function fetchMessagesWithUser(currentUserId, otherUserId, sinceTimestamp = null) {
  if (!currentUserId || !otherUserId) return [];
  if (await isBlocked(currentUserId, otherUserId)) return [];

  let query = supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`);

  if (sinceTimestamp) {
    query = query.gt('created_at', sinceTimestamp);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
}

export async function sendMessage(currentUserId, receiverId, content) {
  if (!currentUserId || !receiverId || !content?.trim()) {
    return { success: false, message: 'بيانات ناقصة' };
  }

  if (await isBlocked(currentUserId, receiverId)) {
    return { success: false, message: 'لا يمكنك إرسال رسائل لهذا المستخدم بسبب الحظر' };
  }

  const { error } = await supabase
    .from('messages')
    .insert({ sender_id: currentUserId, receiver_id: receiverId, content: content.trim() });

  if (error) {
    console.error('Error sending message:', error);
    return { success: false, message: 'فشل إرسال الرسالة' };
  }

  return { success: true };
}

export function subscribeToMessages(currentUserId, otherUserId, callback) {
  const sortedIds = [currentUserId, otherUserId].sort();
  const channelName = `chat:${sortedIds.join('-')}`;

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const newMsg = payload.new;
        if (
          (newMsg.sender_id === currentUserId && newMsg.receiver_id === otherUserId) ||
          (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUserId)
        ) {
          console.log('رسالة وصلت فورًا عبر Realtime!', newMsg.content);
          callback(newMsg);
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime status:', status);
    });
}

export async function fetchUnreadMessagesCount() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', currentUserId)
    .eq('is_read', false);

  if (error) console.error('Error fetching unread count:', error);
  return count || 0;
}

// ----------------------------------------------------------------------
// باقي دوال الصداقة والحظر
export async function fetchPendingRequestsCount() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return 0;
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending');
  if (error) console.error('Error fetching pending count:', error);
  return count || 0;
}

export async function fetchPendingRequests() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('id, sender_id, created_at, sender:profiles!sender_id (id, username, avatar_url)')
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  const filtered = [];
  for (const req of data) {
    if (!(await isBlocked(currentUserId, req.sender_id))) {
      filtered.push({
        id: req.id,
        created_at: req.created_at,
        sender: {
          id: req.sender.id,
          username: req.sender.username || 'غير معروف',
          avatar_url: req.sender.avatar_url || 'https://placehold.co/50',
        },
      });
    }
  }

  return filtered;
}

export async function acceptFriendRequest(requestId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, message: 'فشل قبول الطلب' };
  }

  return { success: true };
}

export async function rejectFriendRequest(requestId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, message: 'فشل رفض الطلب' };
  }

  return { success: true };
}

export async function fetchUserLikers(userId) {
  if (!userId) return [];
  const currentUserId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('likes')
    .select('user_id, profiles!likes_user_id_fkey (id, username, avatar_url)')
    .eq('target_user_id', userId);

  if (error) {
    console.error('Error fetching likers:', error);
    return [];
  }

  // ✅ فلترة المحظورين
  const filtered = [];
  for (const l of (data || [])) {
    const blocked = await isBlocked(currentUserId, l.user_id);
    if (!blocked) {
      filtered.push({
        id: l.user_id,
        username: l.profiles.username || 'غير معروف',
        avatar_url: l.profiles.avatar_url || 'https://placehold.co/50'
      });
    }
  }
  
  return filtered;
}

// ✅ تحديث fetchUserFriends لإخفاء المحظورين
export async function fetchUserFriends(userId) {
  if (!userId) return [];
  const currentUserId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      sender_id, receiver_id,
      sender:profiles!friendships_sender_id_fkey (id, username, avatar_url),
      receiver:profiles!friendships_receiver_id_fkey (id, username, avatar_url)
    `)
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  const friends = (data || []).map(f => {
    const isSender = f.sender_id === userId;
    return {
      id: isSender ? f.receiver_id : f.sender_id,
      username: isSender ? f.receiver.username : f.sender.username,
      avatar_url: isSender ? f.receiver.avatar_url : f.sender.avatar_url
    };
  });

  // ✅ فلترة المحظورين
  const filtered = [];
  for (const friend of friends) {
    const blocked = await isBlocked(currentUserId, friend.id);
    if (!blocked) {
      filtered.push(friend);
    }
  }

  return filtered;
}

export async function unfriend(currentUserId, friendId) {
  if (!currentUserId || !friendId) return { success: false };
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('status', 'accepted')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`);
  if (error) console.error('Error unfriending:', error);
  return { success: !error };
}

// في constants/api.js
export async function blockUser(currentUserId, blockedId) {
  if (!currentUserId || !blockedId || currentUserId === blockedId) {
    return { success: false, message: 'بيانات غير صالحة' };
  }

  try {
    console.log(`🚫 بدء حظر: blocker=${currentUserId}, blocked=${blockedId}`);

    // تحقق من وجود المستخدمين في profiles
    const { data: blockerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUserId)
      .maybeSingle();
    if (!blockerProfile) {
      console.log('إضافة profile للحاظر تلقائيًا');
      await supabase.from('profiles').insert({ id: currentUserId, username: null });
    }

    const { data: blockedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blockedId)
      .maybeSingle();
    if (!blockedProfile) {
      return { success: false, message: 'المستخدم المحظور غير موجود في profiles' };
    }

    // 1. حذف الصداقات
    const { error: friendError } = await supabase
      .from('friendships')
      .delete()
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${currentUserId})`);
    if (friendError) {
      console.error('⚠️ خطأ حذف صداقة:', friendError);
      return { success: false, message: 'فشل حذف الصداقة: ' + friendError.message };
    }
    console.log('✅ صداقة محذوفة');

    // 2. إدراج الحظر (واحد بس: currentUserId → blockedId)
    const { data: insertedBlock, error: blockError } = await supabase
      .from('blocks')
      .insert({ blocker_id: currentUserId, blocked_id: blockedId })
      .select();

    if (blockError) {
      console.error('❌ خطأ إدراج حظر:', blockError);
      if (blockError.code === '23505') {
        return { success: true, message: 'محظور بالفعل' };
      }
      return { success: false, message: 'فشل الحظر: ' + blockError.message };
    }

    console.log('✅ حظر مضاف:', insertedBlock);
    return { success: true, message: 'تم الحظر بنجاح' };
  } catch (err) {
    console.error('❌ خطأ عام في blockUser:', err);
    return { success: false, message: 'خطأ غير متوقع: ' + err.message };
  }
}

export async function unblockUser(currentUserId, blockedId) {
  if (!currentUserId) {
    const id = await getCurrentUserId();
    if (!id) return { success: false, message: "غير مسجل الدخول" };
    currentUserId = id;
  }
  
  if (!blockedId) return { success: false, message: "معرف المستخدم المحظور مفقود" };
  
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', blockedId);
  
  if (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'فشل إلغاء الحظر' };
  }
  
  return { success: true, message: 'تم إلغاء الحظر بنجاح' };
}

export async function fetchBlockedUsers() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return [];

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', currentUserId);

  if (blocksError) {
    console.error('Error fetching blocked ids:', blocksError);
    return [];
  }

  if (!blocks || blocks.length === 0) return [];

  const blockedIds = blocks.map(b => b.blocked_id);

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', blockedIds);

  if (profileError) {
    console.error('Error fetching profiles for blocked users:', profileError);
    return blockedIds.map(id => ({
      id,
      username: 'مستخدم محذوف',
      avatar_url: 'https://placehold.co/50',
    }));
  }

  const profilesMap = new Map(profiles.map(p => [p.id, p]));

  return blockedIds.map(id => {
    const profile = profilesMap.get(id) || {};
    return {
      id,
      username: profile.username || 'مستخدم محذوف',
      avatar_url: profile.avatar_url || 'https://placehold.co/50',
    };
  });
}