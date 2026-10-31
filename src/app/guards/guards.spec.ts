import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Auth } from '../services/auth';
import { Users } from '../services/users';
import { adminGuard } from './admin';
import { clientAreaGuard, clientEntryGuard, clientGuard } from './client';
import { proEntryGuard, proGuard } from './pro';

type Role = 'client' | 'professional' | null;

// Just what the guards read from Auth
const fakeAuth = (state: {
  uid?: string;
  role?: Role;
  admin?: boolean;
  signupIncomplete?: boolean;
}) => ({
  whenReady: Promise.resolve(),
  user: signal(state.uid ? { uid: state.uid } : null),
  role: signal<Role>(state.role ?? null),
  isAdmin: signal(state.admin ?? false),
  signupIncomplete: signal(state.signupIncomplete ?? false),
});

const setup = (auth: ReturnType<typeof fakeAuth>, users: Partial<Users> = {}) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: Auth, useValue: auth },
      { provide: Users, useValue: users },
    ],
  });
};

const run = async (
  guard: typeof adminGuard,
  route = { paramMap: { get: () => 'pro1' } } as unknown as ActivatedRouteSnapshot,
) => {
  const result = await TestBed.runInInjectionContext(() => guard(route, {} as RouterStateSnapshot));
  return result instanceof UrlTree ? result.toString() : result;
};

describe('adminGuard', () => {
  it('lets admins in', async () => {
    setup(fakeAuth({ uid: 'a', admin: true }));
    expect(await run(adminGuard)).toBe(true);
  });

  it('sends everyone else to the start', async () => {
    setup(fakeAuth({ uid: 'c', role: 'client' }));
    expect(await run(adminGuard)).toBe('/');
  });
});

describe('proGuard', () => {
  it('lets professionals in', async () => {
    setup(fakeAuth({ uid: 'p', role: 'professional' }));
    expect(await run(proGuard)).toBe(true);
  });

  it('sends visitors to the professional login', async () => {
    setup(fakeAuth({}));
    expect(await run(proGuard)).toBe('/pro/entrar');
  });

  it('sends clients to the start', async () => {
    setup(fakeAuth({ uid: 'c', role: 'client' }));
    expect(await run(proGuard)).toBe('/');
  });

  it('sends an unfinished sign up back to its second step', async () => {
    setup(fakeAuth({ uid: 'p', signupIncomplete: true }));
    expect(await run(proGuard)).toBe('/pro/cadastro');
  });
});

describe('clientGuard', () => {
  const complete = {
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@example.com',
    phone: '(21) 99747-2878',
    cpf: '529.982.247-25',
    address: 'Rua A, 1',
  };

  it('sends visitors to the login', async () => {
    setup(fakeAuth({}));
    expect(await run(clientGuard)).toBe('/entrar');
  });

  it('sends professionals to the start', async () => {
    setup(fakeAuth({ uid: 'p', role: 'professional' }));
    expect(await run(clientGuard)).toBe('/');
  });

  it('lets a client with a complete profile in', async () => {
    setup(fakeAuth({ uid: 'c', role: 'client' }), { get: async () => complete } as never);
    expect(await run(clientGuard)).toBe(true);
  });

  it('sends a client with missing data to the page of the professional', async () => {
    setup(fakeAuth({ uid: 'c', role: 'client' }), { get: async () => null } as never);
    expect(await run(clientGuard)).toBe('/profissionais/pro1');
  });

  it('lets the client in when the profile cannot be read (the booking checks again)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setup(fakeAuth({ uid: 'c', role: 'client' }), {
      get: async () => {
        throw new Error('offline');
      },
    } as never);
    expect(await run(clientGuard)).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('proEntryGuard', () => {
  it('lets visitors and a sign up that is still going in', async () => {
    setup(fakeAuth({}));
    expect(await run(proEntryGuard)).toBe(true);
  });

  it('sends clients to the start and professionals to their agenda', async () => {
    setup(fakeAuth({ uid: 'c', role: 'client' }));
    expect(await run(proEntryGuard)).toBe('/');
    TestBed.resetTestingModule();
    setup(fakeAuth({ uid: 'p', role: 'professional' }));
    expect(await run(proEntryGuard)).toBe('/pro');
  });
});

describe('clientAreaGuard', () => {
  const routeWith = (proPath?: string) =>
    ({
      data: proPath ? { proPath } : {},
      paramMap: { get: () => null },
    }) as unknown as ActivatedRouteSnapshot;

  it('lets visitors and clients in', async () => {
    setup(fakeAuth({}));
    expect(await run(clientAreaGuard, routeWith())).toBe(true);
    TestBed.resetTestingModule();
    setup(fakeAuth({ uid: 'c', role: 'client' }));
    expect(await run(clientAreaGuard, routeWith())).toBe(true);
  });

  it('sends a professional to the same screen of the professional area, or to the agenda', async () => {
    setup(fakeAuth({ uid: 'p', role: 'professional' }));
    expect(await run(clientAreaGuard, routeWith('/pro/mensagens'))).toBe('/pro/mensagens');
    expect(await run(clientAreaGuard, routeWith())).toBe('/pro');
  });
});

describe('clientEntryGuard', () => {
  it('lets visitors and clients in, and sends a professional to the agenda', async () => {
    setup(fakeAuth({}));
    expect(await run(clientEntryGuard)).toBe(true);
    TestBed.resetTestingModule();
    setup(fakeAuth({ uid: 'p', role: 'professional' }));
    expect(await run(clientEntryGuard)).toBe('/pro');
  });
});
