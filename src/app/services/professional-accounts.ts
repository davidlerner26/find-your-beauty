import { Injectable } from '@angular/core';
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { professionalConverter } from '../models/converters';
import { DEFAULT_AVAILABILITY, Professional, ServiceMode } from '../models/professional';
import { APP_LANGUAGE } from '../utils/locale';
import { db } from './firebase';

// What a professional edits in the own profile (everything but the fields only an admin can change)
export type ProfessionalUpdate = Partial<
  Omit<
    Professional,
    'id' | 'ownerUid' | 'approved' | 'admin' | 'rating' | 'reviewsCount' | 'views' | 'serviceMode'
  >
> & {
  // A draft saved before any place was picked has none
  serviceMode?: ServiceMode | null;
};

// What the sign up asks for
export type NewProfessional = Pick<Professional, 'name' | 'email' | 'phone'> & { uid: string };

// The professional's own document, `professionals/{uid}`, and the private data next to it. It is light on purpose
// (no listeners): the catalog everyone sees is `Professionals`.
@Injectable({ providedIn: 'root' })
export class ProfessionalAccounts {
  // The sign up state of the account, or null when there is no professional document for the uid
  async status(uid: string) {
    const snapshot = await getDoc(
      doc(db, 'professionals', uid).withConverter(professionalConverter),
    );
    if (!snapshot.exists()) return null;
    const { approved, submitted, rejected } = snapshot.data();
    return { approved, submitted, rejected };
  }

  // The first step of the sign up. The account waits for an admin: the rules only accept `approved: false`.
  create({ uid, name, email, phone }: NewProfessional) {
    return setDoc(doc(db, 'professionals', uid), {
      ownerUid: uid,
      name,
      email,
      phone,
      image: '',
      address: '',
      tags: [],
      rating: 0,
      reviewsCount: '0',
      views: '0',
      about: [],
      services: [],
      gallery: [],
      position: { lat: 0, lng: 0 },
      visible: true,
      published: false,
      availability: DEFAULT_AVAILABILITY,
      // `submitted` becomes true when the profile is complete (second step of the sign up)
      approved: false,
      submitted: false,
      admin: false,
      lang: APP_LANGUAGE,
      createdAt: serverTimestamp(),
    });
  }

  // Saves the profile. The covers from before the single photo are removed from the document on the way.
  update(uid: string, fields: ProfessionalUpdate) {
    return updateDoc(doc(db, 'professionals', uid), {
      ...fields,
      coverImage: deleteField(),
      coverPosition: deleteField(),
    });
  }

  // The CPF is private: it lives in professionals/{uid}/private/identity, which only the owner and admins read
  async getCpf(uid: string): Promise<string> {
    const snapshot = await getDoc(doc(db, 'professionals', uid, 'private', 'identity'));
    return snapshot.data()?.['cpf'] ?? '';
  }

  saveCpf(uid: string, cpf: string) {
    return setDoc(doc(db, 'professionals', uid, 'private', 'identity'), { cpf }, { merge: true });
  }
}
