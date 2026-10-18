import { RouterLink } from '@angular/router';
import { Component, OnInit, signal } from '@angular/core';
import { GoogleMap, MapCircle, MapMarker } from '@angular/google-maps';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Professionals } from '../../services/professionals';
import { distanceKm, formatDistance } from '../../utils/geo';
import { environment } from '../../../environments/environment';

const pin = (color: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`,
  );

@Component({
  selector: 'app-explore',
  imports: [GoogleMap, MapMarker, MapCircle, RouterLink],
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
  protected readonly userPosition = signal<google.maps.LatLngLiteral | null>(null);
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
  // Every chip starts selected
  protected readonly activeFilters = signal<string[]>([...this.filters]);
  protected readonly selected = signal(0);

  constructor(
    private readonly loader: GoogleMapsLoader,
    protected readonly professionals: Professionals,
  ) {}

  ngOnInit() {
    this.locateMe();
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
        distance: user ? formatDistance(distanceKm(user, salon.position)) : null,
      }));
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
  }

  protected markerIcon(index: number) {
    return pin(index === this.selected() ? '#ee8b2e' : '#2f6b7a');
  }

  protected locateMe() {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = { lat: coords.latitude, lng: coords.longitude };
      this.userPosition.set(position);
      this.center.set(position);
    });
  }
}
