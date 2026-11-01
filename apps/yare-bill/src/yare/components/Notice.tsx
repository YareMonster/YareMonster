import type { ReactNode } from 'react';
import { Alert } from '@heroui/react';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';

export type NoticeStatus = 'default' | 'accent' | 'success' | 'warning' | 'danger';

const icons: Record<NoticeStatus, ReactNode> = {
  default: <InfoIcon />,
  accent: <InfoIcon />,
  success: <CheckCircleIcon />,
  warning: <WarningIcon />,
  danger: <WarningCircleIcon />,
};

/**
 * A callout: icon, short title, one or two sentences. Errors, confirmations and hints all use it,
 * so they look like part of the interface instead of stray text.
 */
export function Notice({ status = 'default', title, children, className, icon = true }: { status?: NoticeStatus; title: string; children?: ReactNode; className?: string; icon?: boolean }) {
  return (
    <Alert status={status} className={className} role={status === 'danger' ? 'alert' : 'status'}>
      {icon && <Alert.Indicator>{icons[status]}</Alert.Indicator>}
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {children && <Alert.Description>{children}</Alert.Description>}
      </Alert.Content>
    </Alert>
  );
}
