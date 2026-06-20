import { auth } from './firebase';

export function useApi() {
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    let token = '';
    
    if (user) {
      token = await user.getIdToken();
    }

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers
    });
  };

  return { apiFetch };
}
