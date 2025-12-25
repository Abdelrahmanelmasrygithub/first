import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// 1. رابط المشروع الذي أكدته
const supabaseUrl = 'https://jjasblslqtcljarkkczg.supabase.co'; 

// 2. مفتاح Publishable key (Anon key) الذي تم تحديثه الآن
const supabaseAnonKey = 'sb_publishable_uPnirNMnLfBufUU2nlLF0Q_r0z6hv4b'; 

// إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // إعدادات التخزين للحفاظ على جلسة المستخدم
    persistSession: true, 
  },
});
supabase.auth.getSession().then(res => console.log(res));