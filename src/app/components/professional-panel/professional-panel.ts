import { Component, computed, inject } from '@angular/core';
import { ProfessionalPanel as Panel } from '../../services/professional-panel';
import { Professionals } from '../../services/professionals';
import { DialogFocus } from '../../utils/dialog.directive';
import { ArtistDetails } from '../../pages/artist-details/artist-details';

// The page of a professional on the side of the screen (see services/professional-panel.ts). It is the same page
// that floats over the map, in its card layout.
@Component({
  selector: 'app-professional-panel',
  imports: [ArtistDetails, DialogFocus],
  template: `
    @if (panel.openId(); as id) {
      <div
        class="panel"
        role="dialog"
        [attr.aria-label]="name()"
        appDialog
        (escape)="panel.close()"
      >
        <app-artist-details [id]="id" [floating]="true" (closed)="panel.close()" />
      </div>
    }
  `,
  styleUrl: './professional-panel.scss',
})
export class ProfessionalPanelView {
  protected readonly panel = inject(Panel);
  private readonly professionals = inject(Professionals);

  protected readonly name = computed(() => {
    const id = this.panel.openId();
    return (id && this.professionals.byId(id)?.name) || null;
  });
}
