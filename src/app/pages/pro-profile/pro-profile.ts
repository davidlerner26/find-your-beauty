import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Availability,
  DEFAULT_AVAILABILITY,
  Service,
  ServiceCategory,
} from '../../models/professional';
import { toMinutes } from '../../utils/slots';
import { Auth } from '../../services/auth';
import { db } from '../../services/firebase';
import { Professionals } from '../../services/professionals';

@Component({
  selector: 'app-pro-profile',
  imports: [FormsModule],
  templateUrl: './pro-profile.html',
  styleUrl: './pro-profile.scss',
})
export class ProProfile {
  protected readonly categories: ServiceCategory[] = ['Maquiagem', 'Cabelo', 'Facial'];

  protected name = '';
  protected phone = '';
  protected image = '';
  protected address = '';
  protected about = '';
  protected services: Service[] = [];
  protected position = { lat: 0, lng: 0 };
  protected availability: Availability = structuredClone(DEFAULT_AVAILABILITY);
  protected blockedDate = '';

  // Monday first, as in the Brazilian calendar
  protected readonly weekdays = [
    { key: '1', label: 'Segunda' },
    { key: '2', label: 'Terça' },
    { key: '3', label: 'Quarta' },
    { key: '4', label: 'Quinta' },
    { key: '5', label: 'Sexta' },
    { key: '6', label: 'Sábado' },
    { key: '0', label: 'Domingo' },
  ];

  protected readonly published = signal(false);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly locating = signal(false);
  private filled = false;

  private readonly uid = computed(() => this.auth.user()?.uid ?? '');
  protected readonly profile = computed(() => this.professionals.byId(this.uid()));

  constructor(
    private readonly auth: Auth,
    private readonly professionals: Professionals,
    private readonly router: Router,
  ) {
    // Fills the form once, when the profile document arrives
    effect(() => {
      const profile = this.profile();
      if (!profile || this.filled) return;

      this.filled = true;
      this.name = profile.name;
      this.phone = profile.phone ?? '';
      this.image = profile.image;
      this.address = profile.address;
      this.about = profile.about.join('\n\n');
      this.services = profile.services.map((service) => ({ ...service }));
      this.position = { ...profile.position };
      this.availability = structuredClone(profile.availability ?? DEFAULT_AVAILABILITY);
      this.published.set(profile.published !== false);
    });
  }

  protected get hasPosition() {
    return this.position.lat !== 0 || this.position.lng !== 0;
  }

  // What is missing before the profile can be shown to clients
  protected get missing() {
    const missing: string[] = [];
    if (this.name.trim().length < 3) missing.push('nome');
    if (!this.image.trim()) missing.push('foto');
    if (this.address.trim().length < 5) missing.push('endereço');
    if (!this.hasPosition) missing.push('localização no mapa');
    if (!this.services.some((s) => s.name.trim() && s.price > 0 && s.durationMinutes > 0)) {
      missing.push('pelo menos 1 serviço completo');
    }
    return missing;
  }

  // Days where the closing time isn't after the opening time
  protected get invalidDays() {
    return this.weekdays.filter(({ key }) => {
      const day = this.availability.weekly[key];
      return day.enabled && toMinutes(day.end) <= toMinutes(day.start);
    });
  }

  protected blockDate() {
    const date = this.blockedDate;
    if (!date || this.availability.blockedDates.includes(date)) return;

    this.availability.blockedDates = [...this.availability.blockedDates, date].sort();
    this.blockedDate = '';
  }

  protected unblockDate(date: string) {
    this.availability.blockedDates = this.availability.blockedDates.filter((d) => d !== date);
  }

  protected dateLabel(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }

  protected addService() {
    this.services = [
      ...this.services,
      {
        id: Math.random().toString(36).slice(2, 10),
        name: '',
        category: 'Maquiagem',
        price: 0,
        durationMinutes: 60,
        description: '',
        image: '',
      },
    ];
  }

  protected removeService(service: Service) {
    this.services = this.services.filter((item) => item !== service);
  }

  protected useMyLocation() {
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.position = { lat: coords.latitude, lng: coords.longitude };
        this.locating.set(false);
      },
      () => {
        this.message.set('Não foi possível obter a sua localização.');
        this.locating.set(false);
      },
    );
  }

  protected async save() {
    if (this.invalidDays.length) {
      this.message.set('O horário de fechamento precisa ser depois do de abertura.');
      return;
    }

    this.saving.set(true);
    this.message.set('');

    const services = this.services.map((service) => ({
      ...service,
      name: service.name.trim(),
      description: service.description.trim(),
      price: Number(service.price),
      durationMinutes: Number(service.durationMinutes),
      image: service.image || this.image.trim(),
    }));
    // A profile that isn't complete can't be published
    const published = this.published() && this.missing.length === 0;

    try {
      await updateDoc(doc(db, 'professionals', this.uid()), {
        name: this.name.trim(),
        phone: this.phone.trim(),
        image: this.image.trim(),
        address: this.address.trim(),
        about: this.about.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        services,
        tags: [...new Set(services.map((service) => service.category))],
        position: this.position,
        availability: { ...this.availability, slotMinutes: Number(this.availability.slotMinutes) },
        published,
      });
      await this.professionals.load();
      this.published.set(published);
      this.message.set(
        this.published() || !this.missing.length
          ? 'Perfil salvo!'
          : `Perfil salvo, mas ainda não publicado. Falta: ${this.missing.join(', ')}.`,
      );
    } catch (error) {
      console.error('Failed to save profile', error);
      this.message.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }

  protected signOut() {
    this.router.navigateByUrl('/pro/entrar');
    this.auth.signOut().catch((error) => console.error('Sign out failed', error));
  }
}
