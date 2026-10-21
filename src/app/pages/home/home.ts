import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { Component, computed, signal } from '@angular/core';
import { Favorites } from '../../services/favorites';
import { Auth } from '../../services/auth';
import { UserLocation } from '../../services/user-location';
import { Spinner } from '../../components/spinner/spinner';
import { LocationPrompt } from '../../components/location-prompt/location-prompt';
import { ImagePosition, Professional } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { distanceKm, formatDistance } from '../../utils/geo';

type Salon = {
  id: string;
  tags: string;
  name: string;
  image: string;
  imagePosition?: ImagePosition;
  // Work photos shown in the featured card (the profile photo when there is no gallery)
  photos: string[];
  address: string;
  rating: number;
  reviews: string;
  distance: string | null;
  distanceKm: number | null;
};

@Component({
  selector: 'app-home',
  imports: [ReviewsLabelPipe, FocusPipe, RouterLink, LocationPrompt, Spinner, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly firstName = computed(
    () => this.auth.user()?.displayName?.trim().split(/\s+/)[0] || 'visitante',
  );

  private readonly salons = computed<Salon[]>(() =>
    this.professionals.published().map((professional) => this.toSalon(professional)),
  );

  protected readonly featuredSalons = computed(() =>
    [...this.salons()].sort((a, b) => b.rating - a.rating).slice(0, 4),
  );

  // The professionals the client hearted
  protected readonly followed = computed(() => {
    const ids = this.favorites.ids();
    return this.salons().filter((salon) => ids.includes(salon.id));
  });

  protected readonly nearbyOffers = computed(() =>
    [...this.salons()]
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 3),
  );

  // Photo being shown in each featured card
  // Photos that finished loading (or failed), so the spinner stops
  protected readonly loadedPhotos = signal<string[]>([]);
  protected readonly photoIndex = signal<Record<string, number>>({});

  constructor(
    private readonly auth: Auth,
    protected readonly professionals: Professionals,
    private readonly userLocation: UserLocation,
    protected readonly favorites: Favorites,
  ) {}

  // The heart sits inside a card that is a link: it must not open the page
  protected toggleFavorite(event: Event, id: string) {
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => console.error('Failed to update favorite', error));
  }

  protected photoLoaded(url: string) {
    this.loadedPhotos.update((urls) => (urls.includes(url) ? urls : [...urls, url]));
  }

  protected onPhotosScroll(event: Event, id: string) {
    const element = event.target as HTMLElement;
    const index = Math.round(element.scrollLeft / element.clientWidth);
    if (this.photoIndex()[id] !== index) this.photoIndex.update((current) => ({ ...current, [id]: index }));
  }

  private toSalon(professional: Professional): Salon {
    const position = this.userLocation.position();
    const km = position ? distanceKm(position, professional.position) : null;

    return {
      id: professional.id,
      name: professional.name,
      image: professional.image,
      imagePosition: professional.imagePosition,
      photos: professional.gallery.length ? professional.gallery : [professional.image],
      address: professional.address,
      rating: professional.rating,
      reviews: professional.reviewsCount,
      tags: professional.tags.join(' . '),
      distance: km === null ? null : formatDistance(km),
      distanceKm: km,
    };
  }

  protected readonly services = [
    {
      name: 'Corte',
      icon: 'M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 4 8.12 15.88 M14.47 14.48 20 20 M8.12 8.12 12 12',
    },
    { name: 'Unhas', icon: 'M9 10h6v12H9z M10 10V6h4v4 M11 2h2v4h-2z' },
    {
      name: 'Coloração',
      icon: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
    },
    {
      name: 'Spa',
      icon: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
    },
    { name: 'Depilação', icon: 'M8 10h8v12H8z M12 2c1.5 2 2 3 0 5-2-2-1.5-3 0-5z' },
    { name: 'Maquiagem', icon: 'M9 11h6v11H9z M10 5h4v6h-4z M11 2h2v3h-2z' },
    {
      name: 'Massagem',
      icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    },
  ];

  protected readonly interests = ['Cabelo', 'Maquiagem'];
}
