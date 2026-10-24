import { Pipe, PipeTransform } from '@angular/core';
import { INTL_LOCALE } from './locale';

// 15.5 -> "R$ 15,50"
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined) {
    return (value ?? 0).toLocaleString(INTL_LOCALE, { style: 'currency', currency: 'BRL' });
  }
}
