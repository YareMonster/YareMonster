import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { Notice } from '../../yare';
import type { Client, Document, Envelope } from '../../lib/supabase';
import { deleteEnvelope, updateEnvelope, voidEnvelope } from '../../lib/sign-api';
import { useDebouncedCallback } from '../../lib/save-status';

interface Props {
  db: Client;
  envelope: Envelope;
  documents: Document[];
  onEnvelope: (e: Envelope) => void;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
  onDeleted: () => void;
}

export function SettingsTab({ db, envelope, documents, onEnvelope, run, onDeleted }: Props) {
  const [title, setTitle] = useState(envelope.title);
  const [message, setMessage] = useState(envelope.message);
  const [confirm, setConfirm] = useState<'delete' | 'void' | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = envelope.status !== 'draft';

  const saveTitle = useDebouncedCallback((v: string) => { if (v.trim()) void run(() => updateEnvelope(db, envelope.id, { title: v.trim() })).then((e) => e && onEnvelope(e)); }, 600);
  const saveMessage = useDebouncedCallback((v: string) => { void run(() => updateEnvelope(db, envelope.id, { message: v })).then((e) => e && onEnvelope(e)); }, 600);

  async function destroy() {
    setBusy(true);
    try { await deleteEnvelope(db, envelope.id, documents); toast.success('Document deleted'); onDeleted(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { const e = await voidEnvelope(db, envelope.id); onEnvelope(e); toast.success('Cancelled. The links no longer work.'); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not cancel it.'); }
    finally { setBusy(false); setConfirm(null); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-5">
        <h3 className="text-lg">Basics</h3>
        <TextField fullWidth value={title} onChange={(v) => { setTitle(v); saveTitle(v); }} maxLength={160} isRequired>
          <Label>Title</Label>
          <Input />
          <Description>Shown in the emails, on the signing page and in your list.</Description>
        </TextField>
        <TextField fullWidth value={message} onChange={(v) => { setMessage(v); saveMessage(v); }} maxLength={2000} isDisabled={locked}>
          <Label>Message to the participants</Label>
          <TextArea rows={4} placeholder="Optional. A few lines that go in the email and above the document." />
        </TextField>
      </Card>

      <Card className="gap-4 p-5">
        <h3 className="text-lg">Good to know</h3>
        <Notice status="default" icon={false} title="PDF in, PDF out">Fields are drawn onto a copy of your PDF when everyone has signed. The original stays untouched in your storage.</Notice>
        <Notice status="default" icon={false} title="Pwrd by Yare Monster">Every signing page ends with the Yare Monster credit. It is part of the licence and cannot be switched off.</Notice>
      </Card>

      {envelope.status === 'sent' && (
        <Card className="gap-3 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg">Cancel this document</h3>
              <p className="text-sm text-muted">The links stop working and nobody else can sign. Signatures already given are kept.</p>
            </div>
            <Button variant="danger-soft" onPress={() => setConfirm('void')}>Cancel sending</Button>
          </div>
        </Card>
      )}

      <Card className="gap-3 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Delete this document</h3>
            <p className="text-sm text-muted">Removes the PDFs, the participants, the fields and every signature. There is no undo.</p>
          </div>
          <Button variant="danger-soft" onPress={() => setConfirm('delete')}>Delete document</Button>
        </div>
      </Card>

      <AlertDialog isOpen={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label={confirm === 'delete' ? 'Delete document' : 'Cancel sending'}>
              <AlertDialog.Header><AlertDialog.Heading>{confirm === 'delete' ? `Delete “${envelope.title}”?` : 'Cancel sending?'}</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">{confirm === 'delete' ? 'Everything about this document is deleted from your database and your storage.' : 'Every link stops working. People who have not signed yet will see that the document was cancelled.'}</p></AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setConfirm(null)}>Keep it</Button>
                <Button variant="danger" onPress={() => void (confirm === 'delete' ? destroy() : cancel())} isPending={busy}>{confirm === 'delete' ? 'Delete' : 'Cancel sending'}</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
