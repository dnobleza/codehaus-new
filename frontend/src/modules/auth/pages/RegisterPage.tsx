import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Mail, MapPin, Phone, User } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
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

  function onInvalid() {
    registerMutation.reset();
  }

  const apiError = registerMutation.error as ApiError | null;

  return (
    <>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
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

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="flex flex-col gap-4"
        >
          {/* Two columns, not three: the auth card is a single narrow column
              now, and three name fields side by side truncate their labels in
              it. Middle name — the least-used of the three — takes the full
              row on its own. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              inputSize="xl"
              tone="cool"
              startIcon={<User />}
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last name"
              inputSize="xl"
              tone="cool"
              startIcon={<User />}
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Middle name"
            inputSize="xl"
            tone="cool"
            startIcon={<User />}
            autoComplete="additional-name"
            error={errors.middleName?.message}
            {...register('middleName')}
          />

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
            autoComplete="new-password"
            helperText={
              errors.password ? undefined : '8+ characters, with upper, lower case and a digit'
            }
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              // Short enough to stay on one line beside "Address (optional)";
              // a wrapped label would push this field out of alignment.
              label="Phone (optional)"
              inputSize="xl"
              tone="cool"
              startIcon={<Phone />}
              autoComplete="tel"
              error={errors.contactNo?.message}
              {...register('contactNo')}
            />
            <Input
              label="Address (optional)"
              inputSize="xl"
              tone="cool"
              startIcon={<MapPin />}
              autoComplete="street-address"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-11 w-full justify-between px-4 text-base"
            disabled={registerMutation.isPending}
          >
            {/* Balances the trailing arrow so the label stays optically centred. */}
            <span aria-hidden="true" className="size-4" />
            <span className="flex-1 text-center">
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </span>
            <ArrowRight aria-hidden="true" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-text hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </>
  );
}

export default RegisterPage;
