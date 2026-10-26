import { ArtistDetails } from '../artist-details/artist-details';
import { ChipsRow } from '../../components/chips-row/chips-row';
import { CarouselArrows } from '../../components/carousel-arrows/carousel-arrows';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, ElementRef, input, OnInit, signal } from '@angular/core';
import { GoogleMap, MapCircle, MapMarker } from '@angular/google-maps';
import { Spinner } from '../../components/spinner/spinner';
import { Favorites } from '../../services/favorites';
import { Feedback } from '../../services/feedback';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import { hasLocation, SERVICE_NAMES, ServiceCategory, shortLocationLabel } from '../../models/professional';
import { distanceKm, formatDistance } from '../../utils/geo';
import { environment } from '../../../environments/environment';
import { INTL_LOCALE } from '../../utils/locale';
import { T } from '../../utils/texts';
import { CatalogPipe } from '../../utils/catalog.pipe';

const pin = (color: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`,
  );

// Survives leaving the page: coming back from a professional's page keeps its card selected
let lastSelectedId: string | null = null;

@Component({
  selector: 'app-explore',
  imports: [ArtistDetails, CarouselArrows, ChipsRow, CatalogPipe, ReviewsLabelPipe, NgTemplateOutlet, FocusPipe, GoogleMap, MapMarker, MapCircle, Spinner, MatIconModule],
  templateUrl: './explore.html',
  styleUrl: './explore.scss',
})
export class Explore implements OnInit {
  protected readonly t = T;
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
  // Where the user is: a soft area, a thin ring inside it and a dot in the middle
  protected readonly circleOptions: google.maps.CircleOptions = {
    strokeWeight: 0,
    fillColor: '#f6d58a',
    fillOpacity: 0.4,
    clickable: false,
  };
  protected readonly ringOptions: google.maps.CircleOptions = {
    strokeColor: '#ee8b2e',
    strokeWeight: 1,
    fillOpacity: 0,
    clickable: false,
  };
  protected readonly dotOptions: google.maps.MarkerOptions = {
    clickable: false,
    zIndex: 1,
    icon: {
      url:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="#ee8b2e" stroke="#fff" stroke-width="4"/></svg>',
        ),
      scaledSize: { width: 28, height: 28, equals: () => false } as google.maps.Size,
      anchor: { x: 14, y: 14, equals: () => false } as google.maps.Point,
    },
  };

  protected readonly filters = ['Cabelo', 'Maquiagem'];
  // Tag chosen on the home page (?tag=Cabelo)
  readonly tag = input<string>();
  // Service chosen on the home page (?service=Maquiagem de noiva): its chip comes selected
  readonly service = input<string>();
  // Categories that were selected on the home page (?categories=Maquiagem,Cabelo)
  readonly categories = input<string>();
  // Every chip starts selected, unless a tag came from the home page
  protected readonly activeFilters = signal<string[]>([...this.filters]);
  // The services under the chips of the categories: none chosen means every service
  protected readonly activeServices = signal<string[]>([]);
  protected readonly selected = signal(-1);
  private restored = false;
  private chipShown = false;
  // The professional the map already went to (the effects below run again when the position of the user arrives or
  // changes, and they must not take the map back from the user)
  private centeredFor: string | null = null;
  // Card photos that finished loading (or failed), so the spinner stops
  protected readonly loadedPhotos = signal<string[]>([]);

  constructor(
    private readonly loader: GoogleMapsLoader,
    protected readonly professionals: Professionals,
    private readonly userLocation: UserLocation,
    private readonly host: ElementRef<HTMLElement>,
    protected readonly favorites: Favorites,
    private readonly router: Router,
    private readonly feedback: Feedback,
  ) {
    effect(() => {
      const service = this.service();
      if (!service) return;
      // The categories of the home page stay selected; without them, the one of the service
      const chosen = (this.categories() ?? '').split(',').filter((name) => this.filters.includes(name));
      const category = (Object.keys(SERVICE_NAMES) as ServiceCategory[]).find((key) => SERVICE_NAMES[key].includes(service));
      if (chosen.length) this.activeFilters.set(chosen);
      else if (category) this.activeFilters.set([category]);
      this.activeServices.set([service]);
    });

    // The chip of the service that came from the home page is brought into view, once the chips are there
    effect(() => {
      if (!this.service() || !this.serviceTags().length || this.chipShown) return;
      this.chipShown = true;
      setTimeout(() => this.host.nativeElement.querySelector('.filter.small.active')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 0);
    });

    effect(() => {
      const tag = this.tag();
      if (tag && this.filters.includes(tag)) this.activeFilters.set([tag]);
    });

    // The map button of a professional page: selects her pin and goes there
    effect(() => {
      const id = this.focus();
      if (!id) return;
      const index = this.visibleSalons.findIndex((salon) => salon.id === id);
      if (index < 0) return;
      lastSelectedId = id;
      this.restored = true;
      // The index follows the order of the list (by distance), so it is kept up to date; the map only goes there once
      this.selected.set(index);
      if (this.centeredFor !== 'focus:' + id) {
        this.centeredFor = 'focus:' + id;
        this.center.set({ ...this.visibleSalons[index].position });
      }
    });

    // The card of a professional is open: their pin is selected and the map goes there
    effect(() => {
      const id = this.openId();
      if (!id) return;
      const index = this.visibleSalons.findIndex((salon) => salon.id === id);
      if (index < 0) return;
      lastSelectedId = id;
      this.restored = true;
      this.selected.set(index);
      if (this.centeredFor !== 'open:' + id) {
        this.centeredFor = 'open:' + id;
        this.center.set({ ...this.visibleSalons[index].position });
      }
    });

    // Centers the map on the user as soon as the position is known
    effect(() => {
      const position = this.userLocation.position();
      if (position && !this.restored) this.center.set(position);
    });

    // Coming back from a professional's page: selects that card again
    effect(() => {
      if (this.restored || !lastSelectedId) return;
      // Wide screens: going to the map (not to a professional) starts with no card selected
      if (window.matchMedia('(min-width: 1024px)').matches && !this.openId() && !this.focus()) {
        lastSelectedId = null;
        return;
      }
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

  // The services offered by the professionals on the map, in the chosen categories
  protected readonly serviceTags = computed(() => {
    const categories = this.activeFilters();
    const names = new Set<string>();
    for (const salon of this.professionals.published()) {
      if (!hasLocation(salon)) continue;
      for (const service of salon.services) if (categories.includes(service.category)) names.add(service.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, INTL_LOCALE));
  });

  protected toggleService(name: string) {
    this.activeServices.update((all) => (all.includes(name) ? all.filter((n) => n !== name) : [...all, name]));
    this.selected.set(-1);
  }

  protected get visibleSalons() {
    const active = this.activeFilters();
    const services = this.activeServices().filter((name) => this.serviceTags().includes(name));
    const user = this.userPosition();

    return this.professionals
      .published()
      // With every chip selected nothing is filtered out, even professionals with other tags
      .filter(
        (salon) =>
          active.length === this.filters.length || salon.tags.some((tag) => active.includes(tag)),
      )
      // A service chosen under the chips: only who offers one of them
      .filter((salon) => !services.length || salon.services.some((service) => services.includes(service.name)))
      // Home-only professionals have no place on the map
      .filter((salon) => hasLocation(salon))
      .map((salon) => ({
        ...salon,
        address: shortLocationLabel(salon),
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
  protected readonly photoIndex = signal<Record<string, number | undefined>>({});

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

  // At least one chip always stays selected
  protected toggleFilter(filter: string) {
    this.activeFilters.update((filters) => {
      if (!filters.includes(filter)) return [...filters, filter];
      return filters.length > 1 ? filters.filter((f) => f !== filter) : filters;
    });
    this.selected.set(-1);
  }

  // The pin on the map: wide screens open the page of the professional (the card); phones select the card in the carousel
  protected onPin(index: number, id: string) {
    if (window.matchMedia('(min-width: 1024px)').matches) this.openSalon(index, id);
    else this.selectSalon(index);
  }

  protected selectSalon(index: number) {
    this.selected.set(index);
    lastSelectedId = this.visibleSalons[index].id;
    this.center.set(this.visibleSalons[index].position);
    this.showCard(index, 'smooth');
  }

  // The professional whose page is a card over the map (wide screens: the route /profissionais/:id)
  readonly openId = input<string>();
  // Coming from the map button of a professional page (?focus=id): the map goes to her pin
  readonly focus = input<string>();
  protected readonly floatingId = computed(() => this.openId() ?? null);

  // Closing the card goes back to the map
  // Takes the map to the pin of the professional (a new object, so it moves even if the map was dragged away)
  protected centerOn(id: string) {
    const salon = this.visibleSalons.find((item) => item.id === id);
    if (salon) this.center.set({ ...salon.position });
  }

  protected closeFloating(event?: Event) {
    event?.stopPropagation();
    // Nothing stays selected (the map screen is rebuilt, so the memory of the last card is cleared too)
    lastSelectedId = null;
    this.selected.set(-1);
    this.router.navigate(['/explore']);
  }

  // First tap on a carousel card selects it; tapping the selected card (or any card of the list) opens the page
  protected openSalon(index: number, id: string) {
    // Wide screens: the page of the professional is a card over the map
    if (window.matchMedia('(min-width: 1024px)').matches) {
      lastSelectedId = id;
      this.router.navigate(['/profissionais', id]);
      return;
    }
    if (index >= 0 && index !== this.selected()) {
      this.selectSalon(index);
      return;
    }
    lastSelectedId = id;
    this.router.navigate(['/profissionais', id]);
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
    if (await this.userLocation.request()) {
      // A new object every time, so the map goes there even after it was dragged away
      this.center.set({ ...this.userLocation.position()! });
    } else {
      this.feedback.show($localize`Não foi possível obter a sua localização. Permita o acesso no navegador.`);
    }
  }
}
