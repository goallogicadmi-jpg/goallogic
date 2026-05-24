import { useEffect, useState } from "react";
import axios from "axios";

export default function LiveFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const fetchLive = async () => {
      try {
        const res = await axios.get("/api/fixtures/live");
        setFixtures(res.data.response || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) return <p>Cargando partidos en vivo...</p>;

  if (fixtures.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3>No hay partidos en vivo</h3>
        <button onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? "Desactivar actualización" : "Activar actualización"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3>Partidos en Vivo</h3>
        <button onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? "⏸ Desactivar actualización" : "▶ Activar actualización"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "15px" }}>
        {fixtures.map((fix) => {
          const minute = fix.fixture.status.elapsed || 0;
          const isLive = fix.fixture.status.short === "LIVE" || fix.fixture.status.short === "HT";
          const homeGoals = fix.goals.home ?? null;
          const awayGoals = fix.goals.away ?? null;

          return (
            <div
              key={fix.fixture.id}
              style={{
                padding: "20px",
                border: isLive ? "2px solid #e74c3c" : "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: isLive ? "#fff5f5" : "#fff"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    {fix.teams.home.logo && (
                      <img src={fix.teams.home.logo} alt={fix.teams.home.name} style={{ width: "30px", marginRight: "10px" }} />
                    )}
                    <strong>{fix.teams.home.name}</strong>
                    <span style={{ margin: "0 15px", fontSize: "24px", fontWeight: "bold" }}>
                      {homeGoals !== null ? homeGoals : "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {fix.teams.away.logo && (
                      <img src={fix.teams.away.logo} alt={fix.teams.away.name} style={{ width: "30px", marginRight: "10px" }} />
                    )}
                    <strong>{fix.teams.away.name}</strong>
                    <span style={{ margin: "0 15px", fontSize: "24px", fontWeight: "bold" }}>
                      {awayGoals !== null ? awayGoals : "-"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {isLive && (
                    <div style={{ color: "#e74c3c", fontWeight: "bold", marginBottom: "5px" }}>
                      ⚽ LIVE
                    </div>
                  )}
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    {fix.fixture.status.long}
                  </div>
                  {minute > 0 && (
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {minute}'
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>
                    {new Date(fix.fixture.date).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {fix.league.name} - Jornada {fix.league.round}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
