import { Button, Modal } from '@heroui/react';
import { ArrowSquareOutIcon, BookOpenIcon, ScrollIcon } from '@phosphor-icons/react';
import type { AppIdentity } from '../brand';
import { YARE, yareLicenceUrl } from '../brand';
import { YareMark } from './YareLogo';

export interface AboutYareDialogProps {
  app: AppIdentity;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The in-app credit, behind the monster button in the sidebar: what Yare Monster is, the licence, the site, the docs. */
export function AboutYareDialog({ app, isOpen, onOpenChange }: AboutYareDialogProps) {
  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog aria-label={`About ${app.name}`}>
            <Modal.CloseTrigger />
            <Modal.Header className="items-start gap-3">
              <YareMark size={44} />
              <Modal.Heading>About {app.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 text-sm">
              <p className="text-base">
                {app.name} is part of Yare Monster. Free to use, open code, self-hosted.
              </p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" fullWidth onPress={() => open(yareLicenceUrl)}><ScrollIcon /> Licence</Button>
                  <Button variant="outline" fullWidth className={app.docsUrl ? '' : 'col-span-2'} isDisabled={!app.docsUrl} onPress={() => app.docsUrl && open(app.docsUrl)}><BookOpenIcon /> Documentation</Button>
                </div>
                <Button variant="primary" fullWidth onPress={() => open(YARE.url)}>Yare Monster <ArrowSquareOutIcon /></Button>
              </div>
              <p className="text-xs text-muted">
                This credit says where the code came from. Yare Monster does not run, endorse or have access to your deployments.
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
