import { useState, type FormEvent } from 'react';
import { Button, Description, FieldError, Form, Input, Label, Modal, Switch, TextArea, TextField } from '@heroui/react';
import { Notice, appLogoSrc, type CatalogEntry } from '../yare';
import type { LauncherApp } from '../lib/supabase';
import type { AppInput } from '../lib/apps';

interface Props {
  entry: CatalogEntry;
  row?: LauncherApp;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AppInput) => Promise<void>;
}

/** Where the operator records how an app is doing. The launcher believes them; it does not probe anything. */
export function AppStatusDialog({ entry, row, isOpen, onOpenChange, onSubmit }: Props) {
  const [setUp, setSetUp] = useState(row?.status === 'set_up');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const url = String(data.get('url') ?? '').trim();
    const note = String(data.get('note') ?? '').trim();
    setError(null);
    setPending(true);
    try {
      await onSubmit({ status: setUp ? 'set_up' : 'not_set_up', url: url || null, note: note || null });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label={`${entry.name} status`}>
            <Modal.CloseTrigger />
            <Modal.Header className="items-center gap-3">
              <img src={appLogoSrc(entry.slug)} alt="" className="h-10 w-auto" draggable={false} />
              <Modal.Heading>{entry.name}</Modal.Heading>
            </Modal.Header>
            <Form onSubmit={handleSubmit} className="contents">
              <Modal.Body className="flex flex-col gap-4">
                <Switch isSelected={setUp} onChange={setSetUp}>
                  <Switch.Content>
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                    Set up and running
                  </Switch.Content>
                </Switch>
                <TextField name="url" type="url" fullWidth defaultValue={row?.url ?? ''} pattern="https://.*|http://localhost.*">
                  <Label>Address</Label>
                  <Input placeholder={`https://${entry.slug}.yourdomain.com`} inputMode="url" />
                  <Description>Optional. Add it once the app is deployed and the tile gets an Open button.</Description>
                  <FieldError />
                </TextField>
                <TextField name="note" fullWidth defaultValue={row?.note ?? ''} maxLength={280}>
                  <Label>Note</Label>
                  <TextArea placeholder="Optional. Anything you want to remember about this one." rows={2} />
                </TextField>
                {error && <Notice status="danger" title="Could not save">{error}</Notice>}
              </Modal.Body>
              <Modal.Footer className="gap-2">
                <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isPending={pending}>Save</Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
