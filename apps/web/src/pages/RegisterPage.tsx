import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { GeometricCanvas } from '../components/3d/GeometricCanvas';
import { Layers, AlertCircle, ArrowRight } from 'lucide-react';
import { ApiError } from '../lib/api';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Failed to create account. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden">
      {/* Left Column / 3D Canvas Visual Feature */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950/40 border-r border-slate-800/80 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute inset-0 z-0">
          <GeometricCanvas className="w-full h-full" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-white">PMS Studio</h2>
            <p className="text-xs text-slate-400">Enterprise Project Management</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            Accelerate your team's <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">execution velocity</span>.
          </h1>
          <p className="mt-4 text-base text-slate-400">
            Get instant ownership isolation, flexible project planning, and fine-grained task tracking right out of the box.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-400">
          <span>Enterprise-Grade Security</span>
          <span>•</span>
          <span>High-Speed Queries</span>
          <span>•</span>
          <span>Responsive Workspaces</span>
        </div>
      </div>

      {/* Right Column / Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">PMS Studio</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create an account</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start orchestrating your projects and tasks in seconds.
            </p>
          </div>

          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              {...register('fullName')}
              error={errors.fullName?.message}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
              helperText="Must be at least 8 characters"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-indigo-600/30"
              isLoading={isSubmitting}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="text-center text-sm text-slate-400 pt-2">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
