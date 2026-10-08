import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { GeometricCanvas } from '../components/3d/GeometricCanvas';
import { Layers, AlertCircle, ArrowRight } from 'lucide-react';
import { ApiError } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    clearSessionExpired();
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Failed to sign in. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden">
      {/* Left Column / 3D Canvas Visual Feature */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950/40 border-r border-slate-800/80 flex-col justify-between p-12 overflow-hidden">
        {/* Subtle Ambient Gradient Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <GeometricCanvas className="w-full h-full" />
        </div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-white">PMS Studio</h2>
            <p className="text-xs text-slate-400">Enterprise Project Management</p>
          </div>
        </div>

        {/* Middle Feature Tagline */}
        <div className="relative z-10 max-w-md my-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            Structure your projects with <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">clarity & precision</span>.
          </h1>
          <p className="mt-4 text-base text-slate-400">
            High performance workflow tracking, real-time analytics, and strictly isolated workspaces designed for modern engineering teams.
          </p>
        </div>

        {/* Bottom Feature List */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-400">
          <span>Enterprise-Grade Security</span>
          <span>•</span>
          <span>High-Speed Queries</span>
          <span>•</span>
          <span>Responsive Workspaces</span>
        </div>
      </div>

      {/* Right Column / Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">PMS Studio</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to manage your active sprints, projects, and deliverables.
            </p>
          </div>

          {/* Session Expired Notice */}
          {sessionExpired && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {/* Server Error Notice */}
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              error={errors.password?.message}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-indigo-600/30"
              isLoading={isSubmitting}
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="text-center text-sm text-slate-400 pt-2">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
