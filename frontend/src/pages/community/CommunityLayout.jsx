import { Routes, Route, NavLink } from 'react-router-dom';
import { GoalLogicSectionHeader } from '../../components/GoalLogicTitle';
import { CommunityFeed } from './CommunityFeed';
import { NewAnalysis } from './NewAnalysis';
import { PostDetail } from './PostDetail';
import '../../styles/community.css';

export function CommunityLayout() {
  return (
    <div className="community-page">
      <GoalLogicSectionHeader size="lg" className="community-brand-header" />

      <header className="community-header">
        <div>
          <h1>HABLEMOS DE FUTBOL</h1>
          <p className="community-subtitle">
            Espacio de análisis estadístico profesional. No se permiten recomendaciones de apuesta.
          </p>
        </div>
        <NavLink to="nuevo" className="btn btn-vip">
          Nueva publicación
        </NavLink>
      </header>

      <Routes>
        <Route path="/" element={<CommunityFeed />} />
        <Route path="nuevo" element={<NewAnalysis />} />
        <Route path="post/:id" element={<PostDetail />} />
      </Routes>
    </div>
  );
}

export default CommunityLayout;
