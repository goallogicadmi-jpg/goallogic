import { useEffect, useState } from "react";
import axios from "axios";

export default function FixturesCalendar({ leagueId, season }) {
  const [fixtures, setFixtures] = useState({ proximos: [], pasados: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("proximos");

  useEffect(() => {
    if (!leagueId || !season) return;

    const fetchFixtures = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/fixtures/league?leagueId=${leagueId}&season=${season}&next=15&last=15`);
        setFixtures(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, [leagueId, season]);

  if (loading) return <p>Cargando calendario...</p>;

  const currentFixtures = activeTab === "proximos" ? fixtures.proximos : fixtures.pasados;

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("proximos")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            backgroundColor: activeTab === "proximos" ? "#007bff" : "#e0e0e0",
            color: activeTab === "proximos" ? "#fff" : "#333"
          }}
        >
          Próximos Partidos
        </button>
        <button
          onClick={() => setActiveTab("pasados")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            backgroundColor: activeTab === "pasados" ? "#007bff" : "#e0e0e0",
            color: activeTab === "pasados" ? "#fff" : "#333"
          }}
        >
          Partidos Recientes
        </button>
      </div>

      {currentFixtures.length === 0 ? (
        <p>No hay partidos disponibles</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {currentFixtures.map((fix) => (
            <div
              key={fix.fixture.id}
              style={{
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                  {new Date(fix.fixture.date).toLocaleDateString()} - {new Date(fix.fixture.date).toLocaleTimeString()}
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                  {fix.teams.home.logo && (
                    <img src={fix.teams.home.logo} alt={fix.teams.home.name} style={{ width: "25px", marginRight: "10px" }} />
                  )}
                  <span>{fix.teams.home.name}</span>
                  <span style={{ margin: "0 15px", fontWeight: "bold" }}>
                    {fix.goals.home !== null ? fix.goals.home : "-"}
                  </span>
                  <span style={{ margin: "0 5px" }}>vs</span>
                  <span style={{ margin: "0 15px", fontWeight: "bold" }}>
                    {fix.goals.away !== null ? fix.goals.away : "-"}
                  </span>
                  {fix.teams.away.logo && (
                    <img src={fix.teams.away.logo} alt={fix.teams.away.name} style={{ width: "25px", marginLeft: "10px" }} />
                  )}
                  <span>{fix.teams.away.name}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {fix.league.name} - Jornada {fix.league.round}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", color: "#666" }}>
                {fix.fixture.status.long}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
