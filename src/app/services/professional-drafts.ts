import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { COLLECTIONS } from '../../../shared/domain';
import { DraftForm, draftFields, draftToForm } from '../utils/drafts';
import { db, functions } from './firebase';
import { Photos } from './photos';
import { Auth } from './auth';

export type ProfessionalDraft = {
  id: string;
  form: DraftForm;
  invited: boolean;
  invitedAt: Date | null;
  // Milliseconds; null when the invite was never sent
  inviteExpiresAt: number | null;
  createdAt: Date | null;
};

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : null);

// Profiles an admin makes for professionals who have no account yet. They are not public: only admins read
// `professionalDrafts` (see firestore.rules). An invite link lets the professional claim one; claiming copies it
// to `professionals/{uid}` (Cloud Function claimProfessionalDraft).
@Injectable({ providedIn: 'root' })
export class ProfessionalDrafts {
  private readonly photos = inject(Photos);
  private readonly auth = inject(Auth);

  // A new id, so the photo can be uploaded before the first save
  newId() {
    return doc(collection(db, COLLECTIONS.professionalDrafts)).id;
  }

  async list() {
    const snapshot = await getDocs(collection(db, COLLECTIONS.professionalDrafts));
    return snapshot.docs
      .map((d) => this.fromData(d.id, d.data()))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async get(id: string) {
    const snapshot = await getDoc(doc(db, COLLECTIONS.professionalDrafts, id));
    return snapshot.exists() ? this.fromData(id, snapshot.data()) : null;
  }

  // Creates the draft when it does not exist, and only changes the typed fields when it does (the invite stays)
  async save(id: string, form: DraftForm, isNew: boolean) {
    const ref = doc(db, COLLECTIONS.professionalDrafts, id);
    if (!isNew) return updateDoc(ref, draftFields(form));

    return setDoc(ref, {
      ...draftFields(form),
      createdBy: this.auth.user()?.uid ?? '',
      createdAt: serverTimestamp(),
    });
  }

  // Makes the invite link, to send by hand. A new one replaces the old: the previous link stops working. The link
  // is only shown now (the server keeps the hash of its token).
  async createInviteLink(id: string) {
    const { data } = await httpsCallable<{ draftId: string }, { ok: boolean; url: string }>(
      functions,
      'createProfessionalInvite',
    )({ draftId: id });
    return data.url;
  }

  // The link stops working
  revokeInvite(id: string) {
    return updateDoc(doc(db, COLLECTIONS.professionalDrafts, id), {
      inviteHash: deleteField(),
      inviteExpiresAt: deleteField(),
      invitedAt: deleteField(),
    });
  }

  uploadPhoto(id: string, folder: 'profile' | 'gallery' | 'services', file: File) {
    return this.photos.upload(id, folder, file, 'professionalDrafts');
  }

  removePhoto(url: string) {
    return this.photos.remove(url);
  }

  async remove(id: string, urls: string[]) {
    await deleteDoc(doc(db, COLLECTIONS.professionalDrafts, id));
    await Promise.all(urls.map((url) => this.photos.remove(url)));
  }

  private fromData(id: string, data: Record<string, unknown>): ProfessionalDraft {
    const expires = data['inviteExpiresAt'];
    return {
      id,
      form: draftToForm(data),
      invited: typeof data['inviteHash'] === 'string',
      invitedAt: toDate(data['invitedAt']),
      inviteExpiresAt: typeof expires === 'number' ? expires : null,
      createdAt: toDate(data['createdAt']),
    };
  }
}
