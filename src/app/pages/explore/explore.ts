import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { NgTemplateOutlet } from '@angular/common';
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

// Survives leaving the page: coming back from a professional's page keeps its card selected
let lastSelectedId: string | null = null;

@Component({
  selector: 'app-explore',
  imports: [ReviewsLabelPipe, NgTemplateOutlet, FocusPipe, GoogleMap, MapMarker, MapCircle, Spinner, MatIconModule],
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
  protected readonly selected = signal(-1);
  private restored = false;
  // Card photos that finished loading (or failed), so the spinner stops
  protected readonly loadedPhotos = signal<string[]>([]);

  constructor(
    private readonly loader: GoogleMapsLoader,
    protected readonly professionals: Professionals,
    private readonly userLocation: UserLocation,
    private readonly host: ElementRef<HTMLElement>,
    protected readonly favorites: Favorites,
    private readonly router: Router,
  ) {
    effect(() => {
      const tag = this.tag();
      if (tag && this.filters.includes(tag)) this.activeFilters.set([tag]);
    });

    // Centers the map on the user as soon as the position is known
    effect(() => {
      const position = this.userLocation.position();
      if (position && !this.restored) this.center.set(position);
    });

    // Coming back from a professional's page: selects that card again
    effect(() => {
      if (this.restored || !lastSelectedId) return;
      const index = this.visibleSalons.findIndex((salon) => salon.id === lastSelectedId);
      if (index < 0) return;
      this.restored = true;
      this.selected.set(index);
      this.center.set(this.visibleSalons[index].position);
      setTimeout(() => this.showCard(index, 'auto'), 0);
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
        km: user ? distanceKm(user, salon.position) : null,
      }))
      // Closest first, in the carousel, on the map markers and in the list (the same order everywhere)
      .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }

  // The list of the round button shows the same professionals, in the same order, as the carousel
  protected get nearbySalons() {
    return this.visibleSalons;
  }

  protected readonly listOpen = signal(false);

  // Photo being shown in each card (for the dots under the image)
  protected readonly photoIndex = signal<Record<string, number>>({});

  protected onPhotosScroll(event: Event, id: string) {
    const strip = event.target as HTMLElement;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if ((this.photoIndex()[id] ?? 0) !== index) this.photoIndex.update((all) => ({ ...all, [id]: index }));
  }
  protected readonly closing = signal(false);

  // The list slides down and the backdrop fades, then it leaves the page
  protected closeList() {
    if (this.closing()) return;
    this.closing.set(true);
    this.sheetOffset.set(window.innerHeight);
    setTimeout(() => {
      this.listOpen.set(false);
      this.closing.set(false);
      this.sheetOffset.set(0);
    }, 300);
  }

  // Finger of the carousel: pulling a card up opens the list
  protected carouselStart: { x: number; y: number } | null = null;

  protected onCarouselDown(event: PointerEvent) {
    this.carouselStart = { x: event.clientX, y: event.clientY };
  }

  protected onCarouselMove(event: PointerEvent) {
    const start = this.carouselStart;
    if (!start) return;

    const up = start.y - event.clientY;
    const sideways = Math.abs(event.clientX - start.x);
    // A clear pull upward, more up than sideways (sideways is for the photos and the cards)
    if (up > 50 && up > sideways * 1.5) {
      this.carouselStart = null;
      this.listOpen.set(true);
    }
  }

  // Dragging the bar of the list down: how far the list went and where the finger started
  protected readonly sheetOffset = signal(0);
  protected readonly dragStart = signal<number | null>(null);

  protected onGripDown(event: PointerEvent) {
    this.dragStart.set(event.clientY);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onGripMove(event: PointerEvent) {
    const start = this.dragStart();
    if (start === null) return;
    this.sheetOffset.set(Math.max(0, event.clientY - start));
  }

  protected onGripUp() {
    if (this.dragStart() === null) return;

    const moved = this.sheetOffset();
    this.dragStart.set(null);
    this.sheetOffset.set(0);
    // A tap or a pull of more than 100px closes the list; a shorter pull brings it back
    if (moved < 5 || moved > 100) this.closeList();
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
    this.selected.set(-1);
  }

  protected selectSalon(index: number) {
    this.selected.set(index);
    lastSelectedId = this.visibleSalons[index].id;
    this.center.set(this.visibleSalons[index].position);
    this.showCard(index, 'smooth');
  }

  // First tap on a carousel card selects it; tapping the selected card (or any card of the list) opens the page
  protected openSalon(index: number, id: string) {
    if (index >= 0 && index !== this.selected()) {
      this.selectSalon(index);
      return;
    }
    lastSelectedId = id;
    this.router.navigate(['/maquiadores', id]);
  }

  // Brings the salon's card into view in the carousel
  private showCard(index: number, behavior: ScrollBehavior) {
    this.host.nativeElement
      .querySelectorAll('.results .offer')
      [index]?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
  }

  protected markerIcon(index: number) {
    return pin(index === this.selected() ? '#ee8b2e' : '#2f6b7a');
  }

  // Button: asks for the position (the browser prompt only shows if it wasn't decided yet)
  protected async locateMe() {
    if (await this.userLocation.request()) this.center.set(this.userLocation.position()!);
  }
}
