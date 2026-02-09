interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  ready: boolean;
}

const authState = reactive<AuthState>({
  token: null,
  user: null,
  ready: false,
});

export const useAuth = () => {
  const router = useRouter();
  const config = useRuntimeConfig();

  const isLoggedIn = computed(() => !!authState.token);
  const user = computed(() => authState.user);
  const token = computed(() => authState.token);
  const ready = computed(() => authState.ready);

  const init = () => {
    if (import.meta.client) {
      const savedToken = localStorage.getItem('ss_token');
      const savedUser = localStorage.getItem('ss_user');
      if (savedToken && savedUser) {
        authState.token = savedToken;
        try {
          authState.user = JSON.parse(savedUser);
        } catch {
          localStorage.removeItem('ss_token');
          localStorage.removeItem('ss_user');
        }
      }
    }
    authState.ready = true;
  };

  const login = async (email: string, password: string) => {
    const res = await $fetch<{ access_token: string; user: User }>(`${config.public.apiBase}/api/auth/login`, {
      method: 'POST',
      body: { email, password },
    });
    authState.token = res.access_token;
    authState.user = res.user;
    localStorage.setItem('ss_token', res.access_token);
    localStorage.setItem('ss_user', JSON.stringify(res.user));
    router.push('/');
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await $fetch<{ access_token: string; user: User }>(`${config.public.apiBase}/api/auth/register`, {
      method: 'POST',
      body: { name, email, password },
    });
    authState.token = res.access_token;
    authState.user = res.user;
    localStorage.setItem('ss_token', res.access_token);
    localStorage.setItem('ss_user', JSON.stringify(res.user));
    router.push('/');
  };

  const logout = () => {
    authState.token = null;
    authState.user = null;
    authState.ready = true;
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    router.push('/login');
  };

  const authFetch = async <T>(url: string, opts: any = {}): Promise<T> => {
    try {
      return await $fetch<T>(`${config.public.apiBase}${url}`, {
        ...opts,
        headers: {
          ...opts.headers,
          ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
        },
      });
    } catch (err: any) {
      if (err?.status === 401) {
        authState.token = null;
        authState.user = null;
        localStorage.removeItem('ss_token');
        localStorage.removeItem('ss_user');
        router.push('/login');
      }
      throw err;
    }
  };

  return { isLoggedIn, user, token, ready, init, login, register, logout, authFetch };
};
