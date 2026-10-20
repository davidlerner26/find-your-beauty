import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FocusPipe } from '../../utils/focus.pipe';
import { Component, computed, effect, ElementRef, input, OnInit, signal } from '@angular/core';
import { GoogleMap, MapCircle, MapMarker } from '@angular/google-maps';
import { Spinner } from '../../components/spinner/spinner';
import { Favorites } from '../../services/favorites';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import { distanceKm, formatDistance } from '../../utils/geo';
import { environment } from '../../../environments/environment';

const pin = (color: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`,
  );

@Component({
  selector: 'app-explore',
  imports: [FocusPipe, GoogleMap, MapMarker, MapCircle, RouterLink, Spinner, MatIconModule],
  templateUrl: './explore.html',
  styleUrl: './explore.scss',
})
export class Explore implements OnInit {
  protected readonly hasKey = !!environment.googleMapsApiKey;
  protected readonly loaded = signal(false);

  protected readonly center = signal<google.maps.LatLngLiteral>({
    lat: -22.9845,
    lng: -43.205,
  });
  protected readonly userPosition = computed(() => this.userLocation.position());
  protected readonly zoom = 14;
  protected readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
  };
  protected readonly circleOptions: google.maps.CircleOptions = {
    strokeColor: '#ee8b2e',
    strokeWeight: 1,
    fillColor: '#f6d58a',
    fillOpacity: 0.4,
  };

  protected readonly filters = ['Cabelo', 'Maquiagem'];
  // Tag chosen on the home page (?tag=Cabelo)
  readonly tag = input<string>();
  // Every chip starts selected, unless a tag came from the home page
  protected readonly activeFilters = signal<string[]>([...this.filters]);
  protected readonly selected = signal(0);
  // Card photos that finished loading (or failed), so the spinner stops
  protected readonly loadedPhotos = signal<string[]>([]);

  constructor(
    private readonly loader: GoogleMapsLoader,
    protected readonly professionals: Professionals,
    private readonly userLocation: UserLocation,
    private readonly host: ElementRef<HTMLElement>,
    protected readonly favorites: Favorites,
  ) {
    effect(() => {
      const tag = this.tag();
      if (tag && this.filters.includes(tag)) this.activeFilters.set([tag]);
    });

    // Centers the map on the user as soon as the position is known
    effect(() => {
      const position = this.userLocation.position();
      if (position) this.center.set(position);
    });
  }

  ngOnInit() {
    if (!this.hasKey) return;
    this.loader.load().then(() => this.loaded.set(true));
  }

  protected get visibleSalons() {
    const active = this.activeFilters();
    const user = this.userPosition();

    return this.professionals
      .published()
      // With every chip selected nothing is filtered out, even professionals with other tags
      .filter(
        (salon) =>
          active.length === this.filters.length || salon.tags.some((tag) => active.includes(tag)),
      )
      .map((salon) => ({
        ...salon,
        // Work photos (the profile photo when there is no gallery)
        photos: salon.gallery.length ? salon.gallery : [salon.image],
        distance: user ? formatDistance(distanceKm(user, salon.position)) : null,
      }));
  }

  // The heart sits inside a card that is a link: it must not open the page
  protected toggleFavorite(event: Event, id: string) {
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => console.error('Failed to update favorite', error));
  }

  protected photoLoaded(url: string) {
    this.loadedPhotos.update((urls) => (urls.includes(url) ? urls : [...urls, url]));
  }

  protected toggleFilter(filter: string) {
    this.activeFilters.update((filters) =>
      filters.includes(filter) ? filters.filter((f) => f !== filter) : [...filters, filter],
    );
    this.selected.set(0);
  }

  protected selectSalon(index: number) {
    this.selected.set(index);
    this.center.set(this.visibleSalons[index].position);

    // Brings the salon's card into view in the carousel
    this.host.nativeElement
      .querySelectorAll('.results .offer')
      [index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  protected markerIcon(index: number) {
    return pin(index === this.selected() ? '#ee8b2e' : '#2f6b7a');
  }

  // Button: asks for the position (the browser prompt only shows if it wasn't decided yet)
  protected async locateMe() {
    if (await this.userLocation.request()) this.center.set(this.userLocation.position()!);
  }
}
