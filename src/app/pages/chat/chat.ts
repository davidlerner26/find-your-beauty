import { Component, computed, effect, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatMessage } from '../../models/message';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Professionals } from '../../services/professionals';
import { formatClock } from '../../utils/format-date';

// `id` is the professional id for clients and the conversation id in the professional area
@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  readonly id = input.required<string>();
  readonly pro = input(false);

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly clock = formatClock;
  protected draft = '';

  private readonly conversationId = computed(() =>
    this.pro() ? this.id() : this.messagesService.clientConversationId(this.id()),
  );

  private readonly conversation = computed(() =>
    this.messagesService.conversations().find((item) => item.id === this.conversationId()),
  );

  private readonly professional = computed(() =>
    this.professionals.byId(this.pro() ? (this.conversation()?.professionalId ?? '') : this.id()),
  );

  // Who is on the other side: the professional for clients, the client for professionals
  protected readonly peer = computed(() => {
    if (this.pro()) {
      const conversation = this.conversation();
      return conversation ? { name: conversation.clientName, image: null } : null;
    }
    const professional = this.professional();
    return professional ? { name: professional.name, image: professional.image } : null;
  });

  constructor(
    private readonly location: Location,
    private readonly messagesService: Messages,
    protected readonly auth: Auth,
    protected readonly professionals: Professionals,
  ) {
    // Live messages of this conversation
    effect((onCleanup) => {
      onCleanup(this.messagesService.watch(this.conversationId(), (messages) => this.messages.set(messages)));
    });

    // Opening the conversation clears its unread counter
    effect(() => {
      const conversation = this.conversation();
      if (conversation?.unread) this.messagesService.markAsRead(conversation);
    });
  }

  protected isMine(message: ChatMessage) {
    return message.senderUid === this.auth.user()?.uid;
  }

  protected goBack() {
    this.location.back();
  }

  protected send() {
    const text = this.draft.trim();
    if (!text) return;

    const sending = this.pro()
      ? this.messagesService.sendAsProfessional(this.conversationId(), text)
      : this.professional()
        ? this.messagesService.sendAsClient(this.professional()!, text)
        : null;

    this.draft = '';
    sending?.catch((error) => console.error('Failed to send message', error));
  }
}
