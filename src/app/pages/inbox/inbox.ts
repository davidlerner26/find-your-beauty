import { MatIconModule } from '@angular/material/icon';
import { Component, computed, input, inject } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { Chat } from '../chat/chat';
import { Spinner } from '../../components/spinner/spinner';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Conversation, Notification } from '../../models/message';
import { ImagePosition } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Notifications } from '../../services/notifications';
import { Professionals } from '../../services/professionals';
import { formatRelative } from '../../utils/format-date';
import { T } from '../../utils/texts';
import { log } from '../../utils/log';

// Ignores the case and the accents, so "nao" finds "não"
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

type Row = Conversation & {
  title: string;
  image: string | null;
  imagePosition?: ImagePosition;
  link: string[];
};

@Component({
  selector: 'app-inbox',
  imports: [Chat, FocusPipe, Spinner, RouterLink, FormsModule, NgTemplateOutlet, MatIconModule],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox {
  protected readonly auth = inject(Auth);
  protected readonly notifications = inject(Notifications);
  private readonly messages = inject(Messages);
  private readonly professionals = inject(Professionals);
  private readonly router = inject(Router);

  protected readonly t = T;
  readonly tab = input<'mensagens' | 'notificacoes'>('mensagens');
  // The conversation that is open (the professional id for clients, the conversation id for professionals)
  readonly id = input<string>();

  // The messages screen: the list and the chat side by side (a visitor only sees it with a chat open)
  protected readonly isSplit = computed(
    () => this.tab() === 'mensagens' && this.auth.ready() && (!!this.auth.user() || !!this.id()),
  );

  protected readonly relative = formatRelative;

  protected readonly newNotifications = computed(() =>
    this.notifications.list().filter((notification) => notification.unread),
  );
  protected readonly earlierNotifications = computed(() =>
    this.notifications.list().filter((notification) => !notification.unread),
  );

  // The professional area lives under /pro and shows the clients instead of the professionals
  protected readonly base = computed(() => (this.auth.role() === 'professional' ? '/pro' : ''));

  protected readonly conversations = computed(() =>
    this.messages.conversations().flatMap((conversation): Row[] => {
      if (this.auth.role() === 'professional') {
        return [
          {
            ...conversation,
            title: conversation.clientName,
            image: conversation.clientImage ?? null,
            link: ['/pro/mensagens', conversation.id],
          },
        ];
      }

      const artist = this.professionals.byId(conversation.professionalId);
      return artist
        ? [
            {
              ...conversation,
              title: artist.name,
              image: artist.image,
              imagePosition: artist.imagePosition,
              link: ['/mensagens', artist.id],
            },
          ]
        : [];
    }),
  );

  protected search = '';

  // Every notification is about a booking: the professional goes to the agenda (new requests are there)
  // and the client to their bookings
  protected openNotification(notification: Notification) {
    if (notification.unread) {
      this.notifications
        .markAsRead(notification.id)
        .catch((error) => log.error('Failed to mark as read', error));
    }
    this.router.navigateByUrl(this.auth.role() === 'professional' ? '/pro' : '/agenda');
  }

  // Looks in the name and in everything that was said; a match in a message shows that message instead of the last one
  protected get filteredConversations() {
    const term = fold(this.search.trim());
    if (!term) return this.conversations();

    const texts = this.messages.texts();
    return this.conversations().flatMap((conversation) => {
      if (fold(conversation.title).includes(term)) return [conversation];
      const found = (texts[conversation.id] ?? []).find((text) => fold(text).includes(term));
      return found ? [{ ...conversation, lastMessage: found }] : [];
    });
  }

  protected onSearch() {
    if (this.search.trim()) void this.messages.loadTexts();
  }
}
