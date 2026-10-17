import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  protected readonly categories = [
    'Atendimento domiciliar',
    'Maquiagem leve',
    'Maquiagem marcada',
  ];

  constructor(private readonly router: Router) {}

  protected findProfessionals() {
    this.router.navigateByUrl('/professionals');
  }
}
