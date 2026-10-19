import { Pipe, PipeTransform } from '@angular/core';

// 15.5 -> "R$ 15,50"
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined) {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
