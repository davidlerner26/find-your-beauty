import { MatIconModule } from '@angular/material/icon';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

type Step = { title: string; description: string; image: string };

@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, MatIconModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  protected readonly steps: Step[] = [
    {
      title: 'A melhor maquiadora para você',
      description: 'Realce sua beleza de acordo com o seu estilo de vida',
      image: 'images/makeup/1.jpg',
    },
    {
      title: 'Conheça nossas especialistas',
      description: 'Há muitas maquiadoras incríveis para escolher, todas perto de você',
      image: 'images/makeup/2.jpg',
    },
    {
      title: 'Encontre o melhor serviço',
      description: 'Vários serviços das melhores profissionais que são nossas parceiras',
      image: 'images/makeup/3.jpg',
    },
    {
      title: 'Junte-se a nós',
      description: 'Encontre e agende maquiagem e penteado onde e quando quiser',
      image: 'images/makeup/4.jpg',
    },
  ];

  // The last step is the sign-up step, so it has no dots
  protected readonly dots = this.steps.slice(0, -1);
  protected readonly current = signal(0);
  protected readonly step = computed(() => this.steps[this.current()]);
  protected readonly isLast = computed(() => this.current() === this.steps.length - 1);
  protected readonly isBeforeLast = computed(() => this.current() === this.steps.length - 2);

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

  protected async signInWithGoogle() {
    try {
      await this.auth.signInWithGoogle();
      this.router.navigateByUrl('/');
    } catch {
      // popup closed or failed: stay on the page
    }
  }

  protected next() {
    this.current.update((current) => Math.min(current + 1, this.steps.length - 1));
  }

  protected goTo(index: number) {
    this.current.set(index);
  }
}
