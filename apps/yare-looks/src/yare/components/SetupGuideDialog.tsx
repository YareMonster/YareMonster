import { useState } from 'react';
import { Button, Link, Modal, toast } from '@heroui/react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { catalog, type CatalogEntry } from '../catalog';
import { buildSetupGuide, downloadText } from '../setup-guide';
import { AppPicker } from './AppPicker';
import { Notice } from './Notice';

export interface SetupGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The apps on offer. The launcher passes the whole catalogue; a single app passes itself. */
  apps?: CatalogEntry[];
  repoUrl: string | null;
  /** The Supabase project to write into the guide. Undefined for an app without a database. */
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  email?: string;
  /** Shown as a link when no repository is saved. Omit it to hide the hint. */
  onOpenConnections?: () => void;
}

/** The "use my AI assistant" path: pick the apps (or take the one), download one Markdown file, hand it over. */
export function SetupGuideDialog({ isOpen, onOpenChange, apps: offered = catalog, repoUrl, supabaseUrl, supabasePublishableKey, email, onOpenConnections }: SetupGuideDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(offered.map((a) => a.slug)));
  const apps = offered.filter((a) => selected.has(a.slug));
  const single = offered.length === 1 ? offered[0]! : null;

  function download() {
    const md = buildSetupGuide({ apps, repoUrl, supabaseUrl, supabasePublishableKey, email });
    downloadText(single ? `yare-${single.slug}-setup-guide.md` : apps.length === catalog.length ? 'yare-setup-guide.md' : `yare-setup-${apps.map((a) => a.slug).join('-')}.md`, md);
    toast.success('Setup guide downloaded');
    onOpenChange(false);
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label="Download setup guide">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Install with your AI agents</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                {single
                  ? `You get one Markdown file with every step to install ${single.name}${supabaseUrl ? ', your Supabase project already filled in' : ''}, ready to paste into Lovable, Cursor or any AI assistant. Nothing secret goes in the file.`
                  : 'Choose the apps you want. You get one Markdown file with every step, your Supabase project already filled in, ready to paste into Lovable, Cursor or any AI assistant. Nothing secret goes in the file.'}
              </p>
              {!single && <AppPicker apps={offered} selected={selected} onChange={setSelected} />}
              {!repoUrl && onOpenConnections && (
                <Notice status="accent" icon={false} title="Using the official repository">
                  Add your own copy of the repository in{' '}
                  <Link className="text-sm" onPress={() => { onOpenChange(false); onOpenConnections(); }}>Connections</Link>
                  {' '}if you want the guide to clone yours instead.
                </Notice>
              )}
            </Modal.Body>
            <Modal.Footer className="gap-2">
              <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="primary" onPress={download} isDisabled={apps.length === 0}>
                <DownloadSimpleIcon weight="bold" /> Download guide
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
