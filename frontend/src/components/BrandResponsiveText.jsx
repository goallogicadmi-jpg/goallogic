import React from 'react';
import { BRAND_NAME, BRAND_NAME_LEGACY } from '../constants/brand';

/**
 * Muestra GoalLogic en móvil y GOAL_LOGIC en desktop (≥769px).
 */
export default function BrandResponsiveText({
  suffix = '',
  mobileLabel,
  desktopLabel,
  className = '',
  as: Tag = 'span',
}) {
  const mobile = mobileLabel ?? `${BRAND_NAME_LEGACY}${suffix}`;
  const desktop = desktopLabel ?? `${BRAND_NAME}${suffix}`;

  return (
    <Tag className={`brand-responsive ${className}`.trim()} translate="no" lang="en">
      <span className="brand-responsive__mobile">{mobile}</span>
      <span className="brand-responsive__desktop">{desktop}</span>
    </Tag>
  );
}
