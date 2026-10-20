import { MatIconModule } from '@angular/material/icon';
import { Component, computed, input } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
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

type Row = Conversation & {
  title: string;
  image: string | null;
  imagePosition?: ImagePosition;
  link: string[];
};

@Component({
  selector: 'app-inbox',
  imports: [FocusPipe, Spinner, RouterLink, FormsModule, NgTemplateOutlet, MatIconModule],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox {
  readonly tab = input<'mensagens' | 'notificacoes'>('mensagens');

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
            image: null,
            link: ['/pro/mensagens', conversation.id],
          },
        ];
      }

      const artist = this.professionals.byId(conversation.professionalId);
      return artist
        ? [{
            ...conversation,
            title: artist.name,
            image: artist.image,
            imagePosition: artist.imagePosition,
            link: ['/mensagens', artist.id],
          }]
        : [];
    }),
  );

  protected search = '';

  constructor(
    protected readonly auth: Auth,
    protected readonly notifications: Notifications,
    private readonly messages: Messages,
    private readonly professionals: Professionals,
    private readonly router: Router,
  ) {}

  // Every notification is about a booking: the professional goes to the agenda (new requests are there)
  // and the client to their bookings
  protected openNotification(notification: Notification) {
    if (notification.unread) {
      this.notifications.markAsRead(notification.id).catch((error) => console.error('Failed to mark as read', error));
    }
    this.router.navigateByUrl(this.auth.role() === 'professional' ? '/pro' : '/agenda');
  }

  protected get filteredConversations() {
    const term = this.search.trim().toLowerCase();
    return this.conversations().filter(({ title }) => !term || title.toLowerCase().includes(term));
  }
}
