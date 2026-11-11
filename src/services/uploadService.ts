import { Platform } from 'react-native';
import { CLOUDINARY } from './cloudinaryConfig';

export interface PickedImage {
  uri: string;
  type?: string;
  fileName?: string;
}

// Tải ảnh (đã thu nhỏ <= 1024px lúc chọn) lên Cloudinary bằng unsigned preset.
// Không có API secret trong app; chỉ URL trả về được lưu vào Realtime Database.
export async function uploadImage(img: PickedImage): Promise<string> {
  const form = new FormData();
  const name = img.fileName ?? `photo_${Date.now()}.jpg`;
  const file =
    Platform.OS === 'web'
      ? new File([await (await fetch(img.uri)).blob()], name)
      : ({ uri: img.uri, type: img.type ?? 'image/jpeg', name } as any);
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY.uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,
    {
      method: 'POST',
      body: form,
    },
  );
  const json = await res.json();
  if (!res.ok)
    throw new Error(json?.error?.message ?? `Tải ảnh thất bại (${res.status})`);
  return json.secure_url as string;
}
