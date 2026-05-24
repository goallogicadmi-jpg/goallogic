import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../../services/authService';

const PUBLICATION_TYPES = [
  'Tiros de esquina',
  'Goles',
  'Tarjetas',
  'Equipos',
  'Comentario',
];

export function NewAnalysis() {
  const [formData, setFormData] = useState({
    publicationType: '',
    matchInfo: {
      homeTeam: '',
      awayTeam: '',
      league: '',
      startTime: '',
    },
    probability: '',
    text: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isCommentOnly = formData.publicationType === 'Comentario';

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('matchInfo.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        matchInfo: { ...formData.matchInfo, [field]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = getToken();
      const payload = {
        publicationType: formData.publicationType,
        text: formData.text,
      };

      if (!isCommentOnly) {
        payload.matchInfo = {
          ...formData.matchInfo,
          startTime: formData.matchInfo.startTime
            ? new Date(formData.matchInfo.startTime)
            : new Date(),
        };
        if (formData.probability.trim()) {
          payload.probability = formData.probability.trim();
        }
      }

      const response = await axios.post('/api/community/posts', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate(`/comunidad/post/${response.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la publicación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-analysis-page">
      <div className="new-analysis-form">
        <h2>Nueva publicación</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de publicación *</label>
            <select
              name="publicationType"
              value={formData.publicationType}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona un tipo</option>
              {PUBLICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {!isCommentOnly && formData.publicationType && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Equipo Local *</label>
                  <input
                    type="text"
                    name="matchInfo.homeTeam"
                    value={formData.matchInfo.homeTeam}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Equipo Visitante *</label>
                  <input
                    type="text"
                    name="matchInfo.awayTeam"
                    value={formData.matchInfo.awayTeam}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Liga *</label>
                  <input
                    type="text"
                    name="matchInfo.league"
                    value={formData.matchInfo.league}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    name="matchInfo.startTime"
                    value={formData.matchInfo.startTime}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Probabilidad</label>
                <input
                  type="text"
                  name="probability"
                  value={formData.probability}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {formData.publicationType && (
            <div className="form-group">
              <label>{isCommentOnly ? 'Argumento o comentario *' : 'Análisis *'}</label>
              <textarea
                name="text"
                value={formData.text}
                onChange={handleChange}
                required
                rows="8"
                placeholder={
                  isCommentOnly
                    ? 'Escribe tu argumento o comentario...'
                    : 'Describe tu análisis estadístico del partido...'
                }
              />
              <small>
                Recuerda: Solo análisis estadístico. No se permiten recomendaciones de apuestas.
              </small>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/comunidad')}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.publicationType}
              className="btn btn-vip"
            >
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
