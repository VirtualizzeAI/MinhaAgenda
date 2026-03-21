import { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/styles/theme';
import { AuthProvider } from '@/features/auth/auth-context';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <AuthProvider>{children}</AuthProvider>
    </MantineProvider>
  );
}
