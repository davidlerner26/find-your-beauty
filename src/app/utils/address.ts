import { Pipe, PipeTransform } from '@angular/core';
import { APP_LANGUAGE } from './locale';

// The addresses are saved the way Google writes them (in Portuguese). In the other languages the street type is
// shown translated: "Rua" is "St." in English and "Calle" in Spanish; "Avenida" is "Av." in both. Only for showing:
// what is copied and saved stays as it was.
export const localizeAddress = (address: string) => {
  if (APP_LANGUAGE === 'pt') return address;
  const street = APP_LANGUAGE === 'en' ? 'St.' : 'Calle';
  return address
    .replace(/(^|[\s,-])(?:Rua|R\.)(?=\s)/g, `$1${street}`)
    .replace(/(^|[\s,-])(?:Avenida|Av\.)(?=\s)/g, '$1Av.');
};

@Pipe({ name: 'address' })
export class AddressPipe implements PipeTransform {
  transform(address: string | null | undefined) {
    return address ? localizeAddress(address) : '';
  }
}
