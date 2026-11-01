import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Spinner } from '@heroui/react';
import { PoweredByYare, YareMark } from '../yare';
import type { AnswerValue, Block, Client, Form } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { getPublicForm, saveAnswer, startResponse } from '../lib/forms-api';
import { validateAnswer } from '../lib/blocks';
import { themeById, themeStyle } from '../lib/themes';
import { ScreenView } from './ScreenView';
import './public-form.css';

/**
 * The form as a visitor sees it: one screen at a time, a progress bar, Enter to continue, and
 * the Yare Monster credit at the bottom. `?preview` lets the owner walk through a draft without recording
 * a response.
 */
export function PublicForm({ db }: { db: Client }) {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.has('preview');
  const [data, setData] = useState<{ form: Form; blocks: Block[] } | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    getPublicForm(db, slug).then(setData).catch(() => setData(null));
  }, [db, slug]);

  const theme = useMemo(() => themeById(data?.form.theme ?? 'paper'), [data]);
  const dark = ['ink', 'ocean', 'coral', 'forest', 'lavender'].includes(theme.id);

  useEffect(() => { document.title = data?.form.title ? `${data.form.title}` : 'Form'; }, [data]);

  if (data === undefined) {
    return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;
  }
  if (data === null || (data.form.status !== 'published' && !preview)) {
    return (
      <div className="yf" style={themeStyle(themeById('paper')) as React.CSSProperties}>
        <main className="yf__main">
          <div className="yf__screen yf__closed items-center">
            <YareMark size={64} />
            <h1 className="yf__title">This form isn’t open</h1>
            <p className="yf__desc">It may have been unpublished or the address may be wrong.</p>
          </div>
        </main>
        <PoweredByYare />
      </div>
    );
  }

  const { form, blocks } = data;
  const block = blocks[index];
  const finished = index >= blocks.length;
  const questions = blocks.filter((b) => b.type !== 'welcome' && b.type !== 'end');
  const answered = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const showProgress = form.settings.showProgress !== false;
  const logo = imageUrl(db, form.logo_path);

  async function ensureResponse() {
    if (preview || response) return response;
    const r = await startResponse(db, form.slug);
    setResponse(r);
    return r;
  }

  async function next() {
    if (!block) return;
    const value = answers[block.id];
    const problem = block.type === 'welcome' || block.type === 'end' ? null : validateAnswer(block, value);
    if (problem) { setError(problem); return; }
    setError(null);
    const nextIndex = index + 1;
    // The response is complete once the respondent moves past their last question.
    const completes = blocks.slice(nextIndex).every((b) => b.type === 'end' || b.type === 'welcome');
    try {
      const r = await ensureResponse();
      if (r && block.type !== 'welcome' && block.type !== 'end') {
        await saveAnswer(db, r, block.id, value ?? null, completes);
      } else if (r && completes) {
        await saveAnswer(db, r, null, null, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answer. Please try again.');
      return;
    }
    setIndex(nextIndex);
  }

  function back() {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="yf" data-dark={dark || undefined} style={themeStyle(theme) as React.CSSProperties}>
      {showProgress && questions.length > 0 && (
        <div className="yf__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
          <div className="yf__progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {preview && <div className="yf__preview" role="status">Preview. Answers are not saved. {form.status !== 'published' && 'Publish the form to share it.'}</div>}
      {logo && <div className="yf__logo"><img src={logo} alt="" /></div>}
      <main className="yf__main">
        {finished && (
          <div className="yf__screen">
            <h1 className="yf__title">Thanks, that’s all</h1>
            <p className="yf__desc">We’ve got your answers.</p>
          </div>
        )}
        {block && (
          <ScreenView
            key={block.id}
            block={block}
            value={answers[block.id]}
            onChange={(v) => { setError(null); setAnswers((a) => ({ ...a, [block.id]: v })); }}
            onNext={() => void next()}
            onBack={index > 0 && block.type !== 'end' ? back : undefined}
            error={error}
            imageUrl={imageUrl(db, block.options.imagePath)}
            imageSide={block.options.imageSide}
            isLast={blocks.slice(index + 1).every((b) => b.type === 'end' || b.type === 'welcome')}
          />
        )}
      </main>
      {/* The credit: in the lower corner of a full picture, on the far side of the words; else at the foot of the page. */}
      <PoweredByYare className={block?.options.imageSide === 'full-left' ? 'yf__credit--left' : block?.options.imageSide === 'full-right' ? 'yf__credit--right' : undefined} />
    </div>
  );
}
