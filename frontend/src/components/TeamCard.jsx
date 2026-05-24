import { ADVANCED_METRIC_LABELS as ML } from '../constants/advancedMetricLabels';

export default function TeamCard({ team, title }) {
if (!team) return null;

return (
<div className="team-card">
<h3>{title}</h3>
<p><strong>Equipo:</strong> {team.teamName}</p>
<p><strong>Partidos:</strong> {team.games}</p>
<p><strong>Victorias:</strong> {team.wins}</p>
<p><strong>Empates:</strong> {team.draws}</p>
<p><strong>Derrotas:</strong> {team.losses}</p>
<p><strong>Goles a favor:</strong> {team.avgGoalsFor}</p>
<p><strong>Goles en contra:</strong> {team.avgGoalsAgainst}</p>
<p><strong>BTTS:</strong> {team.bttsProb}%</p>
<p><strong>{ML.over25}:</strong> {team.over25Prob}%</p>
<p><strong>Forma:</strong> {team.resultsStrip.join(" ")}</p>
</div>
);
}