import { useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Card, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CopyIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { Notice, PersonChip, StatusChip } from '../../yare';
import type { Client, Envelope, Participant } from '../../lib/supabase';
import { email, markSent } from '../../lib/sign-api';
import { useEnvelopes } from '../EnvelopesContext';
import { fullName, participantLabel, participantTone } from '../status';

interface Props {
  db: Client;
  envelope: Envelope;
  participants: Participant[];
  setParticipants: Dispatch<SetStateAction<Participant[]>>;
  onPublish: () => void;
  publishing: boolean;
}

async function copy(label: string, value: string) {
  try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`); }
  catch { toast.danger('Could not copy. Select the text and copy it yourself.'); }
}

/** One link per participant. Copy it by hand, or let the deployment email it. */
export function ShareTab({ db, envelope, participants, setParticipants, onPublish, publishing }: Props) {
  const { emailState, settings } = useEnvelopes();
  const [sending, setSending] = useState<string | null>(null);
  const base = (settings?.app_url || window.location.origin).replace(/\/+$/, '');
  const live = envelope.status === 'sent' || envelope.status === 'completed';
  const canEmail = emailState.status === 'ready';

  function turn(p: Participant): boolean {
    if (p.role !== 'signer' || envelope.status !== 'sent') return false;
    if (!envelope.ordered) return true;
    return participants.filter((q) => q.role === 'signer' && q.position < p.position).every((q) => q.status === 'signed');
  }

  async function copyLink(p: Participant) {
    await copy('Link', `${base}/s/${p.token}`);
    const next = await markSent(db, p).catch(() => p);
    setParticipants((list) => list.map((x) => (x.id === next.id ? next : x)));
  }

  async function send(ids: string[]) {
    setSending(ids.join(','));
    try {
      const r = await email(db, { action: 'send', envelope_id: envelope.id, participant_ids: ids });
      toast.success(r.sent ? `Email sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}` : 'Nothing to send right now');
      const { data } = await db.from('yaresign_participants').select('*').eq('envelope_id', envelope.id).order('position');
      if (data) setParticipants(data);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setSending(null);
    }
  }

  const due = participants.filter((p) => turn(p) && p.status !== 'signed');

  return (
    <div className="flex flex-col gap-4">
      {!live && (
        <Card className="gap-4 p-5">
          <div>
            <h3 className="text-lg">Not sent yet</h3>
            <p className="text-sm text-muted">Publish to create one private link per person. {canEmail ? 'The first signers get an email right away.' : 'Then copy each link and send it yourself.'}</p>
          </div>
          <Button variant="secondary" className="self-start" onPress={onPublish} isPending={publishing}>Send for signature</Button>
        </Card>
      )}

      {live && emailState.status === 'missing' && <Notice status="default" icon={false} title="Sending by hand">Email is not set up on this deployment, so copy each link below and send it the way you like. Add a Resend key under Connections and it sends for you.</Notice>}
      {live && emailState.status === 'error' && <Notice status="warning" icon={false} title="Email could not be checked">{emailState.detail} You can still copy the links.</Notice>}

      {live && (
        <>
          {canEmail && envelope.status === 'sent' && due.length > 0 && (
            <div className="flex justify-end">
              <Button variant="primary" onPress={() => void send(due.map((p) => p.id))} isPending={sending !== null}><PaperPlaneTiltIcon /> Email everyone whose turn it is ({due.length})</Button>
            </div>
          )}
          <ol className="flex flex-col gap-3">
            {participants.map((p, i) => {
              const url = `${base}/s/${p.token}`;
              const waiting = envelope.ordered && p.role === 'signer' && !turn(p) && p.status !== 'signed';
              return (
                <li key={p.id}>
                  <Card className="gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <PersonChip name={fullName(p)} detail={p.email || (p.role === 'viewer' ? 'Receives the copy' : 'Signs')} colour={i} />
                      <StatusChip tone={waiting ? 'default' : participantTone(p.status)}>{waiting ? 'Not their turn yet' : p.role === 'viewer' ? 'Gets the copy' : participantLabel(p.status)}</StatusChip>
                    </div>
                    {p.role === 'signer' && (
                      <div className="flex items-center justify-between gap-3 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2">
                        <code className="block truncate text-sm">{url}</code>
                        <Button variant="ghost" size="sm" isIconOnly aria-label="Copy link" onPress={() => void copyLink(p)}><CopyIcon /></Button>
                      </div>
                    )}
                    {p.role === 'signer' && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onPress={() => void copyLink(p)}><CopyIcon /> Copy link</Button>
                        <Button variant="outline" size="sm" onPress={() => window.open(url, '_blank', 'noopener,noreferrer')}>Open <ArrowSquareOutIcon /></Button>
                        {canEmail && p.status !== 'signed' && !waiting && (
                          <Button variant="secondary" size="sm" onPress={() => void send([p.id])} isPending={sending === p.id} isDisabled={!p.email}><PaperPlaneTiltIcon /> {p.status === 'pending' ? 'Email the link' : 'Email again'}</Button>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
