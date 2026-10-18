import { Component, signal } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { SEED_PROFESSIONALS } from '../../data/seed-professionals';
import { db } from '../../services/firebase';
import { Professionals } from '../../services/professionals';

// Dev-only page: writes the initial professionals to Firestore (safe to run more than once)
@Component({
  selector: 'app-seed',
  template: `
    <div class="seed">
      <h1>Popular professionals</h1>
      <p>
        Grava {{ total }} documentos na coleção <code>professionals</code>, usando o id de cada
        maquiadora como id do documento. Documentos existentes com o mesmo id são sobrescritos.
      </p>
      <button type="button" [disabled]="running()" (click)="run()">
        {{ running() ? 'Gravando...' : 'Popular agora' }}
      </button>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
    </div>
  `,
  styles: `
    .seed {
      max-width: 32rem;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    button {
      height: 3.25rem;
      border: 0;
      border-radius: 999px;
      background: var(--primary);
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
    }
  `,
})
export class Seed {
  protected readonly total = SEED_PROFESSIONALS.length;
  protected readonly running = signal(false);
  protected readonly message = signal('');

  constructor(private readonly professionals: Professionals) {}

  protected async run() {
    this.running.set(true);
    this.message.set('');
    try {
      for (const { id, ...data } of SEED_PROFESSIONALS) {
        await setDoc(doc(db, 'professionals', id), data);
      }
      await this.professionals.load();
      this.message.set(`Pronto! ${this.total} maquiadoras gravadas.`);
    } catch (error) {
      console.error(error);
      this.message.set(`Erro ao gravar: ${(error as Error).message}`);
    } finally {
      this.running.set(false);
    }
  }
}
