import { MatIconModule } from '@angular/material/icon';
import { Component, computed, input, resource, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { formatDuration, Professional } from '../../models/professional';
import { Admin } from '../../services/admin';
import { FocusPipe } from '../../utils/focus.pipe';
import { instagramUrl } from '../../utils/instagram';
import { PricePipe } from '../../utils/price.pipe';
import { ruleLabel } from '../../utils/pricing';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// The whole profile of a professional for an admin to review, even when it is not published
@Component({
  selector: 'app-admin-professional',
  imports: [FocusPipe, PricePipe, Spinner, MatIconModule],
  templateUrl: './admin-professional.html',
  styleUrl: './admin-professional.scss',
})
export class AdminProfessional {
  readonly id = input.required<string>();

  protected readonly professional = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.admin.get(id),
  });

  protected readonly cpf = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.admin.cpfOf(id),
  });

  protected readonly working = signal(false);
  protected readonly error = signal('');
  protected readonly formatDuration = formatDuration;
  protected readonly instagramUrl = instagramUrl;
  protected readonly ruleLabel = ruleLabel;

  protected readonly hours = computed(() => {
    const weekly = this.professional.value()?.availability?.weekly ?? {};
    return WEEKDAYS.map((name, index) => ({ name, day: weekly[String(index)] }));
  });

  protected readonly status = computed(() => {
    const professional = this.professional.value();
    if (professional?.approved === false) return professional.rejected ? 'Negado' : 'Aguardando aprovação';
    return 'Aprovado';
  });

  constructor(
    private readonly admin: Admin,
    private readonly location: Location,
    private readonly router: Router,
  ) {}

  protected goBack() {
    this.location.back();
  }

  protected async answer(professional: Professional, approve: boolean) {
    if (!approve && !confirm(`Negar o cadastro de ${professional.name}?`)) return;

    this.working.set(true);
    this.error.set('');
    try {
      if (approve) await this.admin.approve(professional.id);
      else await this.admin.reject(professional.id);
      // Answered: it is no longer in the waiting list
      this.router.navigateByUrl('/admin');
    } catch (error) {
      console.error('Failed to answer', error);
      this.error.set('Não foi possível concluir. Tente novamente.');
    } finally {
      this.working.set(false);
    }
  }
}
