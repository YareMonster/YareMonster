import { useState } from 'react';
import { FieldError, InputGroup, Label, TextField } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';

export interface PasswordFieldProps {
  name?: string;
  label?: string;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password' | 'off';
  minLength?: number;
  isRequired?: boolean;
  /** Controlled use, for a value the app saves itself (an API key, for instance). */
  value?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
}

/** A password field with the eye toggle. The toggle is a real button, so it works from the keyboard too. */
export function PasswordField({ name = 'password', label = 'Password', placeholder = 'Your password', autoComplete = 'current-password', minLength, isRequired = true, value, onChange, isDisabled }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField name={name} type={visible ? 'text' : 'password'} isRequired={isRequired} fullWidth autoComplete={autoComplete} minLength={minLength} value={value} onChange={onChange} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <InputGroup fullWidth>
        <InputGroup.Input placeholder={placeholder} />
        <InputGroup.Suffix className="pe-1">
          <button
            type="button"
            className="yare-eye"
            aria-label={visible ? 'Hide' : 'Show'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </InputGroup.Suffix>
      </InputGroup>
      <FieldError />
    </TextField>
  );
}
