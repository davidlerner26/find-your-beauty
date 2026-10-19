import { Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FocusPipe } from '../../utils/focus.pipe';
import { roundMoney } from '../../utils/money';
import { PricePipe } from '../../utils/price.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { formatDuration, Review, Service, ServiceCategory } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Professionals } from '../../services/professionals';
import { Favorites } from '../../services/favorites';
import { Reviews } from '../../services/reviews';
import { instagramUrl } from '../../utils/instagram';
import { formatRelative } from '../../utils/format-date';

@Component({
  selector: 'app-artist-details',
  imports: [FormsModule, FocusPipe, PricePipe, Spinner, RouterLink],
  templateUrl: './artist-details.html',
  styleUrl: './artist-details.scss',
})
export class ArtistDetails {
  readonly id = input.required<string>();

  protected readonly artist = computed(() => this.professionals.byId(this.id()));
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
    roundMoney(this.selectedServices().reduce((sum, service) => sum + service.price, 0)),
  );

  protected readonly formatDuration = formatDuration;
  protected readonly instagramUrl = instagramUrl;

  protected readonly reviews = signal<Review[]>([]);
  // Booking that lets this client review (null: none completed yet)
  protected readonly reviewBookingId = signal<string | null>(null);
  protected readonly myStars = signal(0);
  protected myText = '';
  protected readonly savingReview = signal(false);
  // The form shows for a new review, or after pressing edit
  protected readonly editingReview = signal(false);
  protected readonly reviewMessage = signal('');
  protected readonly formatRelative = formatRelative;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    protected readonly professionals: Professionals,
    protected readonly auth: Auth,
    private readonly reviewsService: Reviews,
    protected readonly favorites: Favorites,
  ) {
    effect(() => {
      const id = this.id();
      const uid = this.auth.user()?.uid;
      const role = this.auth.role();
      void this.loadReviews(id, uid, role);
    });
  }

  private async loadReviews(id: string, uid: string | undefined, role: string | null) {
    try {
      const list = await this.reviewsService.list(id);
      this.reviews.set(list);

      const mine = list.find((review) => review.id === uid);
      this.myStars.set(mine?.stars ?? 0);
      this.myText = mine?.text ?? '';
      this.reviewBookingId.set(uid && role === 'client' ? await this.reviewsService.completedBookingId(id) : null);
    } catch (error) {
      console.error('Failed to load reviews', error);
    }
  }

  protected get myReview() {
    return this.reviews().find((review) => review.id === this.auth.user()?.uid);
  }

  protected editReview() {
    const mine = this.myReview;
    if (!mine) return;
    this.myStars.set(mine.stars);
    this.myText = mine.text;
    this.reviewMessage.set('');
    this.editingReview.set(true);
  }

  protected async deleteReview() {
    if (!confirm('Excluir a sua avaliação?')) return;

    try {
      await this.reviewsService.remove(this.id());
      this.reviews.set(await this.reviewsService.list(this.id()));
      this.myStars.set(0);
      this.myText = '';
      this.editingReview.set(false);
      this.reviewMessage.set('');
    } catch (error) {
      console.error('Failed to delete review', error);
      this.reviewMessage.set('Não foi possível excluir a avaliação. Tente novamente.');
    }
  }

  protected async sendReview() {
    const bookingId = this.reviewBookingId();
    if (!bookingId || !this.myStars()) {
      this.reviewMessage.set('Escolha de 1 a 5 estrelas.');
      return;
    }

    this.savingReview.set(true);
    this.reviewMessage.set('');
    try {
      await this.reviewsService.save(this.id(), bookingId, this.myStars(), this.myText);
      this.reviews.set(await this.reviewsService.list(this.id()));
      this.editingReview.set(false);
      this.reviewMessage.set('Avaliação enviada. Obrigada!');
    } catch (error) {
      console.error('Failed to save review', error);
      this.reviewMessage.set('Não foi possível enviar a avaliação. Tente novamente.');
    } finally {
      this.savingReview.set(false);
    }
  }

  protected goBack() {
    this.location.back();
  }

  protected toggleFavorite() {
    this.favorites.toggle(this.id()).catch((error) => console.error('Failed to update favorite', error));
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
