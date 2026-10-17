import { Component, OnInit, signal } from '@angular/core';
import { GoogleMap, MapCircle, MapMarker } from '@angular/google-maps';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { environment } from '../../../environments/environment';

type Salon = {
  tags: string[];
  name: string;
  image: string;
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
  protected readonly activeFilters = signal<string[]>(['Cabelo', 'Facial']);
  protected readonly selected = signal(0);

  protected readonly salons: Salon[] = [
    {
      tags: ['Cabelo', 'Facial'],
      name: 'Fernanda Lima',
      image: 'images/makeup/1.jpg',
      address: 'Rua Constante Ramos, 35 - Copacabana',
      rating: 4.7,
      reviews: '2.7k',
      distance: '1,1km',
      discount: '-58%',
      position: { lat: -22.9687, lng: -43.1868 },
    },
    {
      tags: ['Cabelo', 'Unhas', 'Facial'],
      name: 'Camila Torres',
      image: 'images/makeup/2.jpg',
      address: 'Rua Visconde de Pirajá, 550 - Ipanema',
      rating: 4.8,
      reviews: '3.1k',
      distance: '1,4km',
      discount: '-20%',
      position: { lat: -22.984, lng: -43.2075 },
    },
    {
      tags: ['Cabelo', 'Facial'],
      name: 'Rafaela Duarte',
      image: 'images/makeup/3.jpg',
      address: 'Rua Farme de Amoedo, 20 - Ipanema',
      rating: 4.7,
      reviews: '2.7k',
      distance: '2,0km',
      discount: '-15%',
      position: { lat: -22.9856, lng: -43.204 },
    },
    {
      tags: ['Maquiagem', 'Coloração'],
      name: 'Mariana Costa',
      image: 'images/makeup/4.jpg',
      address: 'Rua Barão da Torre, 411 - Ipanema',
      rating: 4.9,
      reviews: '4.2k',
      distance: '2,6km',
      discount: '-30%',
      position: { lat: -22.985, lng: -43.207 },
    },
    {
      tags: ['Unhas'],
      name: 'Juliana Prado',
      image: 'images/makeup/5.jpg',
      address: 'Rua Dias Ferreira, 233 - Leblon',
      rating: 4.5,
      reviews: '1.2k',
      distance: '2,3km',
      discount: '-10%',
      position: { lat: -22.986, lng: -43.223 },
    },
  ];

  constructor(private readonly loader: GoogleMapsLoader) {}

  ngOnInit() {
    this.locateMe();
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
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = { lat: coords.latitude, lng: coords.longitude };
      this.userPosition.set(position);
      this.center.set(position);
    });
  }
}
