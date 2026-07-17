import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/shared/api/apiClient';
import { dashboardPathForRole } from '@/shared/constants/roles';
import { useRegisterMutation } from '../api/auth.mutations';
import { registerSchema, type RegisterFormValues } from '../schemas';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      contactNo: '',
      address: '',
    },
  });

  function onSubmit(values: RegisterFormValues) {
    registerMutation.mutate(
      {
        ...values,
        contactNo: values.contactNo || undefined,
        address: values.address || undefined,
      },
      {
        onSuccess: (data) => {
          navigate(dashboardPathForRole(data.user.role), { replace: true });
        },
      },
    );
  }

  const apiError = registerMutation.error as ApiError | null;

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Create your account</CardTitle>
        <CardDescription>Start running your agency's projects on CodeHaus.</CardDescription>
      </CardHeader>
      <CardContent>
        {apiError && (
          <Alert
            variant="danger"
            title="Couldn't create your account"
            description={apiError.message}
            className="mb-4"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Middle name"
              autoComplete="additional-name"
              error={errors.middleName?.message}
              {...register('middleName')}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

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
            autoComplete="new-password"
            helperText={
              errors.password ? undefined : '8+ characters, with upper, lower case and a digit'
            }
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contact number (optional)"
              autoComplete="tel"
              error={errors.contactNo?.message}
              {...register('contactNo')}
            />
            <Input
              label="Address (optional)"
              autoComplete="street-address"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </>
  );
}

export default RegisterPage;
