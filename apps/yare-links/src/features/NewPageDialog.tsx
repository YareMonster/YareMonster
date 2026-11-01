import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Description, Form, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { usePages } from './PagesContext';
import { slugFromTitle } from '../lib/slug';

/** A title, which becomes the address. Everything else is set on the page itself. */
export function NewPageDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (o: boolean) => void }) {
  const { create } = usePages();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try { const p = await create(title.trim()); onOpenChange(false); setTitle(''); navigate(`/pages/${p.id}`); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not create the page.'); }
    finally { setBusy(false); }
  }
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop><Modal.Container size="sm"><Modal.Dialog aria-label="New page">
        <Modal.CloseTrigger />
        <Modal.Header><Modal.Heading>New page</Modal.Heading></Modal.Header>
        <Form onSubmit={go}>
          <Modal.Body className="flex flex-col gap-4">
            <TextField value={title} onChange={setTitle} fullWidth maxLength={80} isRequired autoFocus>
              <Label>Title</Label>
              <Input placeholder="Your name, your brand, your band" />
              <Description>{title.trim() ? `Address: /${slugFromTitle(title)}. You can change it later.` : 'Shown at the top of the page.'}</Description>
            </TextField>
          </Modal.Body>
          <Modal.Footer className="gap-2"><Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="primary" isPending={busy} isDisabled={!title.trim()}>Create page</Button></Modal.Footer>
        </Form>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}
