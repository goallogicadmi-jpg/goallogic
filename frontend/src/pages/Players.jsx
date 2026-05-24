import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Players() {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="players-container" style={{ padding: "20px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 className="players-title" style={{ marginBottom: "20px", marginTop: "0", fontSize: "28px", color: "#333333" }}>Jugadores</h1>
      {loading && (
        <div style={{ margin: "40px 0", padding: "40px 20px", textAlign: "center", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#666666", fontSize: "16px", margin: "0" }}>Cargando jugadores...</p>
        </div>
      )}
      {!loading && (
        <div className="players-list-container" style={{ padding: "0", margin: "0" }}>
          <div className="players-grid" style={{ margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", width: "100%", boxSizing: "border-box" }}>
            {jugadores.map((jugador, index) => (
            <div 
              key={index} 
              className="player-card" 
              style={{ margin: "0", padding: "10px", backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "pointer", transition: "background-color 0.2s ease", minHeight: "250px" }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              <img className="player-image" alt="" style={{ margin: "0", padding: "0", width: "100%", height: "auto", objectFit: "cover", borderRadius: "4px", aspectRatio: "1/1", maxHeight: "200px" }} />
              <div className="player-info" style={{ margin: "0", padding: "10px", width: "100%", textAlign: "center" }}>
                <div className="player-name" style={{ margin: "0", padding: "0", fontSize: "16px", fontWeight: "bold", color: "#333333", textAlign: "center", wordWrap: "break-word", overflowWrap: "break-word", maxWidth: "100%" }}></div>
                <div className="player-position" style={{ margin: "0", padding: "0", fontSize: "14px", color: "#666666", textAlign: "center", wordWrap: "break-word", overflowWrap: "break-word", maxWidth: "100%" }}></div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}
      {!loading && jugadores.length === 0 && (
        <div className="players-empty" style={{ margin: "40px 0", padding: "40px 20px", textAlign: "center", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#666666", fontSize: "16px", margin: "0" }}>No hay jugadores disponibles</p>
        </div>
      )}
    </div>
  );
}
