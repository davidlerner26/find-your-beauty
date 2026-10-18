// conversations/{clientUid}_{professionalId}
export type Conversation = {
  id: string;
  clientUid: string;
  clientName: string;
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
