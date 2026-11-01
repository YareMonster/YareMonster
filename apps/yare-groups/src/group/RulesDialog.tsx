import { useEffect, useState } from 'react';
import { Button, Modal, toast } from '@heroui/react';
import { useGroup } from '../features/GroupContext';
import { acceptRules } from '../lib/groups-api';

/** The group's rules. Members accept them once, and again when they change, before they post. */
export function RulesDialog() {
  const { db, group, me, setMe, needsRules, rulesOpen, setRulesOpen } = useGroup();
  const [saving, setSaving] = useState(false);
  // Shown by itself the first time someone arrives with rules to accept.
  useEffect(() => { if (needsRules) setRulesOpen(true); }, [needsRules, setRulesOpen]);

  async function accept() {
    setSaving(true);
    try { setMe(await acceptRules(db, me.user_id)); setRulesOpen(false); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save that.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={rulesOpen} onOpenChange={setRulesOpen}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label="Group rules">
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>{group.name} rules</Modal.Heading></Modal.Header>
            <Modal.Body><p className="max-h-[50dvh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed">{group.rules}</p></Modal.Body>
            <Modal.Footer className="gap-2">
              {needsRules ? (
                <>
                  <Button variant="outline" onPress={() => setRulesOpen(false)}>Read later</Button>
                  <Button variant="primary" isPending={saving} onPress={() => void accept()}>I agree</Button>
                </>
              ) : <Button variant="outline" onPress={() => setRulesOpen(false)}>Close</Button>}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
