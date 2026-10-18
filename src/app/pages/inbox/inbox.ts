import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Messages } from '../../services/messages';
import { Notifications } from '../../services/notifications';
import { Professionals } from '../../services/professionals';
import { formatRelative } from '../../utils/format-date';

@Component({
  selector: 'app-inbox',
  imports: [RouterLink, FormsModule, NgTemplateOutlet],
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

  protected readonly conversations = computed(() =>
    this.messages.conversations().flatMap((conversation) => {
      const artist = this.professionals.byId(conversation.professionalId);
      return artist ? [{ ...conversation, artist }] : [];
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
    return this.conversations().filter(
      ({ artist }) => !term || artist.name.toLowerCase().includes(term),
    );
  }
}
