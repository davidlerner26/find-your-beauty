import {
  Component,
  computed,
  ElementRef,
  OnDestroy,
  OnInit,
  signal,
  viewChildren,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { T } from '../../utils/texts';

const LENGTH = 4;
const RESEND_SECONDS = 60;

// Confirms the e-mail of a new client with the 4 digit code that was sent to it, then signs the client in
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit, OnDestroy {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly t = T;
  protected readonly boxes = Array.from({ length: LENGTH }, (_, i) => i);
  protected readonly digits = signal<string[]>(Array(LENGTH).fill(''));
  protected readonly fields = viewChildren<ElementRef<HTMLInputElement>>('box');

  protected readonly email = computed(() => this.auth.verification()?.email ?? '');
  protected readonly code = computed(() => this.digits().join(''));
  protected readonly complete = computed(() => this.code().length === LENGTH);

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  // Seconds until another code can be asked for (the one just sent counts)
  protected readonly wait = signal(RESEND_SECONDS);
  protected readonly clock = computed(() => {
    const seconds = this.wait();
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (!this.auth.verification()) {
      this.router.navigateByUrl('/entrar');
      return;
    }
    this.startTimer();
    queueMicrotask(() => this.fields()[0]?.nativeElement.focus());
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private startTimer() {
    clearInterval(this.timer);
    this.wait.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.wait.update((seconds) => Math.max(0, seconds - 1));
      if (this.wait() === 0) clearInterval(this.timer);
    }, 1000);
  }

  protected onInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const typed = input.value.replace(/\D/g, '');
    this.error.set('');

    // A paste (or autofill) brings all the digits at once
    if (typed.length > 1) {
      this.fill(typed);
      return;
    }
    this.digits.update((digits) => digits.map((digit, i) => (i === index ? typed : digit)));
    input.value = typed;
    if (typed && index < LENGTH - 1) this.fields()[index + 1].nativeElement.focus();
    if (this.complete()) void this.submit();
  }

  protected onKeydown(index: number, event: KeyboardEvent) {
    // Backspace on an empty box goes back to the one before
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.fields()[index - 1].nativeElement.focus();
    }
  }

  protected onPaste(event: ClipboardEvent) {
    event.preventDefault();
    this.fill(event.clipboardData?.getData('text') ?? '');
  }

  private fill(text: string) {
    const typed = text.replace(/\D/g, '').slice(0, LENGTH);
    this.digits.set(Array.from({ length: LENGTH }, (_, i) => typed[i] ?? ''));
    this.fields().forEach((field, i) => (field.nativeElement.value = typed[i] ?? ''));
    this.fields()[Math.min(typed.length, LENGTH - 1)].nativeElement.focus();
    if (this.complete()) void this.submit();
  }

  protected async submit() {
    if (!this.complete() || this.submitting()) return;

    this.error.set('');
    this.submitting.set(true);
    try {
      const signedIn = await this.auth.verifyEmail(this.code());
      // Without the password (the page was reloaded), the client signs in by hand
      this.router.navigateByUrl(signedIn ? this.auth.homePath() : '/entrar');
    } catch (error) {
      this.error.set(
        (error as { message?: string }).message || $localize`Não foi possível verificar o código.`,
      );
      this.digits.set(Array(LENGTH).fill(''));
      this.fields().forEach((field) => (field.nativeElement.value = ''));
      this.fields()[0]?.nativeElement.focus();
    } finally {
      this.submitting.set(false);
    }
  }

  protected async resend() {
    if (this.wait() > 0) return;
    this.error.set('');
    this.notice.set('');
    try {
      await this.auth.sendVerificationCode(this.email());
      this.notice.set($localize`Enviamos um novo código.`);
      this.startTimer();
    } catch (error) {
      this.error.set(
        (error as { message?: string }).message || $localize`Não foi possível enviar o código.`,
      );
    }
  }
}
