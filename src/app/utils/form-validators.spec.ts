import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  cpfValidator,
  emailValidator,
  fieldsMatch,
  minTrimmedLength,
  mobileValidator,
  passwordValidator,
} from './form-validators';

const errors = (validator: (c: FormControl) => unknown, value: unknown) =>
  validator(new FormControl(value));

describe('form validators', () => {
  const cases: [string, (c: FormControl) => unknown, string, string, string][] = [
    ['email', emailValidator as never, 'email', 'maria@example.com', 'maria@'],
    ['password', passwordValidator as never, 'password', 'abc12!', 'abcdef'],
    ['cpf', cpfValidator as never, 'cpf', '529.982.247-25', '111.111.111-11'],
    ['mobile', mobileValidator as never, 'mobile', '(21) 99747-2878', '(21) 3974-2878'],
    ['minlength', minTrimmedLength(3) as never, 'minlength', 'Ana', ' An '],
  ];

  it.each(cases)(
    '%s: accepts a good value and names the error of a bad one',
    (_n, validator, key, good, bad) => {
      expect(errors(validator, good)).toBeNull();
      expect(errors(validator, bad)).toEqual({ [key]: true });
    },
  );

  it.each(cases)('%s: leaves an empty value to `required`', (_n, validator) => {
    for (const empty of ['', '   ', null, undefined]) expect(errors(validator, empty)).toBeNull();
  });

  it('works together with Validators.required', () => {
    const control = new FormControl('', [Validators.required, emailValidator]);
    expect(control.errors).toEqual({ required: true });
    control.setValue('x');
    expect(control.errors).toEqual({ email: true });
    control.setValue('maria@example.com');
    expect(control.valid).toBe(true);
  });
});

describe('fieldsMatch', () => {
  const group = (a: string, b: string) =>
    new FormGroup({ a: new FormControl(a), b: new FormControl(b) }, fieldsMatch('a', 'b'));

  it('is valid when both fields are the same', () => {
    expect(group('abc12!', 'abc12!').errors).toBeNull();
  });

  it('flags a difference, and follows either field changing', () => {
    const g = group('abc12!', 'abc12');
    expect(g.errors).toEqual({ mismatch: true });
    g.controls['b'].setValue('abc12!');
    expect(g.errors).toBeNull();
    g.controls['a'].setValue('other');
    expect(g.errors).toEqual({ mismatch: true });
  });
});
