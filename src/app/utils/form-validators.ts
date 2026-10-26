import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidCpf } from './cpf';
import { isValidEmail, isValidPassword } from './validators';

// Validators for reactive forms. Each one says why a value is wrong with an error key, and leaves an empty
// value to `Validators.required`, so a field can be optional.
const unlessEmpty =
  (error: string, isValid: (value: string) => boolean): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    return !value.trim() || isValid(value) ? null : { [error]: true };
  };

export const emailValidator = unlessEmpty('email', isValidEmail);

export const passwordValidator = unlessEmpty('password', isValidPassword);

export const cpfValidator = unlessEmpty('cpf', isValidCpf);

// Mobile numbers have 11 digits: area code + 9 + 8 digits
export const mobileValidator = unlessEmpty(
  'mobile',
  (value) => value.replace(/\D/g, '').length === 11,
);

// At least `length` characters, not counting the spaces around
export const minTrimmedLength = (length: number): ValidatorFn =>
  unlessEmpty('minlength', (value) => value.trim().length >= length);

// For a group: the two fields have to hold the same text (a password and its confirmation)
export const fieldsMatch =
  (first: string, second: string): ValidatorFn =>
  (group: AbstractControl): ValidationErrors | null =>
    group.get(first)?.value === group.get(second)?.value ? null : { mismatch: true };
