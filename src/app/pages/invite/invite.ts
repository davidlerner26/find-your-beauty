import { MatIconModule } from '@angular/material/icon';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Auth } from '../../services/auth';
import { emailValidator, passwordValidator } from '../../utils/form-validators';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';
import { authErrorMessage, PASSWORD_RULE } from '../../utils/validators';

type InviteInfo = { name: string; image: string; email: string };

// The page of the link in the invite e-mail: the professional signs in (or creates the password) with the invited
// e-mail and claims the profile an admin made for her. See claimProfessionalDraft in the Cloud Functions.
@Component({
  selector: 'app-invite',
  imports: [ReactiveFormsModule, Spinner, MatIconModule],
  templateUrl: './invite.html',
  styleUrl: '../auth/auth.scss',
})
export class Invite {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly draftId: string;
  private readonly token: string;

  protected readonly invite = signal<InviteInfo | null>(null);
  protected readonly loading = signal(true);
  // The message of a link that is not valid (it comes from the server, in the language of the page)
  protected readonly invalid = signal('');
  protected readonly working = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal('');
  // "Already have an account": signs in instead of creating the password
  protected readonly hasAccount = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly passwordRule = PASSWORD_RULE;

  protected readonly form = inject(NonNullableFormBuilder).group({
    // Only asked when the invite has no e-mail: then the professional uses her own
    email: [''],
    password: ['', [Validators.required, passwordValidator]],
  });

  // The signed in account can claim right away: it is the one of the invite, or the invite has no e-mail
  protected readonly matches = computed(() => {
    const invited = this.invite()?.email.toLowerCase();
    const email = this.auth.user()?.email?.toLowerCase();
    return !invited || (!!email && email === invited);
  });

  constructor() {
    const route = inject(ActivatedRoute).snapshot.paramMap;
    this.draftId = route.get('draftId') ?? '';
    this.token = route.get('token') ?? '';
    this.load();
  }

  private async load() {
    try {
      await this.auth.whenReady;
      const invite = await this.auth.inviteInfo(this.draftId, this.token);
      if (!invite.email) {
        this.form.controls.email.setValidators([Validators.required, emailValidator]);
      }
      this.invite.set(invite);
    } catch (error) {
      log.warn('Invalid invite', error);
      this.invalid.set(
        (error as { message?: string }).message ||
          $localize`Este convite não vale mais. Peça um novo convite.`,
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected get showError() {
    const { password } = this.form.controls;
    return password.invalid && (this.submitted() || password.touched);
  }

  protected get showEmailError() {
    const { email } = this.form.controls;
    return email.invalid && (this.submitted() || email.touched);
  }

  private async run(action: () => Promise<void>) {
    this.formError.set('');
    this.working.set(true);
    try {
      await action();
    } catch (error) {
      log.warn('Invite step failed', error);
      this.formError.set(this.messageOf(error));
    } finally {
      this.working.set(false);
    }
  }

  // The Cloud Function answers in the language of the page; Firebase Auth errors have a code
  private messageOf(error: unknown) {
    const { code, message } = error as { code?: string; message?: string };
    return code?.startsWith('functions/') && message ? message : authErrorMessage(error);
  }

  private claim() {
    return this.auth.claimProfessional(this.draftId, this.token);
  }

  protected async submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;
    const { password, email: typed } = this.form.getRawValue();
    const email = this.invite()?.email || typed;
    await this.run(async () => {
      if (this.hasAccount()) await this.auth.signInWithInvite(email, password);
      else await this.auth.signUpWithInvite(email, password);
      await this.claim();
      await this.router.navigateByUrl(PATHS.proHome);
    });
  }

  protected google() {
    return this.run(async () => {
      await this.auth.signInWithGoogleForInvite(this.invite()?.email ?? '');
      await this.claim();
      await this.router.navigateByUrl(PATHS.proHome);
    });
  }

  // Already signed in with the invited e-mail
  protected claimNow() {
    return this.run(async () => {
      await this.claim();
      await this.router.navigateByUrl(PATHS.proHome);
    });
  }

  protected async useAnotherAccount() {
    await this.auth.signOut();
  }
}
