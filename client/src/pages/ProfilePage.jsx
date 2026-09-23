import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile, useUpdateProfile } from '../hooks/useProfile.js';
import { profileFormSchema } from '../schemas/profileSchemas.js';

function AccountDetails() {
  const { user } = useAuth();
  return (
    <Card title="Account">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">Name</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Email</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Role</dt>
          <dd className="text-sm font-medium capitalize text-slate-900">{user?.role}</dd>
        </div>
      </dl>
    </Card>
  );
}

function FinancialProfileForm({ profile }) {
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileFormSchema),
    values: {
      currency: profile.currency,
      occupation: profile.occupation ?? '',
      monthlyBudget: profile.monthlyBudget != null ? String(profile.monthlyBudget) : '',
      monthlySavingsTarget: profile.monthlySavingsTarget != null ? String(profile.monthlySavingsTarget) : '',
    },
  });

  async function onSubmit(values) {
    const payload = {
      currency: values.currency,
      occupation: values.occupation.trim() === '' ? null : values.occupation.trim(),
      monthlyBudget: values.monthlyBudget.trim() === '' ? null : Number(values.monthlyBudget),
      monthlySavingsTarget: values.monthlySavingsTarget.trim() === '' ? null : Number(values.monthlySavingsTarget),
    };
    try {
      await updateProfile.mutateAsync(payload);
      toast.success('Profile updated');
    } catch (error) {
      if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { message });
        }
      } else {
        toast.error(error.message ?? 'Could not update profile');
      }
    }
  }

  return (
    <Card title="Financial profile">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Currency"
            placeholder="e.g. INR, USD"
            maxLength={3}
            error={errors.currency?.message}
            {...register('currency')}
          />
          <Input label="Occupation" placeholder="e.g. Software Engineer" error={errors.occupation?.message} {...register('occupation')} />
          <Input
            label="Monthly budget (optional)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            error={errors.monthlyBudget?.message}
            {...register('monthlyBudget')}
          />
          <Input
            label="Monthly savings target (optional)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            error={errors.monthlySavingsTarget?.message}
            {...register('monthlySavingsTarget')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useProfile();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
      <AccountDetails />
      {isLoading && (
        <Card>
          <Spinner label="Loading your financial profile..." />
        </Card>
      )}
      {isError && (
        <Card>
          <p className="text-sm text-red-600">Could not load your financial profile. Please try again.</p>
        </Card>
      )}
      {!isLoading && !isError && <FinancialProfileForm profile={profile} />}
    </div>
  );
}
