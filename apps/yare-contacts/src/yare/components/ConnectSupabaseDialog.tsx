import { useState, type FormEvent } from 'react';
import { Button, Description, FieldError, Form, Input, Label, Modal, TextField } from '@heroui/react';
import { Notice } from './Notice';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  current: { url: string; key: string };
  onSubmit: (values: { url: string; key: string } | null) => Promise<void>;
  /** True when the values shown come from this launcher's own configuration rather than a saved override. */
  isDefault: boolean;
}

/** Paste a project's public values. No OAuth yet; this is the manual connection the website describes. */
export function ConnectSupabaseDialog({ isOpen, onOpenChange, current, onSubmit, isDefault }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const url = String(data.get('url') ?? '').trim().replace(/\/+$/, '');
    const key = String(data.get('key') ?? '').trim();
    setError(null);
    setPending(true);
    try {
      await onSubmit({ url, key });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    setPending(true);
    try { await onSubmit(null); onOpenChange(false); } catch (err) { setError(err instanceof Error ? err.message : 'Could not reset.'); } finally { setPending(false); }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label="Connect Supabase">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Connect Supabase</Modal.Heading>
            </Modal.Header>
            <Form onSubmit={handleSubmit} className="contents">
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Paste the two public values of the Supabase project your apps should use. Find them in Supabase → Project Settings → Data API and API Keys.
                </p>
                <TextField name="url" type="url" isRequired fullWidth defaultValue={current.url} pattern="https://[a-z0-9\-]+\.supabase\.co/?">
                  <Label>Project URL</Label>
                  <Input placeholder="https://your-project-ref.supabase.co" inputMode="url" />
                  <FieldError />
                </TextField>
                <TextField name="key" isRequired fullWidth defaultValue={current.key} minLength={20}>
                  <Label>Publishable key</Label>
                  <Input placeholder="sb_publishable_…" />
                  <Description>The publishable (or legacy anon) key. Never the secret or service-role key.</Description>
                  <FieldError />
                </TextField>
                {error && <Notice status="danger" title="Could not save">{error}</Notice>}
              </Modal.Body>
              <Modal.Footer className="gap-2">
                {!isDefault && <Button variant="ghost" onPress={reset} isDisabled={pending}>Use this launcher's project</Button>}
                <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isPending={pending}>Connect</Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
