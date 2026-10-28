import { useState } from 'react';
import { User, Mail, ShieldCheck, Phone, KeyRound, Building, Check, Database } from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { translateAuthError } from '../../services/supabaseClient';
import { PageHeader, Spinner } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';

export default function PortalProfilePage() {
  const { user, profile, updateProfile, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      await logAudit('update_self_profile', 'profiles', { full_name: fullName });
      toast.success('Perfil actualizado', 'Tus datos se guardaron correctamente en PostgreSQL.');
    } catch (err) {
      toast.error('Error al actualizar', translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-slide-up" data-testid="portal-profile-page">
      <PageHeader
        icon={User}
        eyebrow="Portal Cloud Supabase"
        title="Mi Perfil y Credenciales"
        description="Administra la información de tu cuenta, contacto y rol asignado en la plataforma."
      />

      <div className="card p-6 shadow-soft space-y-6">
        <div className="flex items-center gap-4 border-b border-moss-200 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-800 text-2xl font-bold text-white shadow-soft">
            {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-moss-900">{profile?.full_name || 'Usuario'}</h3>
            <p className="font-mono text-xs text-moss-600">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="badge badge-green text-xs">{profile?.role || 'QA Lead'}</span>
              <span className="badge badge-blue text-xs">{profile?.department || 'QA'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Nombre Completo" id="profile-name" required>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full"
            />
          </Field>

          <Field label="Correo Electrónico (No modificable)" id="profile-email">
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="input w-full bg-moss-50 text-moss-500 cursor-not-allowed"
            />
          </Field>

          <Field label="Teléfono de Contacto" id="profile-phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5587654321"
              className="input w-full font-mono"
            />
          </Field>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
