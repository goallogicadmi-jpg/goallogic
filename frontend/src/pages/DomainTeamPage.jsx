import { useLocation, useNavigate, useParams } from "react-router-dom";
import EquipoDetalle from "../components/EquipoDetalle";

export default function DomainTeamPage({ domain = "club" }) {
  const { teamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};

  const handleBack = () => {
    if (state.fromCompetitionRoute) {
      navigate(state.fromCompetitionRoute);
      return;
    }

    navigate(domain === "selection" ? "/selecciones" : "/clubes");
  };

  return (
    <EquipoDetalle
      teamId={teamId}
      onBack={handleBack}
      domain={domain}
      competitionId={state.competitionId}
      season={state.season}
    />
  );
}
