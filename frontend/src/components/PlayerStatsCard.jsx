export default function PlayerStatsCard({ title, value, icon }) {
  const cardStyle = {
    backgroundColor: "#1A1A1A",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid rgba(79, 195, 247, 0.2)",
    textAlign: "center",
    minWidth: "120px"
  };

  return (
    <div style={cardStyle}>
      {icon && (
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
      )}
      <p
        style={{
          color: "#B0BEC5",
          fontSize: "12px",
          margin: "0 0 8px 0",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: "#4FC3F7",
          fontSize: "24px",
          fontWeight: "700",
          margin: "0"
        }}
      >
        {value || "0"}
      </p>
    </div>
  );
}
