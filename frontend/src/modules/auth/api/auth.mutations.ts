import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/shared/store/auth.store';
import { authApi } from './auth.api';

/** Business-layer hook: login mutation + session write, per architecture doc §6/§7. */
export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data.user, data.accessToken);
    },
  });
}

/** Business-layer hook: registration mutation + session write. */
export function useRegisterMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data.user, data.accessToken);
    },
  });
}
