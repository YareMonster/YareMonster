import { useState } from 'react';
import { Button, Popover } from '@heroui/react';
import { QuestionIcon, RedditLogoIcon } from '@phosphor-icons/react';
import type { AppIdentity } from '../brand';
import { YARE } from '../brand';

/** The Help button in the sidebar: a small card inviting people to the community. */
export function HelpMenu(_props: { app: AppIdentity }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant="ghost" isIconOnly aria-label="Help"><QuestionIcon /></Button>
      <Popover.Content placement="top start" className="w-72">
        <Popover.Dialog aria-label="Help" className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base">Need a hand?</h3>
            <p className="text-sm text-muted">
              Questions, ideas and other people running Yare Monster apps meet in the community.
            </p>
          </div>
          <Button variant="primary" fullWidth onPress={() => window.open(YARE.community.url, '_blank', 'noopener,noreferrer')}>
            <RedditLogoIcon /> Join {YARE.community.name}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
