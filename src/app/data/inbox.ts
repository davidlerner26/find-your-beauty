export type Conversation = {
  artistId: string;
  lastMessage: string;
  time: string;
  unread: number;
};

export type TextPart = { text: string; bold?: boolean };

export type Notification = {
  icon: 'calendar' | 'payment' | 'offer';
  text: TextPart[];
  time: string;
  unread?: boolean;
};

export type ChatMessage = {
  from: 'me' | 'artist';
  text?: string;
  image?: string;
  time: string;
  read?: boolean;
};

export const CONVERSATIONS: Conversation[] = [
  { artistId: 'fernanda-lima', lastMessage: 'Bom dia, em que podemos ajudar?', time: '11:32', unread: 2 },
  { artistId: 'camila-torres', lastMessage: 'Bom dia, em que podemos ajudar?', time: '11:32', unread: 2 },
  { artistId: 'rafaela-duarte', lastMessage: 'Gostaria de agendar um horário...', time: 'Ontem', unread: 0 },
  { artistId: 'mariana-costa', lastMessage: 'Gostaria de agendar um horário...', time: 'Ontem', unread: 0 },
  { artistId: 'juliana-prado', lastMessage: 'Gostaria de agendar um horário...', time: 'Ontem', unread: 0 },
];

export const NEW_NOTIFICATIONS: Notification[] = [
  {
    icon: 'calendar',
    text: [
      { text: 'Lembrete!', bold: true },
      { text: ' Prepare-se para o seu horário às 9h' },
    ],
    time: 'Agora',
    unread: true,
  },
];

export const EARLIER_NOTIFICATIONS: Notification[] = [
  {
    icon: 'payment',
    text: [
      { text: 'Pagamento para ' },
      { text: 'Fernanda Lima', bold: true },
      { text: ' realizado com sucesso!' },
    ],
    time: '11:32',
    unread: true,
  },
  {
    icon: 'calendar',
    text: [
      { text: 'Você agendou um horário com ' },
      { text: 'Fernanda Lima', bold: true },
    ],
    time: 'Ontem',
  },
  {
    icon: 'offer',
    text: [
      { text: 'Ganhe ' },
      { text: '20%', bold: true },
      { text: ' de desconto em maquiagem com Fernanda Lima' },
    ],
    time: 'Há 2 dias',
  },
  {
    icon: 'offer',
    text: [
      { text: 'Ganhe ' },
      { text: '10%', bold: true },
      { text: ' de desconto em penteados com Camila Torres' },
    ],
    time: 'Há 2 dias',
  },
  {
    icon: 'calendar',
    text: [
      { text: 'Lembrete!', bold: true },
      { text: ' Prepare-se para o seu horário às 9h' },
    ],
    time: '3 mar',
  },
];

export const SAMPLE_CHAT: ChatMessage[] = [
  { from: 'me', text: 'Olá, bom dia :)', time: '11:20', read: true },
  { from: 'artist', text: 'Bom dia, em que podemos ajudar?', time: '11:20' },
  { from: 'me', text: 'Esse look ficou incrível 😍', time: '11:20' },
  { from: 'me', image: 'images/makeup/5.jpg', time: '11:20' },
  { from: 'me', text: 'Gostaria de agendar um horário hoje às 14:30.', time: '11:20', read: true },
];
