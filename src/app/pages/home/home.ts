import { RouterLink } from '@angular/router';
import { Component, computed, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { Professional } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { distanceKm, formatDistance } from '../../utils/geo';

type Salon = {
  id: string;
  tags: string;
  name: string;
  image: string;
  address: string;
  rating: number;
  reviews: string;
  distance: string | null;
  distanceKm: number | null;
};


@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly firstName = computed(
    () => this.auth.user()?.displayName?.trim().split(/\s+/)[0] || null,
  );

  private readonly userPosition = signal<{ lat: number; lng: number } | null>(null);

  private readonly salons = computed<Salon[]>(() =>
    this.professionals.list().map((professional) => this.toSalon(professional)),
  );

  protected readonly featuredSalons = computed(() =>
    [...this.salons()].sort((a, b) => b.rating - a.rating).slice(0, 4),
  );

  protected readonly nearbyOffers = computed(() =>
    [...this.salons()]
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 3),
  );

  constructor(
    private readonly auth: Auth,
    protected readonly professionals: Professionals,
  ) {
    navigator.geolocation?.getCurrentPosition(({ coords }) =>
      this.userPosition.set({ lat: coords.latitude, lng: coords.longitude }),
    );
  }

  private toSalon(professional: Professional): Salon {
    const position = this.userPosition();
    const km = position ? distanceKm(position, professional.position) : null;

    return {
      id: professional.id,
      name: professional.name,
      image: professional.image,
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
      name: 'Facial',
      icon: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01',
    },
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
