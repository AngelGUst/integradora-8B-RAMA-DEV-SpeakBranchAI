import type { ChangeEvent, ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { QuestionType, Level } from '../../../types/question';
import { INPUT, LABEL, SELECT, XP_MAP, type FormState } from './questionFormUtils';

type ChangeHandler = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

interface Props {
  type: QuestionType;
  form: FormState;
  set: (key: keyof FormState) => ChangeHandler;
  setOption: (idx: number) => (e: ChangeEvent<HTMLInputElement>) => void;
}

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function QuestionFormBody({ type, form, set, setOption }: Props) {
  return (
    <div className="space-y-4">
      {/* ── Shared fields ── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Level</label>
          <select value={form.level} onChange={set('level')} className={SELECT} style={{ colorScheme: 'dark' }}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Difficulty</label>
          <select value={form.difficulty} onChange={set('difficulty')} className={SELECT} style={{ colorScheme: 'dark' }}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={form.category} onChange={set('category')} className={SELECT} style={{ colorScheme: 'dark' }}>
            <option value="BASIC">Basic</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="TOEFL">TOEFL</option>
          </select>
        </div>
      </div>

      {/* XP preview */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/[0.05] border border-violet-500/[0.1]">
        <Info className="h-4 w-4 text-violet-400/60 shrink-0" />
        <span className="text-[12px] text-violet-300/60">
          This question awards up to{' '}
          <span className="font-bold text-violet-300/80">{XP_MAP[form.difficulty]} XP</span>
        </span>
      </div>

      {/* ── Type-specific fields ── */}
      {type === 'SPEAKING' && (
        <div className="space-y-4">
          <Field label="Question text" required>
            <textarea value={form.text} onChange={set('text')} rows={3}
              placeholder="Text the student will read aloud"
              className={`${INPUT} resize-none`} />
          </Field>
          <Field label="Correct answer" required>
            <input type="text" value={form.correct_answer} onChange={set('correct_answer')}
              placeholder="Expected transcription" className={INPUT} />
          </Field>
          <Field label="Phonetic text">
            <input type="text" value={form.phonetic_text} onChange={set('phonetic_text')}
              placeholder="IPA e.g. /ðə ˈwɛðər/" className={INPUT} />
          </Field>
          <Field label="Audio URL">
            <input type="text" value={form.audio_url} onChange={set('audio_url')}
              placeholder="Optional reference audio" className={INPUT} />
          </Field>
        </div>
      )}

      {type === 'READING' && (
        <div className="space-y-4">
          <Field label="Question text" required>
            <textarea value={form.text} onChange={set('text')} rows={3}
              placeholder="Passage or question"
              className={`${INPUT} resize-none`} />
          </Field>
          <OptionsField form={form} setOption={setOption} />
          <Field label="Correct option" required>
            <select value={form.correct_option} onChange={set('correct_option')} className={SELECT} style={{ colorScheme: 'dark' }}>
              {OPTION_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
      )}

      {type === 'LISTENING_SHADOWING' && (
        <div className="space-y-4">
          <InfoBadge text="Replays: unlimited" />
          <Field label="Audio URL" required>
            <input type="text" value={form.audio_url} onChange={set('audio_url')}
              placeholder="Short audio 5–10 seconds" className={INPUT} />
          </Field>
          <Field label="Correct answer" required>
            <input type="text" value={form.correct_answer} onChange={set('correct_answer')}
              placeholder="Transcript of the audio" className={INPUT} />
          </Field>
          <Field label="Phonetic text">
            <input type="text" value={form.phonetic_text} onChange={set('phonetic_text')}
              placeholder="IPA transcription" className={INPUT} />
          </Field>
          <Field label="Question text">
            <input type="text" value={form.text} onChange={set('text')}
              placeholder="Shown AFTER attempt only" className={INPUT} />
          </Field>
        </div>
      )}

      {type === 'LISTENING_COMPREHENSION' && (
        <div className="space-y-4">
          <InfoBadge text="Max replays: 3" />
          <Field label="Audio URL" required>
            <input type="text" value={form.audio_url} onChange={set('audio_url')}
              placeholder="Longer audio 30–60 seconds" className={INPUT} />
          </Field>
          <Field label="Question text" required>
            <textarea value={form.text} onChange={set('text')} rows={2}
              placeholder="Question about the audio"
              className={`${INPUT} resize-none`} />
          </Field>
          <OptionsField form={form} setOption={setOption} />
          <Field label="Correct option" required>
            <select value={form.correct_option} onChange={set('correct_option')} className={SELECT} style={{ colorScheme: 'dark' }}>
              {OPTION_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
      )}

      {type === 'WRITING' && (
        <div className="space-y-4">
          <InfoBadge text="No correct answer needed — AI grades this" />
          <Field label="Question prompt" required>
            <textarea value={form.text} onChange={set('text')} rows={3}
              placeholder="Instruction shown to student"
              className={`${INPUT} resize-none`} />
          </Field>
          <Field label="Evaluation instructions" required>
            <textarea
              value={form.evaluation_instructions}
              onChange={set('evaluation_instructions')}
              rows={4}
              placeholder="Evaluate if the student described a daily routine using present simple and at least 3 time expressions."
              className={`${INPUT} resize-none`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-violet-400/50 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function OptionsField({
  form,
  setOption,
}: {
  form: FormState;
  setOption: (idx: number) => (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className={LABEL}>
        Options <span className="text-violet-400/50">*</span>
      </label>
      <div className="space-y-2">
        {OPTION_LETTERS.map((letter, idx) => (
          <div key={letter} className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-white/30 w-4 shrink-0">{letter}</span>
            <input
              type="text"
              value={form.options[idx]}
              onChange={setOption(idx)}
              placeholder={`Option ${letter}`}
              className={INPUT}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBadge({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <Info className="h-4 w-4 text-white/30 shrink-0" />
      <span className="text-[12px] text-white/40">{text}</span>
    </div>
  );
}
