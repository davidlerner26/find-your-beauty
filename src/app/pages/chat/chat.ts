import { Component, computed, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, SAMPLE_CHAT } from '../../data/inbox';
import { MAKEUP_ARTISTS } from '../../data/makeup-artists';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  readonly id = input.required<string>();

  protected readonly artist = computed(() =>
    MAKEUP_ARTISTS.find((artist) => artist.id === this.id()),
  );
  protected readonly messages = signal<ChatMessage[]>(SAMPLE_CHAT);
  protected draft = '';

  constructor(private readonly location: Location) {}

  protected goBack() {
    this.location.back();
  }

  protected send() {
    const text = this.draft.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    this.messages.update((messages) => [...messages, { from: 'me', text, time }]);
    this.draft = '';
  }
}
