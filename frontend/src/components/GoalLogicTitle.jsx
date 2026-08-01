import '../styles/goal-logic-brand.css';
import { BRAND_NAME } from '../constants/brand';

/**
 * Título de marca oficial: GOAL_ (gris metálico) + LOGIC (naranja), Orbitron Bold, centrado.
 */
export function GoalLogicTitle({ as: Tag = 'h1', size = 'lg', className = '' }) {
  return (
    <Tag
      className={`goal-logic-title goal-logic-title--${size} notranslate ${className}`.trim()}
      aria-label={BRAND_NAME}
      translate="no"
      lang="en"
    >
      <span className="goal-logic-title__goal">GOAL_</span>
      <span className="goal-logic-title__logic">LOGIC</span>
    </Tag>
  );
}

export function GoalLogicSectionHeader({ size = 'lg', className = '' }) {
  return (
    <header className={`goal-logic-section-header ${className}`.trim()}>
      <GoalLogicTitle size={size} />
    </header>
  );
}

export default GoalLogicTitle;
