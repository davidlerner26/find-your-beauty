import { computed, effect, Injectable, signal, inject } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ChatMessage, Conversation, MessageContent } from '../models/message';
import { Professional } from '../models/professional';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { resizeImage } from '../utils/image';
import { Auth } from './auth';
import { db, storage } from './firebase';
import { log } from '../utils/log';
import { COLLECTIONS } from '../../../shared/domain';

// What the conversation list shows for the last message
const preview = (content: MessageContent) =>
  content.text ?? (content.image ? 'Foto' : (content.file?.name ?? ''));

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : null);

@Injectable({ providedIn: 'root' })
export class Messages {
  private readonly auth = inject(Auth);

  readonly conversations = signal<Conversation[]>([]);
  // The text of every message of each conversation, loaded when the user searches (conversation id -> messages)
  readonly texts = signal<Record<string, string[]>>({});
  private readonly textsLoadedAt = new Map<string, number>();
  readonly unreadTotal = computed(() =>
    this.conversations().reduce((sum, conversation) => sum + conversation.unread, 0),
  );

  constructor() {
    // Keeps the conversation list in sync with the logged in user (client or professional)
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid) {
        this.conversations.set([]);
        return;
      }

      const q = query(
        collection(db, COLLECTIONS.conversations),
        where('participants', 'array-contains', uid),
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d): Conversation => {
            const data = d.data({ serverTimestamps: 'estimate' });
            const isClient = data['clientUid'] === uid;
            return {
              id: d.id,
              clientUid: data['clientUid'],
              clientName: data['clientName'] ?? '',
              clientImage: data['clientImage'] || undefined,
              professionalId: data['professionalId'],
              lastMessage: data['lastMessage'] ?? '',
              lastMessageAt: toDate(data['lastMessageAt']),
              unread: (isClient ? data['unreadClient'] : data['unreadProfessional']) ?? 0,
            };
          });
          // Sorted here to avoid a composite index
          list.sort(
            (a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
          );
          this.conversations.set(list);
        },
        (error) => log.error('Failed to load conversations', error),
      );
      onCleanup(unsubscribe);
    });
  }

  // Loads the messages of the conversations (again only when a conversation got a new message), so the list can be
  // searched by anything that was said
  async loadTexts() {
    const stale = this.conversations().filter(
      (conversation) =>
        this.textsLoadedAt.get(conversation.id) !== (conversation.lastMessageAt?.getTime() ?? 0),
    );
    if (!stale.length) return;

    const loaded = await Promise.all(
      stale.map(async (conversation) => {
        const snapshot = await getDocs(
          collection(db, COLLECTIONS.conversations, conversation.id, COLLECTIONS.messages),
        ).catch((error) => {
          log.error('Failed to load the messages of a conversation', error);
          return null;
        });
        if (!snapshot) return null;
        this.textsLoadedAt.set(conversation.id, conversation.lastMessageAt?.getTime() ?? 0);
        const texts = snapshot.docs
          .sort(
            (a, b) => (a.data()['createdAt']?.seconds ?? 0) - (b.data()['createdAt']?.seconds ?? 0),
          )
          .map(
            (d) =>
              (d.data()['text'] as string | undefined) ||
              (d.data()['file']?.name as string | undefined) ||
              '',
          )
          .filter(Boolean);
        return [conversation.id, texts] as const;
      }),
    );
    this.texts.update((current) => ({
      ...current,
      ...Object.fromEntries(loaded.filter((entry) => entry !== null)),
    }));
  }

  clientConversationId(professionalId: string) {
    return `${this.auth.user()?.uid}_${professionalId}`;
  }

  // Calls `onChange` with every update of the conversation. Returns the unsubscribe.
  watch(conversationId: string, onChange: (messages: ChatMessage[]) => void) {
    if (!this.auth.user()) {
      onChange([]);
      return () => undefined;
    }

    const q = query(
      collection(db, COLLECTIONS.conversations, conversationId, COLLECTIONS.messages),
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
              senderUid: data['senderUid'],
              text: data['text'],
              image: data['image'],
              file: data['file'],
              createdAt: toDate(data['createdAt']),
            };
          }),
        ),
      (error) => log.error('Failed to load messages', error),
    );
  }

  // The client starts (or continues) a conversation with a professional
  async sendAsClient(professional: Professional, content: MessageContent) {
    const user = this.auth.user();
    if (!user) return;

    const conversation = doc(
      db,
      COLLECTIONS.conversations,
      this.clientConversationId(professional.id),
    );
    const message = doc(collection(conversation, COLLECTIONS.messages));

    const batch = writeBatch(db);
    batch.set(message, { senderUid: user.uid, ...content, createdAt: serverTimestamp() });
    batch.set(
      conversation,
      {
        // Demo professionals have no account, so the conversation only has the client
        participants: professional.ownerUid ? [user.uid, professional.ownerUid] : [user.uid],
        clientUid: user.uid,
        clientName: user.displayName || user.email || 'Cliente',
        clientImage: user.photoURL ?? '',
        professionalId: professional.id,
        lastMessage: preview(content),
        lastMessageAt: serverTimestamp(),
        unreadProfessional: increment(1),
      },
      { merge: true },
    );
    await batch.commit();
  }

  async sendAsProfessional(conversationId: string, content: MessageContent) {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    const conversation = doc(db, COLLECTIONS.conversations, conversationId);
    const message = doc(collection(conversation, COLLECTIONS.messages));

    const batch = writeBatch(db);
    batch.set(message, { senderUid: uid, ...content, createdAt: serverTimestamp() });
    batch.update(conversation, {
      lastMessage: preview(content),
      lastMessageAt: serverTimestamp(),
      unreadClient: increment(1),
    });
    await batch.commit();
  }

  // Uploads a file of the device to the conversation: photos are resized and shown inline
  async upload(conversationId: string, file: File): Promise<MessageContent> {
    const isImage = file.type.startsWith('image/');
    const name = `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
    const target = ref(
      storage,
      `chats/${conversationId}/${isImage ? name.replace(/\.[^.]*$/, '') + '.jpg' : name}`,
    );

    if (isImage) {
      await uploadBytes(target, await resizeImage(file), { contentType: 'image/jpeg' });
      return { image: await getDownloadURL(target) };
    }
    await uploadBytes(target, file);
    return { file: { url: await getDownloadURL(target), name: file.name } };
  }

  async markAsRead(conversation: Conversation) {
    const isClient = this.auth.user()?.uid === conversation.clientUid;
    await updateDoc(doc(db, COLLECTIONS.conversations, conversation.id), {
      [isClient ? 'unreadClient' : 'unreadProfessional']: 0,
    });
  }
}
