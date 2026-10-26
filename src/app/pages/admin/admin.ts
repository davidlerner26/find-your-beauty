import { MatIconModule } from '@angular/material/icon';
import { Component, signal, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Admin as AdminService, PendingProfessional } from '../../services/admin';
import { formatRelative } from '../../utils/format-date';

@Component({
  selector: 'app-admin',
  imports: [NgTemplateOutlet, RouterLink, Spinner, MatIconModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly admin = inject(AdminService);

  private readonly all = signal<PendingProfessional[]>([]);
  protected readonly waiting = this.all.asReadonly();
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  // Id of the professional being answered
  protected readonly working = signal<string | null>(null);
  protected readonly relative = formatRelative;

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.admin.pending());
    } catch (error) {
      console.error('Failed to load pending professionals', error);
      this.error.set($localize`Não foi possível carregar os cadastros.`);
    } finally {
      this.loading.set(false);
    }
  }

  protected async answer(professional: PendingProfessional, approve: boolean) {
    if (!approve && !confirm($localize`Negar o cadastro de ${professional.name}:name:?`)) return;

    this.working.set(professional.id);
    this.error.set('');
    try {
      if (approve) {
        await this.admin.approve(professional.id);
        this.all.update((list) => list.filter((item) => item.id !== professional.id));
      } else {
        await this.admin.reject(professional.id);
        this.all.update((list) => list.filter((item) => item.id !== professional.id));
      }
    } catch (error) {
      console.error('Failed to answer', error);
      this.error.set($localize`Não foi possível concluir. Tente novamente.`);
    } finally {
      this.working.set(null);
    }
  }
}
