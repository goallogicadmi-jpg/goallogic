export default function PlayerMatchesTable({ matches, playerName }) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#B0BEC5",
          backgroundColor: "#1A1A1A",
          borderRadius: "8px",
          border: "1px solid rgba(79, 195, 247, 0.2)"
        }}
      >
        No hay partidos recientes
      </div>
    );
  }

  const tableStyle = {
    width: "100%",
    backgroundColor: "#121212",
    borderRadius: "8px",
    border: "1px solid rgba(79, 195, 247, 0.1)",
    overflow: "hidden"
  };

  const thStyle = {
    padding: "12px 8px",
    textAlign: "left",
    borderBottom: "1px solid #2A2A2A",
    backgroundColor: "rgba(79, 195, 247, 0.2)",
    color: "#4FC3F7",
    fontSize: "12px",
    fontWeight: "600"
  };

  const tdStyle = {
    padding: "10px 8px",
    borderBottom: "1px solid #2A2A2A",
    color: "#FFFFFF",
    fontSize: "12px"
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "N/D";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Función para traducir estado del partido
  const translateMatchStatus = (status) => {
    if (!status) return "Programado";
    const translations = {
      "Match Finished": "Finalizado",
      "Not Started": "No Iniciado",
      "Time to be Defined": "Por Definir",
      "Match Postponed": "Aplazado",
      "Match Cancelled": "Cancelado"
    };
    return translations[status] || status;
  };

  return (
    <div style={tableStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}>Rival</th>
            <th style={thStyle}>Minutos</th>
            <th style={thStyle}>Goles</th>
            <th style={thStyle}>Asistencias</th>
            <th style={thStyle}>Tarjetas</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, idx) => {
            // La API puede devolver datos en diferentes estructuras
            const fixture = match.fixture || match;
            const teams = fixture?.teams || match?.teams || {};
            const goals = fixture?.goals || match?.goals || {};
            
            // Estadísticas del jugador pueden estar en diferentes lugares
            const playerStats = match.statistics?.[0] || match.statistics || match;
            const stats = playerStats?.statistics || playerStats || {};

            // Determinar rival
            const homeTeam = teams.home?.name || "N/D";
            const awayTeam = teams.away?.name || "N/D";
            const rival = homeTeam !== playerName ? homeTeam : awayTeam;

            // Estadísticas del jugador
            const minutes = stats.minutes || stats.time?.total || playerStats.minutes || 0;
            const goalsScored = stats.goals?.total || stats.goals || playerStats.goals?.total || playerStats.goals || 0;
            const assists = stats.goals?.assists || stats.assists || playerStats.goals?.assists || playerStats.assists || 0;
            const yellowCards = stats.cards?.yellow || stats.yellow || playerStats.cards?.yellow || playerStats.yellow || 0;
            const redCards = stats.cards?.red || stats.red || playerStats.cards?.red || playerStats.red || 0;
            const cards = yellowCards > 0 || redCards > 0 
              ? `${yellowCards > 0 ? yellowCards + "🟨" : ""}${redCards > 0 ? redCards + "🟥" : ""}`
              : "-";

            // Fecha del partido
            const matchDate = fixture?.date || match?.date || fixture?.fixture?.date || "N/D";

            return (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#121212" : "#1A1A1A"
                }}
              >
                <td style={tdStyle}>{formatDate(matchDate)}</td>
                <td style={tdStyle}>{rival}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{minutes}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: goalsScored > 0 ? "#27ae60" : "#FFFFFF" }}>
                  {goalsScored}
                </td>
                <td style={{ ...tdStyle, textAlign: "center", color: assists > 0 ? "#4FC3F7" : "#FFFFFF" }}>
                  {assists}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{cards}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
