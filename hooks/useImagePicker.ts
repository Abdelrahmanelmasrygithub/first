import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system'; // للموبايل فقط
import { Alert } from 'react-native';

const useImagePicker = (setAvatarFile: (file: any) => void, setAvatarPreview: (uri: string | null) => void) => {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('الإذن مطلوب', 'يجب منح إذن الوصول للمعرض لاختيار صورة');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const manipResult = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: Platform.OS === 'web', // على الويب، اطلب base64 مباشرة
      }
    );

    let base64;
    try {
      if (Platform.OS === 'web') {
        // على الويب، base64 متوفر إذا تم طلبه، أو استخراج من uri (data URI)
        base64 = manipResult.base64 || manipResult.uri.split(',')[1];
      } else {
        // على الموبايل، استخدم expo-file-system
        const fileObj = new File(manipResult.uri);
        base64 = await fileObj.base64();
      }
    } catch (e) {
      console.error('فشل قراءة الملف كـ base64:', e);
      Alert.alert('خطأ', 'فشل قراءة الصورة. جرب صورة أخرى أو تحقق من إصدار Expo.');
      return;
    }

    if (!base64) {
      Alert.alert('خطأ', 'فشل تحميل الصورة. تحقق من ملف الصورة.');
      return;
    }

    const imageType = 'image/jpeg';
    const filename = `avatar_${Date.now()}.jpg`;

    const file = {
      base64,
      name: filename,
      type: imageType,
      uri: manipResult.uri,
    };

    setAvatarFile(file);
    setAvatarPreview(manipResult.uri);
  };

  return pickImage;
};

export default useImagePicker;