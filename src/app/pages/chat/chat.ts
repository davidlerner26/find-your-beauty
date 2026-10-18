import { Component, computed, effect, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatMessage } from '../../models/message';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Professionals } from '../../services/professionals';
import { formatClock } from '../../utils/format-date';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  readonly id = input.required<string>();

  protected readonly artist = computed(() => this.professionals.byId(this.id()));
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly clock = formatClock;
  protected draft = '';

  constructor(
    private readonly location: Location,
    private readonly messagesService: Messages,
    protected readonly auth: Auth,
    protected readonly professionals: Professionals,
  ) {
    // Live messages of this conversation
    effect((onCleanup) => {
      onCleanup(this.messagesService.watch(this.id(), (messages) => this.messages.set(messages)));
    });

    // Opening the conversation clears its unread counter
    effect(() => {
      const conversation = this.messagesService
        .conversations()
        .find((item) => item.professionalId === this.id());
      if (conversation?.unread) this.messagesService.markAsRead(this.id());
    });
  }

  protected goBack() {
    this.location.back();
  }

  protected send() {
    const text = this.draft.trim();
    if (!text) return;

    this.draft = '';
    this.messagesService
      .send(this.id(), text)
      .catch((error) => console.error('Failed to send message', error));
  }
}
