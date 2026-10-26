import { Injectable } from '@angular/core';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { resizeImage } from '../utils/image';
import { storage } from './firebase';
import { log } from '../utils/log';

@Injectable({ providedIn: 'root' })
export class Photos {
  // Uploads a photo of the professional and returns its public URL
  async upload(uid: string, folder: 'profile' | 'gallery' | 'services', file: File) {
    if (!file.type.startsWith('image/')) throw new Error('not-an-image');

    const blob = await resizeImage(file);
    const photo = ref(storage, `professionals/${uid}/${folder}/${Date.now()}.jpg`);
    await uploadBytes(photo, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(photo);
  }

  // Deletes a photo by its URL. Links that aren't from our bucket are ignored.
  async remove(url: string) {
    try {
      await deleteObject(ref(storage, url));
    } catch (error) {
      log.warn('Could not delete photo', error);
    }
  }
}
