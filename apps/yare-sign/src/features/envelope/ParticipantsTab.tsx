import { useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Card, Description, Input, Label, ListBox, Select, Switch, TextField } from '@heroui/react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Notice, PersonChip, StatusChip } from '../../yare';
import type { Client, Envelope, Participant } from '../../lib/supabase';
import { addParticipant, deleteParticipant, reorderParticipants, updateEnvelope, updateParticipant } from '../../lib/sign-api';
import { useDebouncedPatch } from '../../lib/save-status';
import { fullName, participantLabel, participantTone } from '../status';

interface Props {
  db: Client;
  envelope: Envelope;
  onEnvelope: (e: Envelope) => void;
  participants: Participant[];
  setParticipants: Dispatch<SetStateAction<Participant[]>>;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
  locked: boolean;
}

/** Who signs and who just gets a copy, in which order. */
export function ParticipantsTab({ db, envelope, onEnvelope, participants, setParticipants, run, locked }: Props) {
  async function add(role: Participant['role']) {
    const created = await run(() => addParticipant(db, envelope.id, participants.length, role));
    if (created) setParticipants((list) => [...list, created]);
  }
  async function remove(p: Participant) {
    const ok = await run(() => deleteParticipant(db, p.id).then(() => true));
    if (ok) setParticipants((list) => list.filter((x) => x.id !== p.id));
  }
  function move(p: Participant, dir: -1 | 1) {
    const i = participants.indexOf(p), j = i + dir;
    if (j < 0 || j >= participants.length) return;
    const next = [...participants];
    [next[i], next[j]] = [next[j]!, next[i]!];
    const ordered = next.map((x, k) => ({ ...x, position: k }));
    setParticipants(ordered);
    void run(() => reorderParticipants(db, ordered.map((x) => x.id)));
  }
  async function toggleOrdered(v: boolean) {
    const e = await run(() => updateEnvelope(db, envelope.id, { ordered: v }));
    if (e) onEnvelope(e);
  }

  const signers = participants.filter((p) => p.role === 'signer');

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Signing order</h3>
            <p className="text-sm text-muted">{envelope.ordered ? 'One after the other: each signer sees the signatures before theirs.' : 'All at once: everyone gets their link together and the copy is consolidated at the end.'}</p>
          </div>
          <Switch isSelected={envelope.ordered} onChange={(v) => void toggleOrdered(v)} isDisabled={locked}>
            <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Sign in order</Switch.Content>
          </Switch>
        </div>
      </Card>

      {participants.length === 0 && <Notice status="default" icon={false} title="Nobody yet">Add the people who sign, and anyone who should receive the signed copy.</Notice>}

      <ol className="flex flex-col gap-3">
        {participants.map((p, i) => (
          <li key={p.id}>
            <ParticipantCard db={db} participant={p} index={i} ordered={envelope.ordered} signerNumber={p.role === 'signer' ? signers.indexOf(p) + 1 : null} run={run} locked={locked}
              onChange={(next) => setParticipants((list) => list.map((x) => (x.id === next.id ? next : x)))}
              onRemove={() => void remove(p)} onUp={i > 0 ? () => move(p, -1) : undefined} onDown={i < participants.length - 1 ? () => move(p, 1) : undefined} />
          </li>
        ))}
      </ol>

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onPress={() => void add('signer')}><PlusIcon weight="bold" /> Add a signer</Button>
          <Button variant="outline" onPress={() => void add('viewer')}><PlusIcon weight="bold" /> Add someone to keep informed</Button>
        </div>
      )}
    </div>
  );
}

function ParticipantCard({ db, participant, index, ordered, signerNumber, run, locked, onChange, onRemove, onUp, onDown }: { db: Client; participant: Participant; index: number; ordered: boolean; signerNumber: number | null; run: Props['run']; locked: boolean; onChange: (p: Participant) => void; onRemove: () => void; onUp?: () => void; onDown?: () => void }) {
  const [draft, setDraft] = useState(participant);
  const save = useDebouncedPatch((patch: Partial<Pick<Participant, 'first_name' | 'last_name' | 'email' | 'company' | 'job_title'>>) => { void run(() => updateParticipant(db, participant.id, patch)); }, 600);
  function set(patch: Partial<Pick<Participant, 'first_name' | 'last_name' | 'email' | 'company' | 'job_title'>>) {
    const next = { ...draft, ...patch };
    setDraft(next); onChange(next); save(patch);
  }
  async function setRole(role: Participant['role']) {
    const next = await run(() => updateParticipant(db, participant.id, { role }));
    if (next) { setDraft(next); onChange(next); }
  }
  const emailOk = draft.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {ordered && signerNumber && <span className="yare-step-n">{signerNumber}</span>}
          <PersonChip name={fullName(draft)} detail={draft.role === 'signer' ? 'Signs' : 'Receives the copy'} colour={index} />
        </div>
        <div className="flex items-center gap-1">
          {participant.status !== 'pending' && <StatusChip tone={participantTone(participant.status)}>{participantLabel(participant.status)}</StatusChip>}
          {!locked && (
            <>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Move up" isDisabled={!onUp} onPress={onUp}><ArrowUpIcon /></Button>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Move down" isDisabled={!onDown} onPress={onDown}><ArrowDownIcon /></Button>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Remove participant" onPress={onRemove}><TrashIcon /></Button>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField fullWidth value={draft.first_name} onChange={(v) => set({ first_name: v })} maxLength={80} isRequired isDisabled={locked}><Label>First name</Label><Input /></TextField>
        <TextField fullWidth value={draft.last_name} onChange={(v) => set({ last_name: v })} maxLength={80} isDisabled={locked}><Label>Surname</Label><Input /></TextField>
        <TextField fullWidth value={draft.email} onChange={(v) => set({ email: v.trim() })} maxLength={200} type="email" isRequired isInvalid={!emailOk} isDisabled={locked}>
          <Label>Email</Label><Input inputMode="email" placeholder="name@domain.com" />
          {!emailOk && <Description className="text-danger">That does not look like an email address.</Description>}
        </TextField>
        <TextField fullWidth value={draft.company} onChange={(v) => set({ company: v })} maxLength={120} isDisabled={locked}><Label>Company</Label><Input placeholder="Optional" /></TextField>
        <TextField fullWidth value={draft.job_title} onChange={(v) => set({ job_title: v })} maxLength={120} isDisabled={locked}><Label>Position</Label><Input placeholder="Optional" /></TextField>
        <Select aria-label="Role" selectedKey={draft.role} onSelectionChange={(k) => void setRole(k as Participant['role'])} fullWidth isDisabled={locked}>
          <Label>Role</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="signer" textValue="Signs">Signs</ListBox.Item>
              <ListBox.Item id="viewer" textValue="Receives the copy">Receives the copy</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </Card>
  );
}
