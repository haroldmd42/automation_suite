import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, translateAuthError } from '../services/supabaseClient';

const SupabaseAuthContext = createContext(null);

export function SupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async (userId, userEmail) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('Error al obtener perfil:', profileErr.message);
        return null;
      }

      if (data) {
        setProfile(data);
        return data;
      }

      // Si no existe perfil todavía, se puede generar uno por defecto
      const fallback = {
        id: userId,
        email: userEmail || '',
        full_name: userEmail?.split('@')[0] || 'Usuario',
        role: 'qa_lead',
        department: 'qa',
      };
      setProfile(fallback);
      return fallback;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: sessionError }) => {
      if (!isMounted) return;
      if (sessionError) {
        setError(translateAuthError(sessionError.message));
      }
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user.email).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Suscribirse a cambios de estado de autenticación en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Por favor ingresa tus credenciales en el archivo .env');
    }
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      const translated = translateAuthError(signInError.message);
      setError(translated);
      const err = new Error(translated);
      err.originalMessage = signInError.message;
      throw err;
    }
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, role = 'qa_lead', department = 'qa' }) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Por favor ingresa tus credenciales en el archivo .env');
    }
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          department,
        },
      },
    });
    if (signUpError) {
      const translated = translateAuthError(signUpError.message);
      setError(translated);
      const err = new Error(translated);
      err.originalMessage = signUpError.message;
      throw err;
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.warn('Advertencia en supabase.auth.signOut:', signOutError.message);
        }
      }
    } catch (err) {
      console.warn('Error capturado durante signOut:', err);
    } finally {
      // Limpieza incondicional del estado de autenticación en la app
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    setError(null);
    const { data, error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (resetErr) {
      const translated = translateAuthError(resetErr.message);
      setError(translated);
      const err = new Error(translated);
      err.originalMessage = resetErr.message;
      throw err;
    }
    return data;
  }, []);

  const updateProfile = useCallback(
    async (updates) => {
      if (!isSupabaseConfigured || !supabase || !user) return;
      const { data, error: updateErr } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      setProfile(data);
      return data;
    },
    [user]
  );

  const logAudit = useCallback(
    async (action, entity, details = {}) => {
      if (!isSupabaseConfigured || !supabase || !user) return;
      try {
        await supabase.from('audit_logs').insert([
          {
            user_id: user.id,
            user_email: user.email,
            action,
            entity,
            details,
          },
        ]);
      } catch (err) {
        console.warn('Error registrando auditoría:', err);
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      session,
      user,
      profile,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      logAudit,
      refreshProfile: () => user && fetchProfile(user.id, user.email),
    }),
    [session, user, profile, loading, error, signIn, signUp, signOut, resetPassword, updateProfile, logAudit, fetchProfile]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth debe ser usado dentro de SupabaseAuthProvider');
  }
  return context;
}
