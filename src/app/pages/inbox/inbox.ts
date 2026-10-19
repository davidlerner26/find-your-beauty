import { Component, computed, input } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Conversation } from '../../models/message';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Notifications } from '../../services/notifications';
import { Professionals } from '../../services/professionals';
import { formatRelative } from '../../utils/format-date';

type Row = Conversation & { title: string; image: string | null; link: string[] };

@Component({
  selector: 'app-inbox',
  imports: [Spinner, RouterLink, FormsModule, NgTemplateOutlet],
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
        ? [{ ...conversation, title: artist.name, image: artist.image, link: ['/mensagens', artist.id] }]
        : [];
    }),
  );

  protected search = '';

  constructor(
    protected readonly auth: Auth,
    protected readonly notifications: Notifications,
    private readonly messages: Messages,
    private readonly professionals: Professionals,
  ) {}

  protected get filteredConversations() {
    const term = this.search.trim().toLowerCase();
    return this.conversations().filter(({ title }) => !term || title.toLowerCase().includes(term));
  }
}
