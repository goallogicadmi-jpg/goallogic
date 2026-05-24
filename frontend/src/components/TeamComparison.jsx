import { useEffect, useState } from "react";
import axios from "axios";

export default function TeamComparison({ team1Id, team2Id, leagueId, season }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!team1Id || !team2Id || !leagueId || !season) return;

    const fetchComparison = async () => {
      setLoading(true);
      try {
        const [stats1, stats2, h2h] = await Promise.all([
          axios.get(`/api/team-stats?teamId=${team1Id}&leagueId=${leagueId}&season=${season}`),
          axios.get(`/api/team-stats?teamId=${team2Id}&leagueId=${leagueId}&season=${season}`),
          axios.get(`/api/h2h?team1=${team1Id}&team2=${team2Id}`)
        ]);

        const team1Stats = stats1.data.response || {};
        const team2Stats = stats2.data.response || {};
        const h2hData = h2h.data.response || [];

        setComparison({
          team1: team1Stats,
          team2: team2Stats,
          h2h: h2hData
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [team1Id, team2Id, leagueId, season]);

  if (loading) return <p>Cargando comparación...</p>;
  if (!comparison) return null;

  const compareStat = (stat1, stat2, label, higherIsBetter = true) => {
    const val1 = typeof stat1 === 'object' ? (stat1.total?.total || stat1.total || 0) : (stat1 || 0);
    const val2 = typeof stat2 === 'object' ? (stat2.total?.total || stat2.total || 0) : (stat2 || 0);
    const winner = higherIsBetter ? (val1 > val2 ? 1 : val2 > val1 ? 2 : 0) : (val1 < val2 ? 1 : val2 < val1 ? 2 : 0);

    return { val1, val2, winner, label };
  };

  const stats = [
    compareStat(comparison.team1.goals?.for, comparison.team2.goals?.for, "Goles a Favor", true),
    compareStat(comparison.team1.goals?.against, comparison.team2.goals?.against, "Goles en Contra", false),
    compareStat(comparison.team1.passes?.total, comparison.team2.passes?.total, "Pases Totales", true),
    compareStat(comparison.team1.passes?.accuracy, comparison.team2.passes?.accuracy, "Precisión de Pases (%)", true),
    compareStat(comparison.team1.shots?.on?.total, comparison.team2.shots?.on?.total, "Tiros al Arco", true),
    compareStat(comparison.team1.fouls?.drawn, comparison.team2.fouls?.drawn, "Faltas Recibidas", true),
    compareStat(comparison.team1.cards?.yellow?.total, comparison.team2.cards?.yellow?.total, "Tarjetas Amarillas", false),
  ];

  const team1Possession = comparison.team1.possession ? parseInt(comparison.team1.possession) : 0;
  const team2Possession = comparison.team2.possession ? parseInt(comparison.team2.possession) : 100 - team1Possession;

  return (
    <div>
      <h3>Comparación Detallada</h3>

      {/* Posesión */}
      <div style={{ marginBottom: "30px" }}>
        <h4>Posesión</h4>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{team1Possession}%</div>
          </div>
          <div style={{ flex: 2, height: "30px", backgroundColor: "#e0e0e0", borderRadius: "5px", position: "relative", display: "flex" }}>
            <div style={{ width: `${team1Possession}%`, backgroundColor: "#007bff", borderRadius: "5px 0 0 5px" }}></div>
            <div style={{ width: `${team2Possession}%`, backgroundColor: "#e74c3c", borderRadius: "0 5px 5px 0" }}></div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{team2Possession}%</div>
          </div>
        </div>
      </div>

      {/* Estadísticas Comparativas */}
      <div style={{ display: "grid", gap: "15px" }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{ padding: "15px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff" }}>
            <div style={{ fontWeight: "bold", marginBottom: "10px" }}>{stat.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: "bold",
                  color: stat.winner === 1 ? "#27ae60" : stat.winner === 2 ? "#999" : "#333"
                }}>
                  {stat.val1}
                </div>
              </div>
              <div style={{ flex: 2, height: "25px", backgroundColor: "#f0f0f0", borderRadius: "5px", position: "relative", display: "flex" }}>
                <div style={{ 
                  width: `${stat.val1 + stat.val2 > 0 ? (stat.val1 / (stat.val1 + stat.val2)) * 100 : 50}%`, 
                  backgroundColor: stat.winner === 1 ? "#27ae60" : stat.winner === 2 ? "#e0e0e0" : "#007bff",
                  borderRadius: "5px 0 0 5px"
                }}></div>
                <div style={{ 
                  width: `${stat.val1 + stat.val2 > 0 ? (stat.val2 / (stat.val1 + stat.val2)) * 100 : 50}%`, 
                  backgroundColor: stat.winner === 2 ? "#27ae60" : stat.winner === 1 ? "#e0e0e0" : "#e74c3c",
                  borderRadius: "0 5px 5px 0"
                }}></div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: "bold",
                  color: stat.winner === 2 ? "#27ae60" : stat.winner === 1 ? "#999" : "#333"
                }}>
                  {stat.val2}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Head-to-Head */}
      {comparison.h2h.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h4>Enfrentamientos Históricos</h4>
          <p style={{ color: "#666" }}>Total de encuentros: {comparison.h2h.length}</p>
        </div>
      )}
    </div>
  );
}
