import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { ImageIcon } from '@phosphor-icons/react';
import { useGroup } from '../features/GroupContext';
import { removeImage, updateMember, uploadAvatar } from '../lib/groups-api';
import { Avatar } from './Avatar';

/** Your name in the group and your picture. */
export function ProfileDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, me, setMe, email, canEditProfile } = useGroup();
  const [name, setName] = useState(me.display_name);
  const [saving, setSaving] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isOpen) setName(me.display_name); }, [isOpen, me.display_name]);

  async function save() {
    const v = name.trim();
    if (!v) return;
    setSaving(true);
    try { setMe(await updateMember(db, me.user_id, { display_name: v })); onOpenChange(false); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  }
  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    if (file.size > 2097152) { toast.danger('Keep the picture under 2 MB.'); return; }
    setSaving(true);
    try {
      const path = await uploadAvatar(db, me.user_id, file);
      const old = me.avatar_path;
      setMe(await updateMember(db, me.user_id, { avatar_path: path }));
      if (old) await removeImage(db, old);
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not upload the picture.'); }
    finally { setSaving(false); }
  }
  async function clearAvatar() {
    const old = me.avatar_path;
    if (!old) return;
    setSaving(true);
    try { setMe(await updateMember(db, me.user_id, { avatar_path: null })); await removeImage(db, old); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not remove the picture.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog aria-label="Your profile">
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>Your profile</Modal.Heading></Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {!canEditProfile && <p className="text-sm text-muted">In this group, names and pictures are set by the admins.</p>}
              <div className="flex items-center gap-4">
                <Avatar member={me} size={64} />
                {canEditProfile && <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onPress={() => picker.current?.click()} isDisabled={saving}><ImageIcon /> {me.avatar_path ? 'Change picture' : 'Add a picture'}</Button>
                  {me.avatar_path && <Button variant="ghost" size="sm" onPress={() => void clearAvatar()} isDisabled={saving}>Remove</Button>}
                  <input ref={picker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { void pickAvatar(e.target.files?.[0]); e.target.value = ''; }} />
                </div>}
              </div>
              <TextField value={name} onChange={setName} fullWidth maxLength={40} isRequired isDisabled={!canEditProfile}>
                <Label>Your name in the group</Label>
                <Input />
              </TextField>
              <p className="text-xs text-muted">Signed in as {email}.</p>
            </Modal.Body>
            <Modal.Footer className="gap-2">
              <Button variant="outline" onPress={() => onOpenChange(false)}>{canEditProfile ? 'Cancel' : 'Close'}</Button>
              {canEditProfile && <Button variant="primary" onPress={() => void save()} isPending={saving} isDisabled={!name.trim()}>Save</Button>}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
