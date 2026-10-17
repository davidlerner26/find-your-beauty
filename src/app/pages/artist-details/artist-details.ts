import { Component, computed, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  formatDuration,
  MAKEUP_ARTISTS,
  Service,
  ServiceCategory,
} from '../../data/makeup-artists';

@Component({
  selector: 'app-artist-details',
  imports: [RouterLink],
  templateUrl: './artist-details.html',
  styleUrl: './artist-details.scss',
})
export class ArtistDetails {
  readonly id = input.required<string>();

  protected readonly artist = computed(() =>
    MAKEUP_ARTISTS.find((artist) => artist.id === this.id()),
  );
  protected readonly favorite = signal(false);
  protected readonly aboutExpanded = signal(false);
  protected readonly stars = [1, 2, 3, 4, 5];

  protected readonly categories: { name: ServiceCategory; icon: string }[] = [
    {
      name: 'Maquiagem',
      icon: 'M9 11h6v11H9z M10 5h4v6h-4z M11 2h2v3h-2z',
    },
    {
      name: 'Cabelo',
      icon: 'M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 4 8.12 15.88 M14.47 14.48 20 20 M8.12 8.12 12 12',
    },
    {
      name: 'Facial',
      icon: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01',
    },
  ];
  protected readonly activeCategory = signal<ServiceCategory>('Maquiagem');

  protected readonly visibleServices = computed(
    () => this.artist()?.services.filter((s) => s.category === this.activeCategory()) ?? [],
  );

  protected readonly selectedIds = signal<string[]>([]);
  protected readonly selectedServices = computed(
    () => this.artist()?.services.filter((s) => this.selectedIds().includes(s.id)) ?? [],
  );
  protected readonly total = computed(() =>
    this.selectedServices().reduce((sum, service) => sum + service.price, 0),
  );

  protected readonly formatDuration = formatDuration;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
  ) {}

  protected goBack() {
    this.location.back();
  }

  protected toggleFavorite() {
    this.favorite.update((favorite) => !favorite);
  }

  protected isSelected(service: Service) {
    return this.selectedIds().includes(service.id);
  }

  protected toggleService(service: Service) {
    this.selectedIds.update((ids) =>
      ids.includes(service.id) ? ids.filter((id) => id !== service.id) : [...ids, service.id],
    );
  }

  protected book() {
    this.router.navigate(['/maquiadores', this.id(), 'agendar'], {
      queryParams: { servicos: this.selectedIds().join(',') },
    });
  }
}
