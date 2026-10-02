import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useCreateFeedback, useMyFeedback } from '../hooks/useFeedback.js';
import {
  FEEDBACK_TYPE_LABELS,
  defaultFeedbackFormValues,
  feedbackFormSchema,
} from '../schemas/feedbackSchemas.js';
import { feedbackStatusLabel, feedbackStatusTone } from '../utils/admin.js';
import { formatDate } from '../utils/format.js';

const PAGE_SIZE = 10;

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

function FeedbackForm({ onSubmitted }) {
  const createFeedback = useCreateFeedback();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(feedbackFormSchema), defaultValues: defaultFeedbackFormValues });

  async function onSubmit(values) {
    try {
      await createFeedback.mutateAsync(values);
      toast.success('Thanks! Your submission has been received.');
      reset(defaultFeedbackFormValues);
      onSubmitted?.();
    } catch (error) {
      if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) setError(field, { message });
      } else {
        toast.error(error.message ?? 'Could not submit feedback');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="feedback-type" className="text-sm font-medium text-slate-700">
          Type
        </label>
        <select id="feedback-type" className={inputClass} {...register('type')}>
          {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.type && <p className="text-sm text-red-600">{errors.type.message}</p>}
      </div>
      <Input label="Subject" error={errors.subject?.message} {...register('subject')} />
      <div className="flex flex-col gap-1">
        <label htmlFor="feedback-message" className="text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea id="feedback-message" rows={4} className={inputClass} {...register('message')} />
        {errors.message && <p className="text-sm text-red-600">{errors.message.message}</p>}
      </div>
      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Submit
        </Button>
      </div>
    </form>
  );
}

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyFeedback({ page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Feedback &amp; complaints</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us what works, what doesn&apos;t, or report a problem. Only you and the platform admins can see your
          submissions.
        </p>
      </div>

      <Card title="Send feedback">
        <FeedbackForm onSubmitted={() => setPage(1)} />
      </Card>

      <Card title="Your submissions">
        {isLoading && <Spinner label="Loading your submissions..." />}
        {isError && <p className="text-sm text-red-600">Could not load your submissions. Please try again.</p>}
        {!isLoading && !isError && data.data.length === 0 && (
          <EmptyState title="No submissions yet" description="Your feedback and complaints will appear here." />
        )}
        {!isLoading && !isError && data.data.length > 0 && (
          <>
            <ul className="flex flex-col gap-3">
              {data.data.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.subject}</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${feedbackStatusTone(item.status)}`}
                    >
                      {feedbackStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {FEEDBACK_TYPE_LABELS[item.type] ?? item.type} · {formatDate(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
