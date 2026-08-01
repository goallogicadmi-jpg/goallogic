import { useState, useEffect } from 'react';
import AvatarUpload from '../AvatarUpload';
import { saveProfilePhoto } from '../../services/uploadService';
import '../AvatarUpload.css';

export default function ProfilePhotoSettings({ user, onUpdated }) {
  const [photoUrl, setPhotoUrl] = useState(user?.foto_perfil_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPhotoUrl(user?.foto_perfil_url || '');
  }, [user?.foto_perfil_url]);

  const uploadFolder = user?.role === 'analista' ? 'analysts' : 'users';

  const handleSave = async () => {
    if (!photoUrl) {
      setError('Sube una imagen antes de guardar.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await saveProfilePhoto(photoUrl);
      setMessage(data.message || 'Foto actualizada');
      onUpdated?.(data.foto_perfil_url);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la foto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="micuenta-avatar-section admin-panel-card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Foto de perfil</h3>
      <AvatarUpload
        nombre={user?.nombre}
        value={photoUrl}
        folder={uploadFolder}
        onChange={setPhotoUrl}
      />
      <button
        type="button"
        className="admin-btn-primary"
        onClick={handleSave}
        disabled={saving || !photoUrl}
        style={{ marginTop: 8 }}
      >
        {saving ? 'Guardando…' : 'Guardar foto de perfil'}
      </button>
      {message ? <p className="admin-alert admin-alert-success" style={{ marginTop: 8 }}>{message}</p> : null}
      {error ? <p className="avatar-upload__error">{error}</p> : null}
    </section>
  );
}
