import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Description, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { DownloadSimpleIcon, GlobeIcon, HammerIcon } from '@phosphor-icons/react';
import { Notice, Steps } from '../yare';
import { isUrl, normaliseUrl } from '../lib/pages-api';
import { downloadGuide, guidePrompt } from '../lib/guide';
import { useSites } from './SitesContext';

type Door = null | 'new' | 'existing';

/** Two doors: build a new website with the guide, or bring one you already have. */
export function NewSiteDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (o: boolean) => void }) {
  const { create } = useSites();
  const navigate = useNavigate();
  const [door, setDoor] = useState<Door>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState(false);
  const valid = name.trim().length > 0 && (door === 'new' || isUrl(normaliseUrl(url)));

  async function submit() {
    if (!door || !valid) return;
    setPending(true);
    try {
      const s = await create({ name, url: door === 'existing' ? url : '', kind: door });
      toast.success(door === 'new' ? 'Website added. The guide is on its page.' : 'Website added. Reading its visitors…');
      onOpenChange(false);
      navigate(`/sites/${s.id}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not add the website.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label="New website">
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>{door === null ? 'New website' : door === 'new' ? 'Build a new website' : 'Add a website you have'}</Modal.Heading></Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {door === null && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" className="yare-pick flex-col items-start gap-2 !p-4 text-start" onClick={() => setDoor('new')}>
                    <HammerIcon size={28} className="text-accent" />
                    <span className="font-semibold">Build a new one</span>
                    <span className="text-sm text-muted">With your assistant and the guide. Your code, your hosting, your domain.</span>
                  </button>
                  <button type="button" className="yare-pick flex-col items-start gap-2 !p-4 text-start" onClick={() => setDoor('existing')}>
                    <GlobeIcon size={28} className="text-accent" />
                    <span className="font-semibold">Add one I already have</span>
                    <span className="text-sm text-muted">Paste its address and see its visitors here.</span>
                  </button>
                </div>
              )}
              {door === 'new' && (
                <>
                  <Steps items={[
                    'Create your accounts: GitHub for the code, Cloudflare for the hosting. Free plans are enough.',
                    'Download the guide and give the whole file to your AI assistant.',
                    `Say: “${guidePrompt}”`,
                    'When it is live, come back and paste the address. The full checklist waits on the website’s page.',
                  ]} />
                  <Button variant="outline" className="self-start" onPress={downloadGuide}><DownloadSimpleIcon weight="bold" /> Download the guide</Button>
                  <TextField fullWidth value={name} onChange={setName} maxLength={80} isRequired>
                    <Label>Name</Label>
                    <Input placeholder="My portfolio" autoFocus />
                    <Description>How it appears here. The address comes later.</Description>
                  </TextField>
                </>
              )}
              {door === 'existing' && (
                <>
                  <Notice status="default" icon={false} title="Visitors come from Cloudflare">If the domain is on your Cloudflare account, the figures appear by themselves. If it is elsewhere, add Cloudflare Web Analytics to the site, one script line, and they appear too.</Notice>
                  <TextField fullWidth value={name} onChange={setName} maxLength={80} isRequired>
                    <Label>Name</Label>
                    <Input placeholder="yourname.com" autoFocus />
                  </TextField>
                  <TextField fullWidth value={url} onChange={setUrl} isRequired isInvalid={url.length > 0 && !isUrl(normaliseUrl(url))}>
                    <Label>Address</Label>
                    <Input placeholder="https://yourname.com" inputMode="url" />
                  </TextField>
                </>
              )}
            </Modal.Body>
            <Modal.Footer className="gap-2">
              {door !== null && <Button variant="outline" onPress={() => setDoor(null)}>Back</Button>}
              {door === null && <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>}
              {door !== null && <Button variant="primary" onPress={() => void submit()} isDisabled={!valid} isPending={pending}>{door === 'new' ? 'Start building' : 'Add website'}</Button>}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
