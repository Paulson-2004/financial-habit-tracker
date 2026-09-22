import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { registerFormSchema } from '../schemas/authSchemas.js';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await registerUser(values);
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { message });
        }
      } else {
        setServerError(error.message ?? 'Unable to register.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <h2 className="text-lg font-semibold text-slate-900">Create an account</h2>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
      <Input label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" isLoading={isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
