import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  const apiError = loginMutation.error as ApiError | null;

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Log in to CodeHaus</CardTitle>
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </>
  );
}

export default LoginPage;
