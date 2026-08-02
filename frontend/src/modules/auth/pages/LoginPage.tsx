import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Mail } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import type { ApiError } from '@/shared/api/apiClient';
import { dashboardPathForRole } from '@/shared/constants/roles';
import { useLoginMutation } from '../api/auth.mutations';
import { loginSchema, type LoginFormValues } from '../schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: (data) => {
        navigate(dashboardPathForRole(data.user.role), { replace: true });
      },
    });
  }

  function onInvalid() {
    loginMutation.reset();
  }

  const apiError = loginMutation.error as ApiError | null;

  return (
    <>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Log in to CodeHaus</CardTitle>
        <CardDescription>Welcome back — enter your details to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        {apiError && (
          <Alert
            variant="danger"
            title="Couldn't log you in"
            description={apiError.message}
            className="mb-4"
          />
        )}

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="Email"
            type="email"
            inputSize="xl"
            tone="cool"
            placeholder="example@email.com"
            startIcon={<Mail />}
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            label="Password"
            inputSize="xl"
            tone="cool"
            placeholder="••••••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-11 w-full justify-between px-4 text-base"
            disabled={loginMutation.isPending}
          >
            {/* Balances the trailing arrow so the label stays optically centred. */}
            <span aria-hidden="true" className="size-4" />
            <span className="flex-1 text-center">
              {loginMutation.isPending ? 'Logging in...' : 'Log in'}
            </span>
            <ArrowRight aria-hidden="true" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary-text hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </>
  );
}

export default LoginPage;
