import { MatIconModule } from '@angular/material/icon';
import { Component, computed, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Feedback } from '../../services/feedback';
import { log } from '../../utils/log';
import { T } from '../../utils/texts';
import { errorCode } from '../../utils/error-code';
import { PATHS } from '../../utils/paths';

type Step = { title: string; description: string; image: string };

@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, MatIconModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);

  protected readonly t = T;
  protected readonly steps: Step[] = [
    {
      title: $localize`O melhor profissional para você`,
      description: $localize`Realce sua beleza de acordo com o seu estilo de vida`,
      image: 'images/makeup/1.jpg',
    },
    {
      title: $localize`Conheça nossas especialistas`,
      description: $localize`Há muitos profissionais incríveis para escolher, todas perto de você`,
      image: 'images/makeup/2.jpg',
    },
    {
      title: $localize`Encontre o melhor serviço`,
      description: $localize`Vários serviços das melhores profissionais que são nossas parceiras`,
      image: 'images/makeup/3.jpg',
    },
    {
      title: $localize`Junte-se a nós`,
      description: $localize`Encontre e agende maquiagem e penteado onde e quando quiser`,
      image: 'images/makeup/4.jpg',
    },
  ];

  // The last step is the sign-up step, so it has no dots
  protected readonly dots = this.steps.slice(0, -1);
  protected readonly current = signal(0);
  protected readonly step = computed(() => this.steps[this.current()]);
  protected readonly isLast = computed(() => this.current() === this.steps.length - 1);
  protected readonly isBeforeLast = computed(() => this.current() === this.steps.length - 2);

  protected async signInWithGoogle() {
    try {
      await this.auth.signInWithGoogle();
      this.router.navigateByUrl(PATHS.home);
    } catch (error) {
      // Closing the popup is not an error: stay on the page
      const code = errorCode(error);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      log.error('Failed to sign in with Google', error);
      this.feedback.show($localize`Não foi possível entrar com o Google. Tente novamente.`);
    }
  }

  protected next() {
    this.current.update((current) => Math.min(current + 1, this.steps.length - 1));
  }

  protected goTo(index: number) {
    this.current.set(index);
  }
}
