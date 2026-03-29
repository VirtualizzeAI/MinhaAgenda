import { notifications } from '@mantine/notifications';

const DURATION = 3500;

const colorMap: Record<string, string> = {
  teal: 'var(--mantine-color-teal-5)',
  red: 'var(--mantine-color-red-5)',
  green: 'var(--mantine-color-green-5)',
  blue: 'var(--mantine-color-blue-5)',
};

function BarMessage({ text, color }: { text: string; color: string }) {
  return (
    <>
      {text}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: colorMap[color] ?? colorMap.teal,
          transformOrigin: 'left center',
          animation: `notif-bar-shrink ${DURATION}ms linear forwards`,
          borderRadius: '0 0 var(--mantine-radius-sm) var(--mantine-radius-sm)',
        }}
      />
    </>
  );
}

export function showNotif({
  color,
  title,
  message,
}: {
  color: string;
  title: string;
  message: string;
}) {
  notifications.show({
    color,
    title,
    message: <BarMessage text={message} color={color} />,
    autoClose: DURATION,
    styles: {
      root: {
        overflow: 'hidden',
        position: 'relative',
      },
    },
  });
}
