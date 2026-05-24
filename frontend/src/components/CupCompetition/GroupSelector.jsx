import React from 'react';
import { tokens } from '../../styles/tokens';

export const ALL_GROUPS_VALUE = '__all__';

/**
 * Componente para seleccionar grupos en competiciones tipo copa
 * @param {Array} groups - Array de grupos disponibles
 * @param {string} selectedGroup - Grupo actualmente seleccionado
 * @param {Function} onGroupChange - Callback cuando cambia el grupo seleccionado
 */
export default function GroupSelector({ groups = [], selectedGroup, onGroupChange }) {
  if (!groups || groups.length === 0) {
    return null;
  }

  const containerStyle = {
    marginBottom: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const titleStyle = {
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.md,
  };

  const groupsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  };

  const groupButtonStyle = (isActive) => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    borderRadius: tokens.radius.md,
    border: `2px solid ${isActive ? tokens.colors.accentOrange : tokens.colors.borderDefault}`,
    backgroundColor: isActive ? tokens.colors.accentOrange : tokens.colors.bgTertiary,
    color: isActive ? tokens.colors.textPrimary : tokens.colors.textSecondary,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: isActive ? tokens.typography.fontWeightSemibold : tokens.typography.fontWeightNormal,
    transition: 'all 0.2s ease',
    minWidth: '60px',
    textAlign: 'center',
  });

  const handleGroupClick = (groupName) => {
    if (onGroupChange) {
      onGroupChange(groupName);
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>🏆 Grupos</h3>
      <div style={groupsContainerStyle}>
        <button
          key={ALL_GROUPS_VALUE}
          onClick={() => handleGroupClick(ALL_GROUPS_VALUE)}
          style={groupButtonStyle(selectedGroup === ALL_GROUPS_VALUE)}
          onMouseEnter={(e) => {
            if (selectedGroup !== ALL_GROUPS_VALUE) {
              e.target.style.backgroundColor = tokens.colors.bgPrimary;
              e.target.style.borderColor = tokens.colors.accentOrange;
            }
          }}
          onMouseLeave={(e) => {
            if (selectedGroup !== ALL_GROUPS_VALUE) {
              e.target.style.backgroundColor = tokens.colors.bgTertiary;
              e.target.style.borderColor = tokens.colors.borderDefault;
            }
          }}
        >
          Todos
        </button>
        {groups.map((group) => {
          const groupKey = typeof group === 'string' ? group : (group.groupKey || group.name || group.groupName || group);
          const groupLabel = typeof group === 'string' ? group : (group.groupLabel || group.groupName || group.name || groupKey);
          const isActive = selectedGroup === groupKey;
          
          return (
            <button
              key={groupKey}
              onClick={() => handleGroupClick(groupKey)}
              style={groupButtonStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = tokens.colors.bgPrimary;
                  e.target.style.borderColor = tokens.colors.accentOrange;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = tokens.colors.bgTertiary;
                  e.target.style.borderColor = tokens.colors.borderDefault;
                }
              }}
            >
              {groupLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
