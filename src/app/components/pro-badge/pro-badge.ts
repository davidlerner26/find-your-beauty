import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { proSubscriptionEnabled } from '../../utils/features';

// The "Pro" badge of a professional with an active subscription, beside the name on the cards and on the profile.
// Only where the subscription exists (the test environment for now): in production it never shows, whatever the data.
@Component({
  selector: 'app-pro-badge',
  imports: [MatIconModule],
  template: `
    @if (enabled && pro()) {
      <span i18n-title class="pro-badge" title="Assinante Pro">
        <mat-icon class="filled" aria-hidden="true">star</mat-icon>
        <span>Pro</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      margin-left: 0.4rem;
    }

    .pro-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.1rem 0.5rem 0.1rem 0.35rem;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.2;
    }

    mat-icon {
      width: 0.95rem;
      height: 0.95rem;
      font-size: 0.95rem;
    }
  `,
})
export class ProBadge {
  readonly pro = input<boolean | undefined>(false);
  protected readonly enabled = proSubscriptionEnabled();
}
