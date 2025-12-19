
import { User } from '../types';

const STORAGE_KEY = 'dubber_ai_user';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const existingData = localStorage.getItem(STORAGE_KEY);
    if (existingData) {
        const storedUser = JSON.parse(existingData);
        if (storedUser.email === email) return storedUser;
    }

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
         credits: 1000
     };
     localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
     return user;
  },

  deductCredits: async (amount: number): Promise<boolean> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return false;
    const user: User = JSON.parse(data);
    if (user.credits < amount) return false;
    user.credits -= amount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Trigger a storage event to notify App component
    window.dispatchEvent(new Event('storage'));
    return true;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
};
