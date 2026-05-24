import { GoalLogicTitle } from './GoalLogicTitle';
import { ADVANCED_METRIC_LABELS as ML } from '../constants/advancedMetricLabels';

export default function PredictionsPanel({ predictions }) {
if (!predictions) return null;

return (
<div className="predictions-panel">
<GoalLogicTitle as="h3" size="sm" />
<p><strong>Total de goles estimado:</strong> {predictions.totalGoals}</p>
<p><strong>Ambos marcan:</strong> {predictions.btts}%</p>
<p><strong>{ML.over25}:</strong> {predictions.over25}%</p>
</div>
);
}