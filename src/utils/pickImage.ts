import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';

// Chụp / chọn ảnh, thư viện tự thu nhỏ để cạnh dài <= 1024px. Trả về null nếu hủy / không có quyền.
export async function pickImage(
  source: 'camera' | 'library',
): Promise<Asset | null> {
  if (source === 'camera' && Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (r !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        'Không có quyền camera',
        'Hãy cho phép ứng dụng dùng camera để chụp ảnh.',
      );
      return null;
    }
  }
  const options = {
    mediaType: 'photo' as const,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8 as const,
  };
  const res =
    source === 'camera'
      ? await launchCamera(options)
      : await launchImageLibrary(options);
  if (res.errorCode === 'permission') {
    Alert.alert(
      'Không có quyền',
      'Ứng dụng chưa được cấp quyền truy cập ảnh/camera.',
    );
    return null;
  }
  const asset = res.assets?.[0];
  return res.didCancel || !asset?.uri ? null : asset;
}
