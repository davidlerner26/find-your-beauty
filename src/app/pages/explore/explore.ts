import { Component, OnInit, signal } from '@angular/core';
import { GoogleMap, MapCircle, MapMarker } from '@angular/google-maps';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { environment } from '../../../environments/environment';

type Salon = {
  tags: string[];
  name: string;
  address: string;
  rating: number;
  reviews: string;
  distance: string;
  discount: string;
  position: google.maps.LatLngLiteral;
};

const pin = (color: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`,
  );

@Component({
  selector: 'app-explore',
  imports: [GoogleMap, MapMarker, MapCircle],
  templateUrl: './explore.html',
  styleUrl: './explore.scss',
})
export class Explore implements OnInit {
  protected readonly hasKey = !!environment.googleMapsApiKey;
  protected readonly loaded = signal(false);

  protected readonly center = signal<google.maps.LatLngLiteral>({
    lat: 37.7609,
    lng: -122.4350,
  });
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

  protected readonly image = 'beauty_salon_bg.jpeg';
  protected readonly filters = ['Hair', 'Nails', 'Facial', 'Coloring', 'Makeup'];
  protected readonly activeFilters = signal<string[]>(['Hair', 'Facial']);
  protected readonly selected = signal(0);

  protected readonly salons: Salon[] = [
    {
      tags: ['Hair', 'Facial'],
      name: 'Sophisticated Salon',
      address: '2807 Sherwood Circle, Kern..',
      rating: 4.7,
      reviews: '2.7k',
      distance: '1,1km',
      discount: '-58%',
      position: { lat: 37.7585, lng: -122.4470 },
    },
    {
      tags: ['Hair', 'Nails', 'Facial'],
      name: 'Salon de Elegance',
      address: '360 Stillwater Rd. Palm City..',
      rating: 4.8,
      reviews: '3.1k',
      distance: '1,4km',
      discount: '-20%',
      position: { lat: 37.7745, lng: -122.4310 },
    },
    {
      tags: ['Hair', 'Facial'],
      name: 'Plush Beauty Lounge',
      address: '2607 Haymond Rocks ..',
      rating: 4.7,
      reviews: '2.7k',
      distance: '2,0km',
      discount: '-15%',
      position: { lat: 37.7640, lng: -122.4170 },
    },
    {
      tags: ['Makeup', 'Coloring'],
      name: 'The Beauty Bar',
      address: '88 Sunset Blvd. Palm City..',
      rating: 4.9,
      reviews: '4.2k',
      distance: '2,6km',
      discount: '-30%',
      position: { lat: 37.7440, lng: -122.4500 },
    },
    {
      tags: ['Nails'],
      name: 'Velvet Nails',
      address: '45 Palm Dr. Palm City..',
      rating: 4.5,
      reviews: '1.2k',
      distance: '2,3km',
      discount: '-10%',
      position: { lat: 37.7440, lng: -122.4180 },
    },
  ];

  constructor(private readonly loader: GoogleMapsLoader) {}

  ngOnInit() {
    if (!this.hasKey) return;
    this.loader.load().then(() => this.loaded.set(true));
  }

  protected get visibleSalons() {
    const active = this.activeFilters();
    return this.salons.filter(
      (salon) => !active.length || salon.tags.some((tag) => active.includes(tag)),
    );
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
    navigator.geolocation.getCurrentPosition(({ coords }) =>
      this.center.set({ lat: coords.latitude, lng: coords.longitude }),
    );
  }
}
