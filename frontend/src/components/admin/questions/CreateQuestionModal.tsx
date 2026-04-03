import { useState, type ChangeEvent } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Question, QuestionType } from '../../../types/question';
import { questionsService } from '../../../services/questionsService';
import QuestionTypePicker from './QuestionTypePicker';
import QuestionFormBody from './QuestionFormBody';
import { INITIAL_FORM, buildPayload, type FormState } from './questionFormUtils';

interface Props {
  onClose: () => void;
  onCreate: (q: Question) => void;
}

export default function CreateQuestionModal({ onClose, onCreate }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
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
    if (!selectedType) return;
    setSubmitting(true);
    setError(null);
    try {
      const q = await questionsService.createQuestion(buildPayload(selectedType, form));
      onCreate(q);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-4 pt-20 pb-10 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0D0D12] border border-white/[0.08] rounded-2xl max-w-xl w-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25 mb-0.5">
                Step {step} of 2
              </p>
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-white/90">
                New question
              </h2>
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
            {step === 1 ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30 mb-4">
                  Select question type
                </p>
                <QuestionTypePicker selected={selectedType} onSelect={setSelectedType} />
              </>
            ) : (
              <QuestionFormBody type={selectedType!} form={form} set={set} setOption={setOption} />
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

            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/[0.15] transition-colors px-3 py-2 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              {step === 1 ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedType}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-[13px] font-semibold text-white transition-colors"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
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
                      'Creating…'
                    ) : (
                      <>
                        Create question
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
