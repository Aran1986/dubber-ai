import { User } from '../types';

const STORAGE_KEY = 'dubber_ai_user';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === 'demo@dubber.ai' && password === 'demo') {
        const user: User = {
            email,
            name: 'Demo User',
            plan: 'pro',
            credits: 5000
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
    }
    
    // For MVP, accept any other login as a new "Free" user
    const user: User = {
        email,
        name: email.split('@')[0],
        plan: 'free',
        credits: 100
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  signup: async (name: string, email: string, password: string): Promise<User> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     const user: User = {
         email,
         name,
         plan: 'starter',
         credits: 1000 // Bonus for signup
     };
     localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
     return user;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
};