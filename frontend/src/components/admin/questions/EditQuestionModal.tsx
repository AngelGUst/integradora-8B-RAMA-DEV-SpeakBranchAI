import { useState, type ChangeEvent } from 'react';
import { X, Check, Mic, BookOpen, Headphones, PenLine, type LucideIcon } from 'lucide-react';
import type { Question, QuestionType } from '../../../types/question';
import { questionsService } from '../../../services/questionsService';
import QuestionFormBody from './QuestionFormBody';
import { buildPayload, initFormFromQuestion, type FormState } from './questionFormUtils';

const TYPE_META: Record<QuestionType, { label: string; Icon: LucideIcon }> = {
  SPEAKING:                { label: 'Speaking',      Icon: Mic },
  READING:                 { label: 'Reading',       Icon: BookOpen },
  LISTENING_SHADOWING:     { label: 'Shadowing',     Icon: Headphones },
  LISTENING_COMPREHENSION: { label: 'Comprehension', Icon: Headphones },
  WRITING:                 { label: 'Writing',       Icon: PenLine },
};

interface Props {
  question: Question;
  onClose: () => void;
  onUpdate: (q: Question) => void;
}

export default function EditQuestionModal({ question, onClose, onUpdate }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initFormFromQuestion(question.type, question)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setOption = (idx: number) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => {
      const opts = [...prev.options] as [string, string, string, string];
      opts[idx] = e.target.value;
      return { ...prev, options: opts };
    });

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
        <div className="bg-[#0D0D12] border border-white/[0.08] rounded-2xl max-w-xl w-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-white/90">
                Edit question
              </h2>
              {/* Read-only type badge */}
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

          {/* Body */}
          <div className="px-6 py-5">
            <QuestionFormBody
              type={question.type}
              form={form}
              set={set}
              setOption={setOption}
              onReadingQuestionsChange={(qs) => setForm((prev) => ({ ...prev, reading_questions: qs }))}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05]">
            <button
              onClick={onClose}
              className="text-[13px] text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-xl"
            >
              Cancel
            </button>

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
          </div>

        </div>
      </div>
    </div>
  );
}
