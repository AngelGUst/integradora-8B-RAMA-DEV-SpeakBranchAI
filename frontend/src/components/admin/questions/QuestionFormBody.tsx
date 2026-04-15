import type { ChangeEvent, ReactNode } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import type { QuestionType, Level } from '../../../types/question';
import { INPUT, LABEL, SELECT, XP_MAP, type FormState, type ReadingQuestion } from './questionFormUtils';

type ChangeHandler = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

interface Props {
  type: QuestionType;
  form: FormState;
  set: (key: keyof FormState) => ChangeHandler;
  setOption: (idx: number) => (e: ChangeEvent<HTMLInputElement>) => void;
  onReadingQuestionsChange: (qs: ReadingQuestion[]) => void;
}

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function QuestionFormBody({ type, form, set, setOption, onReadingQuestionsChange }: Props) {
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
            <option value="DIAGNOSTIC">Examen diagnóstico</option>
            <option value="PRACTICE">Solo ejercicio</option>
            <option value="LEVEL_UP">Examen subir nivel</option>
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
        <div className="space-y-5">
          <Field label="Texto del pasaje" required>
            <textarea value={form.text} onChange={set('text')} rows={5}
              placeholder="Escribe el texto que el estudiante leerá..."
              className={`${INPUT} resize-none`} />
          </Field>

          {/* Dynamic questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={LABEL}>
                Preguntas <span className="text-violet-400/50">*</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  onReadingQuestionsChange([
                    ...form.reading_questions,
                    { text: '', options: ['', '', '', ''], correct_option: 'A' },
                  ])
                }
                className="flex items-center gap-1 text-[11px] font-semibold text-violet-400/70 hover:text-violet-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Agregar pregunta
              </button>
            </div>

            <div className="space-y-4">
              {form.reading_questions.map((rq, qi) => (
                <ReadingQuestionBlock
                  key={qi}
                  index={qi}
                  rq={rq}
                  canRemove={form.reading_questions.length > 1}
                  onChange={(updated) => {
                    const next = [...form.reading_questions];
                    next[qi] = updated;
                    onReadingQuestionsChange(next);
                  }}
                  onRemove={() =>
                    onReadingQuestionsChange(form.reading_questions.filter((_, i) => i !== qi))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {type === 'LISTENING_SHADOWING' && (
        <div className="space-y-4">
          <InfoBadge text="El navegador leerá el texto en voz alta (TTS). El alumno lo repite." />
          <Field label="Texto para escuchar (TTS)" required>
            <textarea value={form.correct_answer} onChange={set('correct_answer')} rows={3}
              placeholder="Ej: Every morning I wake up at seven and go for a run."
              className={`${INPUT} resize-none`} />
          </Field>
          <Field label="Transcripción fonética">
            <input type="text" value={form.phonetic_text} onChange={set('phonetic_text')}
              placeholder="IPA opcional, ej: /ˈɛvri ˈmɔːrnɪŋ/" className={INPUT} />
          </Field>
          <Field label="Texto mostrado después del intento">
            <input type="text" value={form.text} onChange={set('text')}
              placeholder="Pista o traducción (opcional)" className={INPUT} />
          </Field>
        </div>
      )}

      {type === 'LISTENING_COMPREHENSION' && (
        <div className="space-y-5">
          <InfoBadge text="El navegador leerá el pasaje en voz alta (TTS). Máx. 3 reproducciones." />
          <Field label="Pasaje de audio (TTS)" required>
            <textarea value={form.phonetic_text} onChange={set('phonetic_text')} rows={4}
              placeholder="Ej: Welcome to our city. There are many museums and parks to visit..."
              className={`${INPUT} resize-none`} />
          </Field>
          <Field label="Título / descripción" required>
            <input type="text" value={form.text} onChange={set('text')}
              placeholder="Ej: Listening sobre vida en la ciudad"
              className={INPUT} />
          </Field>

          {/* Dynamic questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={LABEL}>
                Preguntas <span className="text-violet-400/50">*</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  onReadingQuestionsChange([
                    ...form.reading_questions,
                    { text: '', options: ['', '', '', ''], correct_option: 'A' },
                  ])
                }
                className="flex items-center gap-1 text-[11px] font-semibold text-violet-400/70 hover:text-violet-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Agregar pregunta
              </button>
            </div>

            <div className="space-y-4">
              {form.reading_questions.map((rq, qi) => (
                <ReadingQuestionBlock
                  key={qi}
                  index={qi}
                  rq={rq}
                  canRemove={form.reading_questions.length > 1}
                  onChange={(updated) => {
                    const next = [...form.reading_questions];
                    next[qi] = updated;
                    onReadingQuestionsChange(next);
                  }}
                  onRemove={() =>
                    onReadingQuestionsChange(form.reading_questions.filter((_, i) => i !== qi))
                  }
                />
              ))}
            </div>
          </div>
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

function ReadingQuestionBlock({
  index,
  rq,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  rq: ReadingQuestion;
  canRemove: boolean;
  onChange: (updated: ReadingQuestion) => void;
  onRemove: () => void;
}) {
  const setField = (field: 'text' | 'correct_option', value: string) =>
    onChange({ ...rq, [field]: value });

  const setOpt = (idx: number, value: string) => {
    const opts = [...rq.options] as [string, string, string, string];
    opts[idx] = value;
    onChange({ ...rq, options: opts });
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.01] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">
          Pregunta {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg text-white/20 hover:text-red-400/70 hover:bg-red-500/[0.06] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <input
        type="text"
        value={rq.text}
        onChange={(e) => setField('text', e.target.value)}
        placeholder="¿Cuál es la idea principal del texto?"
        className={INPUT}
      />

      <div className="space-y-2">
        {OPTION_LETTERS.map((letter, idx) => (
          <div key={letter} className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-white/30 w-4 shrink-0">{letter}</span>
            <input
              type="text"
              value={rq.options[idx]}
              onChange={(e) => setOpt(idx, e.target.value)}
              placeholder={`Opción ${letter}`}
              className={INPUT}
            />
          </div>
        ))}
      </div>

      <div>
        <label className={LABEL}>Opción correcta</label>
        <select
          value={rq.correct_option}
          onChange={(e) => setField('correct_option', e.target.value)}
          className={SELECT}
          style={{ colorScheme: 'dark' }}
        >
          {OPTION_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
    </div>
  );
}
