import React from "react";
import "../../styles/partidos.css";

/**
 * BadgeEstado - Componente para mostrar el estado del partido
 * @param {string} estado - Estado del partido (NS, LIVE, FT, etc.)
 */
export default function BadgeEstado({ estado }) {
  if (!estado) return null;

  const estadoLower = estado.toLowerCase();
  let badgeClass = "badge badge-scheduled";
  let texto = "Programado";

  if (estadoLower === "live" || estadoLower === "1h" || estadoLower === "2h") {
    badgeClass = "badge badge-live";
    texto = "En Vivo";
  } else if (estadoLower === "ft" || estadoLower === "finished") {
    badgeClass = "badge badge-finished";
    texto = "Finalizado";
  } else if (estadoLower === "ns" || estadoLower === "notstarted") {
    badgeClass = "badge badge-scheduled";
    texto = "Programado";
  }

  return <span className={badgeClass}>{texto}</span>;
}
