// conversations/{clientUid}_{professionalId}
export type Conversation = {
  id: string;
  clientUid: string;
  clientName: string;
  // The photo of the client's account (Google), when there is one
  clientImage?: string;
  professionalId: string;
  lastMessage: string;
  lastMessageAt: Date | null;
  // Unread messages for the logged in user
  unread: number;
};

// conversations/{id}/messages/{id}
export type ChatMessage = {
  id: string;
  senderUid: string;
  text?: string;
  image?: string;
  // Any other file sent from the device
  file?: { url: string; name: string };
  createdAt: Date | null;
};

// What goes into a new message
export type MessageContent = Pick<ChatMessage, 'text' | 'image' | 'file'>;

export type TextPart = { text: string; bold?: boolean };

// users/{uid}/notifications/{id}
export type Notification = {
  id: string;
  icon: 'calendar' | 'payment' | 'offer';
  text: TextPart[];
  unread: boolean;
  createdAt: Date | null;
};
