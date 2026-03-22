import { PropsWithChildren } from 'react';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Card,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LogOut,
  Menu,
  Settings2,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

interface NavigationItem {
  label: string;
  path: string;
  icon: typeof CalendarDays;
}

const primaryItems: NavigationItem[] = [
  { label: 'Agenda', path: '/agenda', icon: CalendarDays },
  { label: 'Clientes', path: '/clientes', icon: Users },
  { label: 'Serviços', path: '/servicos', icon: BriefcaseBusiness },
  { label: 'Comandas', path: '/comandas', icon: ClipboardList },
];

const secondaryItems: NavigationItem[] = [
  { label: 'Cobranças', path: '/cobrancas', icon: Wallet },
  { label: 'Profissionais', path: '/profissionais', icon: CreditCard },
  { label: 'Relatórios', path: '/relatorios', icon: Sparkles },
  { label: 'Perfil', path: '/perfil', icon: Settings2 },
];

function NavigationButton({ item, active, onNavigate }: { item: NavigationItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;

  return (
    <UnstyledButton
      component={Link}
      onClick={onNavigate}
      to={item.path}
      style={{
        display: 'block',
        borderRadius: 18,
        padding: '12px 14px',
        background: active ? 'linear-gradient(135deg, #0b6b63 0%, #23c3ae 100%)' : 'transparent',
        color: active ? '#ffffff' : '#1c2b3a',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon color={active ? 'rgba(255,255,255,0.2)' : 'teal'} radius="xl" size={36} variant={active ? 'filled' : 'light'}>
          <Icon size={18} />
        </ThemeIcon>
        <Text fw={700} size="sm">
          {item.label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

function MobileBottomBar() {
  const location = useLocation();

  return (
    <Card
      radius="xl"
      shadow="lg"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 40,
        backdropFilter: 'blur(14px)',
        background: 'rgba(255,255,255,0.88)',
      }}
    >
      <Group grow>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <UnstyledButton
              key={item.path}
              component={Link}
              to={item.path}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0' }}
            >
              <ThemeIcon color={active ? 'teal' : 'gray'} radius="xl" size={38} variant={active ? 'filled' : 'light'}>
                <Icon size={18} />
              </ThemeIcon>
              <Text c={active ? 'teal.7' : 'dimmed'} fw={700} size="10px">
                {item.label}
              </Text>
            </UnstyledButton>
          );
        })}
      </Group>
    </Card>
  );
}

export function AppShellLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { logout, user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 62em)');

  const greetingByTime = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <>
      <AppShell
        header={{ height: 72 }}
        navbar={{ width: 292, breakpoint: 'lg', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header bg="rgba(255,255,255,0.82)" style={{ backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(10,20,32,0.08)' }}>
          <Group h="100%" justify="space-between" px="md">
            <Group gap="sm">
              <Burger hiddenFrom="lg" opened={opened} onClick={toggle} size="sm" />
              <ThemeIcon radius="xl" size={44} variant="gradient" gradient={{ from: 'teal.7', to: 'coral.4', deg: 140 }}>
                <CalendarDays size={22} />
              </ThemeIcon>
              <div>
                <Title order={4}>MinhaAgenda</Title>
                <Text c="dimmed" size="xs">
                  Gestão de agenda e serviços
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              <ActionIcon aria-label="Busca rápida (desativado)" disabled radius="xl" size={42} variant="light">
                <Search size={18} />
              </ActionIcon>
              {!isDesktop ? (
                <ActionIcon aria-label="Menu" radius="xl" size={42} variant="light">
                  <Menu size={18} />
                </ActionIcon>
              ) : null}
              <Avatar color="teal" radius="xl" style={{ display: 'none' }}>M</Avatar>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md" bg="rgba(255,255,255,0.88)" style={{ backdropFilter: 'blur(18px)' }}>
          <AppShell.Section>
            <Card radius="xl" p="md" withBorder>
              <Group justify="space-between">
                <Box>
                  <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                    {greetingByTime}
                  </Text>
                  <Text fw={800}>{user?.name ?? 'Bem-vindo'}</Text>
                </Box>
              </Group>
            </Card>
          </AppShell.Section>

          <AppShell.Section component={ScrollArea} grow mt="md">
            <Stack gap="xs">
              {primaryItems.map((item) => (
                <NavigationButton
                  key={item.path}
                  active={location.pathname === item.path}
                  item={item}
                  onNavigate={close}
                />
              ))}
            </Stack>

            <Divider label="Gestão" labelPosition="left" my="md" />

            <Stack gap="xs">
              {secondaryItems.map((item) => (
                <NavigationButton
                  key={item.path}
                  active={location.pathname === item.path}
                  item={item}
                  onNavigate={close}
                />
              ))}
            </Stack>
          </AppShell.Section>

          <AppShell.Section>
            <Button color="ink.8" fullWidth leftSection={<LogOut size={16} />} radius="xl" variant="light" onClick={logout}>
              Sair
            </Button>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main pb={isDesktop ? 'md' : 96}>
          {children}
        </AppShell.Main>
      </AppShell>

      {!isDesktop ? <MobileBottomBar /> : null}
    </>
  );
}
