import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, input, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { roundMoney } from '../../utils/money';
import { PricePipe } from '../../utils/price.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Toast } from '../../components/toast/toast';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { formatDuration, Professional, Review, Service, ServiceCategory } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Professionals } from '../../services/professionals';
import { Favorites } from '../../services/favorites';
import { Reviews } from '../../services/reviews';
import { Users } from '../../services/users';
import { missingProfileData } from '../../models/user';
import { ruleLabel } from '../../utils/pricing';
import { instagramUrl } from '../../utils/instagram';
import { formatRelative } from '../../utils/format-date';

@Component({
  selector: 'app-artist-details',
  imports: [Toast, ReviewsLabelPipe, FormsModule, FocusPipe, PricePipe, Spinner, RouterLink, MatIconModule],
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
      icon: 'brush',
    },
    {
      name: 'Cabelo',
      icon: 'content_cut',
    },
  ];
  // Only the categories that the professional has services in
  protected readonly availableCategories = computed(() =>
    this.categories.filter((category) => this.artist()?.services.some((s) => s.category === category.name)),
  );

  // The client's own data: booking needs all of it filled in on the profile
  private readonly account = resource({
    params: () => (this.auth.role() === 'client' ? this.auth.user()?.uid : undefined),
    loader: ({ params: uid }) => this.users.get(uid),
  });
  protected readonly missingData = computed(() =>
    this.account.hasValue() ? missingProfileData(this.account.value()) : [],
  );

  private readonly chosenCategories = signal<ServiceCategory[]>([]);

  // The chosen categories (one or both), or the first one that has services
  protected readonly activeCategories = computed(() => {
    const available = this.availableCategories().map((category) => category.name);
    const chosen = this.chosenCategories().filter((name) => available.includes(name));
    return chosen.length ? chosen : available.slice(0, 1);
  });

  // Each button turns a category on or off; at least one stays on
  protected toggleCategory(name: ServiceCategory) {
    const active = this.activeCategories();
    if (!active.includes(name)) this.chosenCategories.set([...active, name]);
    else if (active.length > 1) this.chosenCategories.set(active.filter((n) => n !== name));
  }

  protected readonly visibleServices = computed(
    () => this.artist()?.services.filter((s) => this.activeCategories().includes(s.category)) ?? [],
  );

  protected readonly selectedIds = signal<string[]>([]);
  protected readonly selectedServices = computed(
    () => this.artist()?.services.filter((s) => this.selectedIds().includes(s.id)) ?? [],
  );
  protected readonly total = computed(() =>
    roundMoney(this.selectedServices().reduce((sum, service) => sum + service.price, 0)),
  );

  // The address was just copied (the button shows a check for a moment)
  protected readonly copied = signal(false);
  // A message that floats on top for a moment
  protected readonly toast = signal('');

  protected async copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Without the clipboard API (or without permission): the old way, with a hidden field
      const field = document.createElement('textarea');
      field.value = address;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    this.copied.set(true);
    this.toast.set('Endereço copiado');
    setTimeout(() => {
      this.copied.set(false);
      this.toast.set('');
    }, 2000);
  }

  protected readonly formatDuration = formatDuration;
  protected readonly ruleLabel = ruleLabel;
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
    private readonly users: Users,
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

  // The photos of the cover: the gallery, or the profile photo when there is no gallery
  protected heroPhotos(artist: Professional) {
    return artist.gallery?.length ? artist.gallery : [artist.image];
  }

  protected readonly heroIndex = signal(0);

  protected onHeroScroll(event: Event) {
    const strip = event.target as HTMLElement;
    this.heroIndex.set(Math.round(strip.scrollLeft / strip.clientWidth));
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
    // Visitors have to sign in first
    if (!this.auth.user()) {
      this.router.navigate(['/entrar']);
      return;
    }
    if (this.missingData().length) return;
    this.router.navigate(['/profissionais', this.id(), 'agendar'], {
      queryParams: { servicos: this.selectedIds().join(',') },
    });
  }
}
