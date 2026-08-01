import { useEffect, useMemo, useState } from 'react';
import {
  getAnalystSubscribers,
  sendAnalystMessage,
} from '../../services/analystService';
import './AnalystSubscriberMessaging.css';

export default function AnalystSubscriberMessaging({ analystId }) {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await getAnalystSubscribers(analystId);
        if (!cancelled) setSubscribers(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudieron cargar los suscriptores');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [analystId]);

  const subscriberKeyMap = useMemo(() => {
    const map = new Map();
    subscribers.forEach((sub, index) => {
      map.set(sub.publicId || `row-${index}`, sub);
    });
    return map;
  }, [subscribers]);

  function toggleSubscriber(publicId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
      };

      if (!sendToAll) {
        const publicIds = [...selectedIds].filter(Boolean);
        if (!publicIds.length) {
          throw new Error('Selecciona al menos un suscriptor.');
        }
        payload.subscriberPublicIds = publicIds;
      }

      const result = await sendAnalystMessage(analystId, payload);
      setSuccess(result.message || 'Mensaje enviado correctamente.');
      setTitle('');
      setContent('');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="analyst-messaging">
      <h2>Enviar mensaje a suscriptores</h2>
      <p className="analyst-messaging__hint">
        Los suscriptores recibirán el mensaje en su bandeja interna.
      </p>

      {loading ? (
        <p className="analyst-messaging__status">Cargando suscriptores…</p>
      ) : subscribers.length === 0 ? (
        <p className="analyst-messaging__status">Aún no tienes suscriptores activos.</p>
      ) : (
        <>
          <div className="analyst-messaging__subscribers">
            <h3>Suscriptores ({subscribers.length})</h3>
            <ul>
              {subscribers.map((sub, index) => {
                const key = sub.publicId || `row-${index}`;
                return (
                  <li key={key}>
                    <span className="analyst-messaging__name">{sub.name}</span>
                    <span className="analyst-messaging__public-id">{sub.publicId || '—'}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <form className="analyst-messaging__form" onSubmit={handleSubmit}>
            <label className="analyst-messaging__field">
              <span>Título</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="analyst-messaging__field">
              <span>Mensaje</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={5000}
                required
              />
            </label>

            <fieldset className="analyst-messaging__targets">
              <legend>Destinatarios</legend>
              <label>
                <input
                  type="radio"
                  name="targetMode"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                />
                Todos los suscriptores
              </label>
              <label>
                <input
                  type="radio"
                  name="targetMode"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                />
                Suscriptores específicos
              </label>
            </fieldset>

            {!sendToAll ? (
              <div className="analyst-messaging__picker">
                {subscribers.map((sub, index) => {
                  const key = sub.publicId || `row-${index}`;
                  return (
                    <label key={key} className="analyst-messaging__picker-item">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(key)}
                        onChange={() => toggleSubscriber(key)}
                      />
                      <span>{sub.name}</span>
                      <span className="analyst-messaging__public-id">{sub.publicId || '—'}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {error ? <p className="analyst-messaging__error">{error}</p> : null}
            {success ? <p className="analyst-messaging__success">{success}</p> : null}

            <button type="submit" disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
