import { useEffect, useState } from "react";
import axios from "axios";

export default function TeamSquad({ teamId }) {
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("all");

  useEffect(() => {
    if (!teamId) return;

    const fetchSquad = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/squad?teamId=${teamId}&season=2024`);
        if (res.data.response && res.data.response.length > 0) {
          setSquad(res.data.response[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSquad();
  }, [teamId]);

  if (loading) return <p>Cargando plantilla...</p>;
  if (!squad || !squad.players) return null;

  const positions = ["all", ...new Set(squad.players.map(p => p.position))];
  const filteredPlayers = selectedPosition === "all" 
    ? squad.players 
    : squad.players.filter(p => p.position === selectedPosition);

  return (
    <div>
      <h3>Plantilla del Equipo</h3>
      
      <div style={{ marginBottom: "15px" }}>
        <label style={{ marginRight: "10px" }}>Filtrar por posición:</label>
        <select 
          value={selectedPosition} 
          onChange={(e) => setSelectedPosition(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid #ccc" }}
        >
          {positions.map(pos => (
            <option key={pos} value={pos}>
              {pos === "all" ? "Todas" : pos}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            style={{
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              {player.photo && (
                <img 
                  src={player.photo} 
                  alt={player.name} 
                  style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }}
                />
              )}
              <div>
                <div style={{ fontWeight: "bold" }}>{player.name}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  #{player.number || "-"} - {player.position || "N/A"}
                </div>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Edad: {player.age || "N/A"}
            </div>
            {player.nationality && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                {player.nationality}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
