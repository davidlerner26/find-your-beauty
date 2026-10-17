import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MAKEUP_ARTISTS } from '../../data/makeup-artists';
import { CONVERSATIONS, EARLIER_NOTIFICATIONS, NEW_NOTIFICATIONS } from '../../data/inbox';

@Component({
  selector: 'app-inbox',
  imports: [RouterLink, FormsModule, NgTemplateOutlet],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox {
  readonly tab = input<'mensagens' | 'notificacoes'>('mensagens');

  protected readonly newNotifications = NEW_NOTIFICATIONS;
  protected readonly earlierNotifications = EARLIER_NOTIFICATIONS;

  protected readonly conversations = computed(() =>
    CONVERSATIONS.flatMap((conversation) => {
      const artist = MAKEUP_ARTISTS.find((a) => a.id === conversation.artistId);
      return artist ? [{ ...conversation, artist }] : [];
    }),
  );

  protected search = '';

  protected get filteredConversations() {
    const term = this.search.trim().toLowerCase();
    return this.conversations().filter(
      ({ artist }) => !term || artist.name.toLowerCase().includes(term),
    );
  }
}
