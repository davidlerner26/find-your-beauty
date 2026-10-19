import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Auth } from '../../services/auth';
import { Favorites as FavoritesService } from '../../services/favorites';
import { Professionals } from '../../services/professionals';
import { FocusPipe } from '../../utils/focus.pipe';

@Component({
  selector: 'app-favorites',
  imports: [FocusPipe, RouterLink, Spinner],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites {
  protected readonly items = computed(() =>
    this.professionals.published().filter((professional) => this.favorites.has(professional.id)),
  );

  constructor(
    protected readonly auth: Auth,
    protected readonly favorites: FavoritesService,
    protected readonly professionals: Professionals,
  ) {}

  protected remove(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => console.error('Failed to update favorite', error));
  }
}
