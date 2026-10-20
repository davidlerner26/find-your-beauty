import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, input, signal } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatMessage, MessageContent } from '../../models/message';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Professionals } from '../../services/professionals';
import { formatClock } from '../../utils/format-date';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// `id` is the professional id for clients and the conversation id in the professional area
@Component({
  selector: 'app-chat',
  imports: [FocusPipe, Spinner, FormsModule, RouterLink, MatIconModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  readonly id = input.required<string>();
  readonly pro = input(false);

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly clock = formatClock;
  protected draft = '';
  protected readonly uploading = signal(false);
  protected readonly attachError = signal('');

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
      return conversation ? { name: conversation.clientName, image: null, position: undefined } : null;
    }
    const professional = this.professional();
    return professional
      ? { name: professional.name, image: professional.image, position: professional.imagePosition }
      : null;
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

    this.draft = '';
    this.deliver({ text })?.catch((error) => console.error('Failed to send message', error));
  }

  // The clip button: sends each chosen file of the device as a message
  protected async attach(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    this.attachError.set('');
    this.uploading.set(true);
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          this.attachError.set('Cada arquivo pode ter até 10 MB.');
          continue;
        }
        await this.deliver(await this.messagesService.upload(this.conversationId(), file));
      }
    } catch (error) {
      console.error('Failed to send file', error);
      this.attachError.set('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      this.uploading.set(false);
    }
  }

  private deliver(content: MessageContent) {
    return this.pro()
      ? this.messagesService.sendAsProfessional(this.conversationId(), content)
      : this.professional()
        ? this.messagesService.sendAsClient(this.professional()!, content)
        : null;
  }
}
