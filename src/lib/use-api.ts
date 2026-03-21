import { useMemo } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { createApiClient } from '@/lib/api';

export function useApi() {
  const { token, tenantId } = useAuth();
  return useMemo(
    () => (token && tenantId ? createApiClient(token, tenantId) : null),
    [token, tenantId],
  );
}
