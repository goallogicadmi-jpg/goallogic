import { useState } from "react";

export default function PlayerCard({ player, onClick, isOpen, children }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!player) return null;

  // Función para traducir posiciones
  const translatePosition = (position) => {
    if (!position) return "N/D";
    const translations = {
      "Goalkeeper": "Portero",
      "Defender": "Defensor",
      "Midfielder": "Mediocampista",
      "Attacker": "Atacante",
      "Forward": "Delantero"
    };
    return translations[position] || position;
  };

  // Función para obtener color del badge según posición
  const getPositionColor = (position) => {
    if (!position) return "rgba(79, 195, 247, 0.3)";
    const pos = position.toLowerCase();
    if (pos.includes("goalkeeper") || pos.includes("portero")) return "rgba(79, 195, 247, 0.4)";
    if (pos.includes("defender") || pos.includes("defensor")) return "rgba(46, 204, 113, 0.4)";
    if (pos.includes("midfielder") || pos.includes("mediocampista")) return "rgba(241, 196, 15, 0.4)";
    if (pos.includes("attacker") || pos.includes("forward") || pos.includes("delantero")) return "rgba(231, 76, 60, 0.4)";
    return "rgba(79, 195, 247, 0.3)";
  };

  const cardStyle = {
    backgroundColor: "#1A1A1A",
    borderRadius: "10px",
    padding: "20px",
    border: "1px solid rgba(79, 195, 247, 0.2)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative"
  };

  const hoverStyle = {
    ...cardStyle,
    borderColor: "#1f6feb",
    boxShadow: "0 4px 12px rgba(31, 111, 235, 0.3)",
    transform: "translateY(-2px)"
  };

  return (
    <div style={{ marginBottom: "0" }}>
      <div
        style={isHovered ? hoverStyle : cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          console.log("CLICK EN JUGADOR:", player.nombre);
          if (onClick) {
            onClick();
          }
        }}
      >
      {/* Foto circular del jugador */}
      <div
        style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          overflow: "hidden",
          marginBottom: "12px",
          border: "2px solid rgba(79, 195, 247, 0.3)",
          backgroundColor: "#121212"
        }}
      >
        {player.foto ? (
          <img
            src={player.foto}
            alt={player.nombre}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/100?text=J";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4FC3F7",
              fontSize: "32px",
              fontWeight: "bold"
            }}
          >
            {player.nombre?.charAt(0) || "J"}
          </div>
        )}
      </div>

      {/* Nombre */}
      <h3
        style={{
          color: "#FFFFFF",
          fontSize: "16px",
          fontWeight: "600",
          marginBottom: "8px",
          marginTop: "0"
        }}
      >
        {player.nombre || "Jugador"}
      </h3>

      {/* Badge de posición */}
      <div
        style={{
          backgroundColor: getPositionColor(player.posicion),
          color: "#FFFFFF",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "500",
          marginBottom: "8px",
          border: "1px solid rgba(79, 195, 247, 0.3)"
        }}
      >
        {translatePosition(player.posicion)}
      </div>

      {/* Información adicional */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          width: "100%",
          marginTop: "8px"
        }}
      >
        {player.numero && (
          <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0" }}>
            Número: <span style={{ color: "#4FC3F7" }}>{player.numero}</span>
          </p>
        )}
        {player.edad && (
          <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0" }}>
            Edad: <span style={{ color: "#4FC3F7" }}>{player.edad} años</span>
          </p>
        )}
        {player.nacionalidad && (
          <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0" }}>
            {player.nacionalidad}
          </p>
        )}
      </div>

      {/* Botón Ver jugador */}
      <button
        style={{
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: "transparent",
          border: "1px solid #1f6feb",
          color: "#1f6feb",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "500",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#1f6feb";
          e.target.style.color = "#FFFFFF";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
          e.target.style.color = "#1f6feb";
        }}
      >
        Ver jugador
      </button>
      </div>
      {isOpen && children && (
        <div
          style={{
            backgroundColor: "#161b22",
            borderRadius: "0 0 10px 10px",
            padding: "20px",
            marginTop: "0",
            border: "1px solid rgba(79, 195, 247, 0.2)",
            borderTop: "none"
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
