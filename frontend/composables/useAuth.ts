interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

const authState = reactive<AuthState>({
  token: null,
  user: null,
});

export const useAuth = () => {
  const router = useRouter();

  const isLoggedIn = computed(() => !!authState.token);
  const user = computed(() => authState.user);
  const token = computed(() => authState.token);

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
  };

  const login = async (email: string, password: string) => {
    const res = await $fetch<{ access_token: string; user: User }>('/api/auth/login', {
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
    const res = await $fetch<{ access_token: string; user: User }>('/api/auth/register', {
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
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    router.push('/login');
  };

  const authFetch = async <T>(url: string, opts: any = {}): Promise<T> => {
    return $fetch<T>(url, {
      ...opts,
      headers: {
        ...opts.headers,
        ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
      },
    });
  };

  return { isLoggedIn, user, token, init, login, register, logout, authFetch };
};
