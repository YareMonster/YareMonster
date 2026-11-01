import type { AnswerValue, Block, BlockOptions, BlockType } from './supabase';

export interface BlockKind {
  type: BlockType;
  label: string;
  /** What the screen asks for, in one line, for the add menu. */
  hint: string;
  /** Welcome and end are not questions: they collect nothing and appear once. */
  isQuestion: boolean;
  defaults: { title: string; description: string; options: BlockOptions };
}

export const blockKinds: BlockKind[] = [
  { type: 'welcome', label: 'Cover', hint: 'A title, a few words and a start button', isQuestion: false, defaults: { title: 'Let’s get to know you', description: 'A few quick questions to get started.', options: { buttonLabel: 'Start' } } },
  { type: 'short_text', label: 'Short answer', hint: 'One line of text', isQuestion: true, defaults: { title: 'What’s your name?', description: '', options: { maxLength: 120, placeholder: 'Your answer' } } },
  { type: 'long_text', label: 'Paragraph', hint: 'A few sentences', isQuestion: true, defaults: { title: 'Tell us more', description: '', options: { maxLength: 2000, placeholder: 'Your answer' } } },
  { type: 'email', label: 'Email', hint: 'An email address, checked for shape', isQuestion: true, defaults: { title: 'What’s your email?', description: '', options: { placeholder: 'you@domain.com' } } },
  { type: 'number', label: 'Number', hint: 'A number', isQuestion: true, defaults: { title: 'How many?', description: '', options: { placeholder: '0' } } },
  { type: 'date', label: 'Date', hint: 'A date from a picker', isQuestion: true, defaults: { title: 'Which date?', description: '', options: {} } },
  { type: 'multiple_choice', label: 'Multiple choice', hint: 'Pick one of several options', isQuestion: true, defaults: { title: 'Pick one', description: '', options: { choices: ['Option A', 'Option B', 'Option C'] } } },
  { type: 'checkboxes', label: 'Checkboxes', hint: 'Pick any number of options', isQuestion: true, defaults: { title: 'Pick all that apply', description: '', options: { choices: ['Option A', 'Option B', 'Option C'] } } },
  { type: 'dropdown', label: 'Dropdown', hint: 'Pick one from a long list', isQuestion: true, defaults: { title: 'Choose from the list', description: '', options: { choices: ['Option A', 'Option B', 'Option C'] } } },
  { type: 'yes_no', label: 'Yes / No', hint: 'Two buttons', isQuestion: true, defaults: { title: 'Is that right?', description: '', options: {} } },
  { type: 'end', label: 'Thank you', hint: 'The closing screen', isQuestion: false, defaults: { title: 'Thanks, that’s all', description: 'We’ve got your answers.', options: {} } },
];

export const kindOf = (type: BlockType) => blockKinds.find((k) => k.type === type)!;
export const isQuestion = (b: Pick<Block, 'type'>) => kindOf(b.type).isQuestion;

/** The blocks a new form starts with. */
export function starterBlocks(): Array<Pick<Block, 'type' | 'title' | 'description' | 'required' | 'options'>> {
  const w = kindOf('welcome').defaults, q = kindOf('short_text').defaults, e = kindOf('end').defaults;
  return [
    { type: 'welcome', title: w.title, description: w.description, required: false, options: w.options },
    { type: 'short_text', title: q.title, description: q.description, required: true, options: q.options },
    { type: 'end', title: e.title, description: e.description, required: false, options: e.options },
  ];
}

/** Returns a message when the answer does not pass, or null when it does. */
export function validateAnswer(block: Block, value: AnswerValue | undefined): string | null {
  const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) return block.required ? 'This one needs an answer.' : null;
  switch (block.type) {
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'That does not look like an email address.';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'Numbers only, please.';
    case 'short_text':
    case 'long_text': {
      const max = block.options.maxLength ?? 2000;
      return typeof value === 'string' && value.length <= max ? null : `Keep it under ${max} characters.`;
    }
    default:
      return null;
  }
}

/** One line of text for a table cell or a CSV field. */
export function formatAnswer(value: AnswerValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
