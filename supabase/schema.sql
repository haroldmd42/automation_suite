-- ==============================================================================
-- SCHEMA INICIAL PARA AUTOMATION SUITE EN SUPABASE
-- Ejecuta este script en el "SQL Editor" de tu panel de Supabase.
-- ==============================================================================

-- 1. Crear tabla de perfiles extendidos vinculada a auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT,
  role TEXT NOT NULL DEFAULT 'qa_lead', -- 'admin', 'qa_lead', 'developer', 'auditor', 'support'
  department TEXT NOT NULL DEFAULT 'qa',
  avatar_url TEXT,
  phone TEXT,
  hire_date TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB DEFAULT '["perm_automation"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["perm_automation"]'::jsonb;

-- 2. Habilitar Row Level Security (RLS) en la tabla profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad (RLS):
-- Limpiar políticas anteriores para evitar recursión
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar perfiles" ON public.profiles;

-- Permitir que cualquier usuario autenticado pueda consultar el directorio de perfiles
CREATE POLICY "Usuarios autenticados pueden ver perfiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados insertar su perfil o registrar nuevos
CREATE POLICY "Usuarios autenticados pueden crear perfiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar perfiles
CREATE POLICY "Usuarios autenticados pueden actualizar perfiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a usuarios autenticados eliminar perfiles
CREATE POLICY "Usuarios autenticados pueden eliminar perfiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (true);

-- 4. Función y Trigger automático para crear perfil cuando alguien se registre en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role, department, phone, hire_date, status, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'qa_lead'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'qa'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'hire_date', to_char(now(), 'YYYY-MM-DD')),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active'),
    COALESCE(NEW.raw_user_meta_data->'permissions', '["perm_automation"]'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    hire_date = EXCLUDED.hire_date,
    status = EXCLUDED.status,
    permissions = EXCLUDED.permissions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se dispara tras INSERT en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger que sincroniza el correo si se actualiza en auth.users
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = NEW.email,
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();

-- 5. Tabla de Auditoría / Logs de Actividad (Nuevo módulo útil para QA)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden registrar logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden leer logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 6. TABLAS PARA LOS MÓDULOS DE CADA ROL
-- ==============================================================================

-- 6.1 Módulo QA Lead: Suites y Planes de Prueba
CREATE TABLE IF NOT EXISTS public.qa_test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'regression',
  environment TEXT NOT NULL DEFAULT 'staging',
  priority TEXT NOT NULL DEFAULT 'high',
  coverage_target INT DEFAULT 90,
  cases_count INT DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'pending', -- 'passed', 'failed', 'in_progress', 'pending'
  assigned_to TEXT,
  test_date TEXT,
  tags JSONB DEFAULT '["#qa"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.qa_test_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "QA Suites acceso autenticado" ON public.qa_test_suites FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.2 Módulo Developer: Releases y Feature Flags
CREATE TABLE IF NOT EXISTS public.dev_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  commit_hash TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'rolling', -- 'canary', 'blue_green', 'rolling'
  status TEXT NOT NULL DEFAULT 'deployed', -- 'development', 'staging', 'deployed', 'rollback'
  changelog TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.dev_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dev Releases acceso autenticado" ON public.dev_releases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INT DEFAULT 100,
  environments JSONB DEFAULT '["staging", "production"]'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feature Flags acceso autenticado" ON public.feature_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.3 Módulo DevOps: Pipelines de CI/CD
CREATE TABLE IF NOT EXISTS public.devops_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  environment TEXT NOT NULL DEFAULT 'staging',
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'running', 'failed', 'queued'
  duration_seconds INT DEFAULT 180,
  triggered_by TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.devops_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DevOps Pipelines acceso autenticado" ON public.devops_pipelines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.4 Módulo Soporte L2: Tickets e Incidentes
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'account_access',
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'escalated'
  sla_hours INT DEFAULT 24,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support Tickets acceso autenticado" ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

