import { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import { Professional } from './professional';
import { UserProfile } from './user';

// The only place where what comes from Firestore is trusted to have the shape of the models.
// They only read: the writes go through the repositories, which know which fields each write may set.

// professionals/{id}: the document id becomes `id`
export const professionalConverter: FirestoreDataConverter<Professional> = {
  toFirestore: ({ id, ...data }) => {
    void id;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot) => ({
    ...(snapshot.data() as Omit<Professional, 'id'>),
    id: snapshot.id,
  }),
};

// users/{uid}
export const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (user) => user,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data() as UserProfile,
};
