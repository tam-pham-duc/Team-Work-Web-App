import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserWithRole, Role } from '../types/database';

interface AuthState {
  session: Session | null;
  authUser: AuthUser | null;
  user: UserWithRole | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    authUser: null,
    user: null,
    isLoading: true,
  });

  const fetchUserProfile = useCallback(async (authUser: AuthUser): Promise<UserWithRole | null> => {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!user) {
      const { data: memberRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'member')
        .maybeSingle();

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role_id: memberRole?.id || null,
        })
        .select('*, role:roles(*)')
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      return newUser as UserWithRole;
    }

    return user as UserWithRole;
  }, []);

  const createUserProfile = useCallback(async (authUser: AuthUser, fullName: string): Promise<UserWithRole | null> => {
    const { data: memberRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'member')
      .maybeSingle();

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email!,
        full_name: fullName,
        role_id: memberRole?.id || null,
      })
      .select('*, role:roles(*)')
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return user as UserWithRole;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.authUser) return;
    const user = await fetchUserProfile(state.authUser);
    setState(prev => ({ ...prev, user }));
  }, [state.authUser, fetchUserProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user).then(user => {
          setState({
            session,
            authUser: session.user,
            user,
            isLoading: false,
          });
        });
      } else {
        setState({
          session: null,
          authUser: null,
          user: null,
          isLoading: false,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({
          session: null,
          authUser: null,
          user: null,
          isLoading: false,
        });
      } else if (session?.user) {
        (async () => {
          const user = await fetchUserProfile(session.user);
          setState({
            session,
            authUser: session.user,
            user,
            isLoading: false,
          });
        })();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { error: new Error(error.message) };
    }

    if (data.user) {
      await createUserProfile(data.user, fullName);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
