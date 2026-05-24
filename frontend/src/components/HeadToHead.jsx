import { useEffect, useState } from "react";
import axios from "axios";

export default function HeadToHead({ team1Id, team2Id }) {
  const [h2h, setH2h] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!team1Id || !team2Id) return;

    const fetchH2H = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/h2h?team1=${team1Id}&team2=${team2Id}`);
        const fixtures = res.data.response || [];
        
        if (fixtures.length === 0) {
          setH2h({ fixtures: [], stats: null });
          setLoading(false);
          return;
        }

        // Calcular estadísticas
        let wins1 = 0, wins2 = 0, draws = 0;
        let goals1 = 0, goals2 = 0;

        fixtures.forEach(fix => {
          const isTeam1Home = fix.teams.home.id === parseInt(team1Id);
          const goalsHome = fix.goals.home || 0;
          const goalsAway = fix.goals.away || 0;

          if (isTeam1Home) {
            goals1 += goalsHome;
            goals2 += goalsAway;
            if (goalsHome > goalsAway) wins1++;
            else if (goalsAway > goalsHome) wins2++;
            else draws++;
          } else {
            goals1 += goalsAway;
            goals2 += goalsHome;
            if (goalsAway > goalsHome) wins1++;
            else if (goalsHome > goalsAway) wins2++;
            else draws++;
          }
        });

        setH2h({
          fixtures: fixtures.slice(0, 10), // Últimos 10
          stats: {
            total: fixtures.length,
            wins1,
            wins2,
            draws,
            goals1,
            goals2
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchH2H();
  }, [team1Id, team2Id]);

  if (loading) return <p>Cargando enfrentamientos históricos...</p>;
  if (!h2h) return null;

  return (
    <div>
      <h3>Enfrentamientos Históricos</h3>
      
      {h2h.stats && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(5, 1fr)", 
          gap: "15px", 
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{h2h.stats.total}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Total</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}>{h2h.stats.wins1}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Victorias Equipo 1</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f39c12" }}>{h2h.stats.draws}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Empates</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#e74c3c" }}>{h2h.stats.wins2}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Victorias Equipo 2</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>
              {h2h.stats.goals1} - {h2h.stats.goals2}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Goles</div>
          </div>
        </div>
      )}

      <h4>Últimos Encuentros</h4>
      {h2h.fixtures.length === 0 ? (
        <p>No hay enfrentamientos históricos registrados</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {h2h.fixtures.map((fix) => {
            const isTeam1Home = fix.teams.home.id === parseInt(team1Id);
            const homeGoals = fix.goals.home || 0;
            const awayGoals = fix.goals.away || 0;

            return (
              <div
                key={fix.fixture.id}
                style={{
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#fff"
                }}
              >
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                  {new Date(fix.fixture.date).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    {isTeam1Home ? fix.teams.home.name : fix.teams.away.name}
                  </div>
                  <div style={{ margin: "0 15px", fontWeight: "bold", fontSize: "18px" }}>
                    {isTeam1Home ? homeGoals : awayGoals} - {isTeam1Home ? awayGoals : homeGoals}
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    {isTeam1Home ? fix.teams.away.name : fix.teams.home.name}
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                  {fix.league.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
