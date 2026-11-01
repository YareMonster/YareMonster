import { useState } from 'react';
import { Button } from '@heroui/react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { SetupGuideDialog, type SetupGuideDialogProps } from './SetupGuideDialog';

export type SetupGuideButtonProps = Omit<SetupGuideDialogProps, 'isOpen' | 'onOpenChange'> & {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
};

/** The Setup guide button with its dialog. Lives in the top bar of the Connections page in every app. */
export function SetupGuideButton({ variant = 'secondary', fullWidth, ...dialog }: SetupGuideButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} fullWidth={fullWidth} onPress={() => setOpen(true)}><DownloadSimpleIcon weight="bold" /> Setup guide</Button>
      <SetupGuideDialog key={`guide-${open}`} isOpen={open} onOpenChange={setOpen} {...dialog} />
    </>
  );
}
