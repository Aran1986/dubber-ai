import React, { useState } from 'react';
import { AuthService } from './services/auth';
import { User } from './types';
import { EnvelopeIcon, LockClosedIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface Props {
  onSignupSuccess: (user: User) => void;
  onNavigateLogin: () => void;
}

export default function SignupPage({ onSignupSuccess, onNavigateLogin }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await AuthService.signup(name, email, password);
      onSignupSuccess(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-slate-400">Start dubbing your videos with AI</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 bg-dark-bg border border-dark-border rounded-lg py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                placeholder="John Doe"
              />
            </div>
          </div>

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
                placeholder="Create a strong password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all ${
              loading ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {loading ? 'Creating Account...' : 'Get Started'} <ArrowRightOnRectangleIcon className="ml-2 w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <button onClick={onNavigateLogin} className="font-medium text-brand-400 hover:text-brand-300">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}