// users/{uid}/conversations/{professionalId}
export type Conversation = {
  professionalId: string;
  lastMessage: string;
  lastMessageAt: Date | null;
  unread: number;
};

// users/{uid}/conversations/{professionalId}/messages/{id}
export type ChatMessage = {
  id: string;
  from: 'user' | 'professional';
  text?: string;
  image?: string;
  createdAt: Date | null;
};

export type TextPart = { text: string; bold?: boolean };

// users/{uid}/notifications/{id}
export type Notification = {
  id: string;
  icon: 'calendar' | 'payment' | 'offer';
  text: TextPart[];
  unread: boolean;
  createdAt: Date | null;
};
