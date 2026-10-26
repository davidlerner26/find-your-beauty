import { QueryDocumentSnapshot } from 'firebase/firestore';
import { professionalConverter, userConverter } from './converters';

const snapshot = (id: string, data: Record<string, unknown>) =>
  ({ id, data: () => data }) as unknown as QueryDocumentSnapshot;

describe('professionalConverter', () => {
  it('puts the document id in `id`', () => {
    const professional = professionalConverter.fromFirestore(snapshot('p1', { name: 'Ana' }), {});
    expect(professional).toEqual({ name: 'Ana', id: 'p1' });
  });

  it('does not write the id into the document', () => {
    const data = professionalConverter.toFirestore({ id: 'p1', name: 'Ana' } as never);
    expect(data).toEqual({ name: 'Ana' });
  });
});

describe('userConverter', () => {
  it('reads and writes the data as it is', () => {
    const user = { firstName: 'Maria', lastName: 'Silva', email: 'm@e.com', phone: '1' };
    expect(userConverter.fromFirestore(snapshot('u1', user), {})).toEqual(user);
    expect(userConverter.toFirestore(user)).toEqual(user);
  });
});
