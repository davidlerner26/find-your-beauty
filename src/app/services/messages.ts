import { computed, effect, Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { ChatMessage, Conversation } from '../models/message';
import { Auth } from './auth';
import { db } from './firebase';

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : null);

@Injectable({ providedIn: 'root' })
export class Messages {
  readonly conversations = signal<Conversation[]>([]);
  readonly unreadTotal = computed(() =>
    this.conversations().reduce((sum, conversation) => sum + conversation.unread, 0),
  );

  constructor(private readonly auth: Auth) {
    // Keeps the conversation list in sync with the logged in user
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid) {
        this.conversations.set([]);
        return;
      }

      const q = query(
        collection(db, 'users', uid, 'conversations'),
        orderBy('lastMessageAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) =>
          this.conversations.set(
            snapshot.docs.map((d) => {
              const data = d.data({ serverTimestamps: 'estimate' });
              return {
                professionalId: d.id,
                lastMessage: data['lastMessage'] ?? '',
                lastMessageAt: toDate(data['lastMessageAt']),
                unread: data['unread'] ?? 0,
              };
            }),
          ),
        (error) => console.error('Failed to load conversations', error),
      );
      onCleanup(unsubscribe);
    });
  }

  // Calls `onChange` with every update of the messages with a professional. Returns the unsubscribe.
  watch(professionalId: string, onChange: (messages: ChatMessage[]) => void) {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      onChange([]);
      return () => {};
    }

    const q = query(
      collection(db, 'users', uid, 'conversations', professionalId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(
      q,
      (snapshot) =>
        onChange(
          snapshot.docs.map((d) => {
            const data = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              from: data['from'],
              text: data['text'],
              image: data['image'],
              createdAt: toDate(data['createdAt']),
            };
          }),
        ),
      (error) => console.error('Failed to load messages', error),
    );
  }

  async send(professionalId: string, text: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    const conversation = doc(db, 'users', uid, 'conversations', professionalId);
    const message = doc(collection(conversation, 'messages'));

    const batch = writeBatch(db);
    batch.set(message, { from: 'user', text, createdAt: serverTimestamp() });
    batch.set(
      conversation,
      { lastMessage: text, lastMessageAt: serverTimestamp(), unread: 0 },
      { merge: true },
    );
    await batch.commit();
  }

  async markAsRead(professionalId: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    await setDoc(doc(db, 'users', uid, 'conversations', professionalId), { unread: 0 }, { merge: true });
  }
}
