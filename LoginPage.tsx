import React, { useState } from 'react';
import { AuthService } from './services/auth';
import { User } from './types';
import { EnvelopeIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface Props {
  onLoginSuccess: (user: User) => void;
  onNavigateSignup: () => void;
}

export default function LoginPage({ onLoginSuccess, onNavigateSignup }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await AuthService.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400">Sign in to access your dubbing studio</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 bg-dark-bg border border-dark-border rounded-lg py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 bg-dark-bg border border-dark-border rounded-lg py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all ${
              loading ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRightOnRectangleIcon className="ml-2 w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <button onClick={onNavigateSignup} className="font-medium text-brand-400 hover:text-brand-300">
              Sign up for free
            </button>
          </p>
        </div>
        
        <div className="mt-8 pt-6 border-t border-dark-border text-center">
            <p className="text-xs text-slate-500">Hint: Use demo@dubber.ai / demo</p>
        </div>
      </div>
    </div>
  );
}