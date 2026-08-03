import '../styles/goal-logic-brand.css';
import { BRAND_NAME } from '../constants/brand';
import GoalLogicGlobalSearch from './search/GoalLogicGlobalSearch';

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

export function GoalLogicSectionHeader({ size = 'lg', className = '', showSearch = true }) {
  return (
    <header className={`goal-logic-section-header ${className}`.trim()}>
      <div className="goal-logic-section-header__spacer" aria-hidden="true" />
      <div className="goal-logic-section-header__title">
        <GoalLogicTitle size={size} />
      </div>
      {showSearch ? (
        <div className="goal-logic-section-header__search">
          <GoalLogicGlobalSearch />
        </div>
      ) : (
        <div className="goal-logic-section-header__spacer" aria-hidden="true" />
      )}
    </header>
  );
}

export default GoalLogicTitle;
