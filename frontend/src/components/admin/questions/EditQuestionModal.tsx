import { useState, type ChangeEvent } from 'react';
import { X, Check, Mic, BookOpen, Headphones, PenLine, BookMarked, type LucideIcon } from 'lucide-react';
import type { Question, QuestionType } from '../../../types/question';
import { questionsService } from '../../../services/questionsService';
import QuestionFormBody from './QuestionFormBody';
import VocabularyPanel from './VocabularyPanel';
import { buildPayload, initFormFromQuestion, type FormState } from './questionFormUtils';

const TYPE_META: Record<QuestionType, { label: string; Icon: LucideIcon }> = {
  SPEAKING:                { label: 'Speaking',      Icon: Mic },
  READING:                 { label: 'Reading',       Icon: BookOpen },
  LISTENING_SHADOWING:     { label: 'Shadowing',     Icon: Headphones },
  LISTENING_COMPREHENSION: { label: 'Comprehension', Icon: Headphones },
  WRITING:                 { label: 'Writing',       Icon: PenLine },
};

type Tab = 'question' | 'vocabulary';

interface Props {
  question: Question;
  onClose: () => void;
  onUpdate: (q: Question) => void;
}

export default function EditQuestionModal({ question, onClose, onUpdate }: Readonly<Props>) {
  const [tab, setTab]   = useState<Tab>('question');
  const [form, setForm] = useState<FormState>(() =>
    initFormFromQuestion(question.type, question)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setValue = (key: keyof FormState, value: FormState[keyof FormState]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await questionsService.updateQuestion(
        question.id,
        buildPayload(question.type, form)
      );
      onUpdate(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSubmitting(false);
    }
  };

  const { label, Icon } = TYPE_META[question.type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-4 pt-20 pb-10 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0D0D12] border border-white/[0.08] rounded-2xl max-w-3/5 w-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-white/90">
                Edit question
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Icon className="h-3.5 w-3.5 text-violet-400/60" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  {label}
                </span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.05]">
            {([
              { key: 'question',   label: 'Pregunta',    Icon: BookOpen   },
              { key: 'vocabulary', label: 'Vocabulario', Icon: BookMarked },
            ] as { key: Tab; label: string; Icon: LucideIcon }[]).map(({ key, label: tabLabel, Icon: TabIcon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-[12px] font-semibold transition-colors border-b-2 -mb-px ${
                  tab === key
                    ? 'text-violet-400 border-violet-500'
                    : 'text-white/30 border-transparent hover:text-white/50'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tabLabel}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {tab === 'question' ? (
              <QuestionFormBody
                type={question.type}
                form={form}
                set={set}
                setValue={setValue}
                onReadingQuestionsChange={(qs) => setForm((prev) => ({ ...prev, reading_questions: qs }))}
              />
            ) : (
              <VocabularyPanel
                questionId={question.id}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05]">
            <button
              onClick={onClose}
              className="text-[13px] text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-xl"
            >
              Cancel
            </button>

            {tab === 'question' && (
              <div className="flex flex-col items-end gap-1.5">
                {error && (
                  <p className="text-[11px] text-red-400/70 max-w-[240px] text-right">{error}</p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[13px] font-semibold text-white transition-colors"
                >
                  {submitting ? (
                    'Saving…'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            )}

            {tab === 'vocabulary' && (
              <p className="text-[11px] text-white/20">
                Los cambios de vocabulario se guardan automáticamente.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
