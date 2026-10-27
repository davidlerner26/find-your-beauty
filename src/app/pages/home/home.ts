import { CarouselArrows } from '../../components/carousel-arrows/carousel-arrows';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { Component, computed, signal, inject } from '@angular/core';
import { Favorites } from '../../services/favorites';
import { Auth } from '../../services/auth';
import { UserLocation } from '../../services/user-location';
import { Spinner } from '../../components/spinner/spinner';
import { LocationPrompt } from '../../components/location-prompt/location-prompt';
import {
  hasLocation,
  ImagePosition,
  shortLocationLabel,
  Professional,
  SERVICE_ICONS,
  SERVICE_NAMES,
  ServiceCategory,
} from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { distanceKm, formatDistance } from '../../utils/geo';
import { T } from '../../utils/texts';
import { environment } from '../../../environments/environment';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { log } from '../../utils/log';

const CATEGORY_ICONS: Record<string, string> = { Maquiagem: 'brush', Cabelo: 'content_cut' };

type Salon = {
  id: string;
  tags: string;
  tagList: string[];
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
  imports: [
    CarouselArrows,
    CatalogPipe,
    ReviewsLabelPipe,
    FocusPipe,
    RouterLink,
    LocationPrompt,
    Spinner,
    MatIconModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(Auth);
  protected readonly professionals = inject(Professionals);
  private readonly userLocation = inject(UserLocation);
  protected readonly favorites = inject(Favorites);

  protected readonly t = T;
  // The section of featured professionals is only shown in the test environment for now
  protected readonly showFeatured = environment.features.featuredProfessionals;
  protected readonly firstName = computed(
    () => this.auth.user()?.displayName?.trim().split(/\s+/)[0] || $localize`visitante`,
  );

  private readonly salons = computed<Salon[]>(() =>
    this.professionals.published().map((professional) => this.toSalon(professional)),
  );

  protected readonly featuredSalons = computed(() =>
    [...this.salons()].sort((a, b) => b.rating - a.rating).slice(0, 8),
  );

  // The professionals the client hearted
  protected readonly followed = computed(() => {
    const ids = this.favorites.ids();
    return this.salons().filter((salon) => ids.includes(salon.id));
  });

  // Chips of "Mais buscados": both start selected and they can be selected together
  protected readonly interests = ['Maquiagem', 'Cabelo'];
  protected readonly activeInterests = signal<string[]>([...this.interests]);

  // At least one chip always stays selected
  protected toggleInterest(interest: string) {
    this.activeInterests.update((active) => {
      if (!active.includes(interest)) return [...active, interest];
      return active.length > 1 ? active.filter((i) => i !== interest) : active;
    });
  }

  protected readonly nearbyOffers = computed(() =>
    [...this.salons()]
      // With every chip selected nothing is filtered out, even professionals with other tags
      .filter((salon) => {
        const active = this.activeInterests();
        return (
          active.length === this.interests.length ||
          salon.tagList.some((tag) => active.includes(tag))
        );
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 3),
  );

  // Photo being shown in each featured card
  // Photos that finished loading (or failed), so the spinner stops
  protected readonly loadedPhotos = signal<string[]>([]);
  protected readonly photoIndex = signal<Record<string, number | undefined>>({});

  // The heart sits inside a card that is a link: it must not open the page
  protected toggleFavorite(event: Event, id: string) {
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => log.error('Failed to update favorite', error));
  }

  protected photoLoaded(url: string) {
    this.loadedPhotos.update((urls) => (urls.includes(url) ? urls : [...urls, url]));
  }

  protected onPhotosScroll(event: Event, id: string) {
    const element = event.target as HTMLElement;
    const index = Math.round(element.scrollLeft / element.clientWidth);
    if (this.photoIndex()[id] !== index)
      this.photoIndex.update((current) => ({ ...current, [id]: index }));
  }

  private toSalon(professional: Professional): Salon {
    const position = this.userLocation.position();
    const km =
      position && hasLocation(professional) ? distanceKm(position, professional.position) : null;

    return {
      id: professional.id,
      name: professional.name,
      image: professional.image,
      imagePosition: professional.imagePosition,
      photos: professional.gallery.length ? professional.gallery : [professional.image],
      address: shortLocationLabel(professional),
      rating: professional.rating,
      reviews: professional.reviewsCount,
      tags: professional.tags.join(' . '),
      tagList: professional.tags,
      distance: km === null ? null : formatDistance(km),
      distanceKm: km,
    };
  }

  // The names of the services that at least one published professional offers
  private readonly offeredServices = computed(
    () =>
      new Set(
        this.professionals
          .published()
          .flatMap((professional) => professional.services.map((service) => service.name)),
      ),
  );

  // The services of the categories selected in "Categorias", only the ones some professional offers
  // One row per category: Maquiagem on the first line, Cabelo on the second
  protected readonly serviceRows = computed(() =>
    this.interests
      .filter((category) => this.activeInterests().includes(category))
      .map((category) => ({
        category,
        services: SERVICE_NAMES[category as ServiceCategory]
          .filter((name) => this.offeredServices().has(name))
          .map((name) => ({ name, icon: SERVICE_ICONS[name] ?? CATEGORY_ICONS[category] })),
      }))
      // A category without any service on offer leaves no empty line
      .filter((row) => row.services.length),
  );
}
