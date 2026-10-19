import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { environment } from '../../environments/environment';
import { firebaseApp } from './firebase';

// Where Instagram sends the professional back after she allows the access.
// It has to be listed in the Meta app as a valid OAuth redirect URI.
const redirectUri = () => `${location.origin}/pro/instagram`;
const STATE_KEY = 'instagram-oauth-state';

const functions = getFunctions(firebaseApp, 'southamerica-east1');
const call = <Request, Response>(name: string) => httpsCallable<Request, Response>(functions, name);

// Instagram API with Instagram Login: the Cloud Functions keep the token and copy the photos to our Storage
@Injectable({ providedIn: 'root' })
export class Instagram {
  readonly available = !!environment.instagramAppId;

  // Sends the professional to Instagram to allow the access
  connect() {
    const state = crypto.randomUUID();
    try {
      sessionStorage.setItem(STATE_KEY, state);
    } catch {
      // Without storage the state can't be checked on the way back
    }

    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.searchParams.set('client_id', environment.instagramAppId);
    url.searchParams.set('redirect_uri', redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'instagram_business_basic');
    url.searchParams.set('state', state);
    location.href = url.toString();
  }

  // Back from Instagram: checks the state and trades the code for the connection
  async finish(code: string, state: string | undefined) {
    let expected: string | null = null;
    try {
      expected = sessionStorage.getItem(STATE_KEY);
      sessionStorage.removeItem(STATE_KEY);
    } catch {
      // ignored
    }
    if (!expected || expected !== state) throw new Error('invalid-state');

    // Instagram appends "#_" to the code
    const result = await call<{ code: string; redirectUri: string }, { username: string; photos: number }>(
      'connectInstagram',
    )({ code: code.replace(/#_$/, ''), redirectUri: redirectUri() });
    return result.data;
  }

  async refresh() {
    return (await call<void, { photos: number }>('refreshInstagram')()).data;
  }

  disconnect() {
    return call<void, void>('disconnectInstagram')();
  }
}
