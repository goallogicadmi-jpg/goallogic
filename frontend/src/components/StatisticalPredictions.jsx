import { useEffect, useState } from "react";
import axios from "axios";

export default function StatisticalPredictions({ team1Id, team2Id, leagueId, season }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!team1Id || !team2Id || !leagueId || !season) return;

    const calculatePredictions = async () => {
      setLoading(true);
      try {
        const [stats1, stats2, h2h, lastMatches1, lastMatches2] = await Promise.all([
          axios.get(`/api/team-stats?teamId=${team1Id}&leagueId=${leagueId}&season=${season}`),
          axios.get(`/api/team-stats?teamId=${team2Id}&leagueId=${leagueId}&season=${season}`),
          axios.get(`/api/h2h?team1=${team1Id}&team2=${team2Id}`),
          axios.get(`/api/team-last-matches?teamId=${team1Id}&limit=10`),
          axios.get(`/api/team-last-matches?teamId=${team2Id}&limit=10`)
        ]);

        const team1Stats = stats1.data.response || {};
        const team2Stats = stats2.data.response || {};
        const h2hData = h2h.data.response || [];
        const matches1 = lastMatches1.data.response || [];
        const matches2 = lastMatches2.data.response || [];

        // Calcular promedios
        const avgGoalsFor1 = team1Stats.goals?.for?.average?.total || 0;
        const avgGoalsAgainst1 = team1Stats.goals?.against?.average?.total || 0;
        const avgGoalsFor2 = team2Stats.goals?.for?.average?.total || 0;
        const avgGoalsAgainst2 = team2Stats.goals?.against?.average?.total || 0;

        // Calcular xG aproximado
        const shotsOnTarget1 = team1Stats.shots?.on?.total || 0;
        const shotsTotal1 = team1Stats.shots?.total || shotsOnTarget1;
        const xG1 = (shotsOnTarget1 * 0.15) + ((shotsTotal1 - shotsOnTarget1) * 0.05);

        const shotsOnTarget2 = team2Stats.shots?.on?.total || 0;
        const shotsTotal2 = team2Stats.shots?.total || shotsOnTarget2;
        const xG2 = (shotsOnTarget2 * 0.15) + ((shotsTotal2 - shotsOnTarget2) * 0.05);

        // Proyección de goles esperados
        const expectedGoals1 = (avgGoalsFor1 + avgGoalsAgainst2) / 2;
        const expectedGoals2 = (avgGoalsFor2 + avgGoalsAgainst1) / 2;
        const totalGoalsExpected = expectedGoals1 + expectedGoals2;

        // Probabilidades basadas en estadísticas
        const games1 = team1Stats.fixtures?.played?.total || 1;
        const games2 = team2Stats.fixtures?.played?.total || 1;
        const winRate1 = (team1Stats.fixtures?.wins?.total || 0) / games1;
        const winRate2 = (team2Stats.fixtures?.wins?.total || 0) / games2;
        const drawRate1 = (team1Stats.fixtures?.draws?.total || 0) / games1;
        const drawRate2 = (team2Stats.fixtures?.draws?.total || 0) / games2;

        // Factor H2H
        let h2hWeight = 1;
        if (h2hData.length > 0) {
          const team1Wins = h2hData.filter(f => {
            const isHome = f.teams.home.id === parseInt(team1Id);
            return isHome ? (f.goals.home || 0) > (f.goals.away || 0) : (f.goals.away || 0) > (f.goals.home || 0);
          }).length;
          const team1WinRateH2H = team1Wins / h2hData.length;
          h2hWeight = 1 + (team1WinRateH2H - 0.5) * 0.2; // Ajuste de hasta 20%
        }

        // Probabilidades finales
        const baseWin1 = winRate1 * (1 - drawRate2);
        const baseWin2 = winRate2 * (1 - drawRate1);
        const baseDraw = (drawRate1 + drawRate2) / 2;

        const adjustedWin1 = baseWin1 * h2hWeight;
        const adjustedWin2 = baseWin2 * (2 - h2hWeight);

        // Normalizar probabilidades
        const total = adjustedWin1 + adjustedWin2 + baseDraw;
        const probWin1 = (adjustedWin1 / total) * 100;
        const probWin2 = (adjustedWin2 / total) * 100;
        const probDraw = (baseDraw / total) * 100;

        setPredictions({
          expectedGoals: {
            team1: Number(expectedGoals1.toFixed(2)),
            team2: Number(expectedGoals2.toFixed(2)),
            total: Number(totalGoalsExpected.toFixed(2))
          },
          xG: {
            team1: Number(xG1.toFixed(2)),
            team2: Number(xG2.toFixed(2))
          },
          probabilities: {
            team1Win: Number(probWin1.toFixed(1)),
            team2Win: Number(probWin2.toFixed(1)),
            draw: Number(probDraw.toFixed(1))
          },
          overUnder: {
            over25: totalGoalsExpected > 2.5 ? Number(((totalGoalsExpected - 2.5) / 5) * 100).toFixed(1) : 0,
            under25: totalGoalsExpected <= 2.5 ? Number(((2.5 - totalGoalsExpected) / 2.5) * 100).toFixed(1) : 0
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    calculatePredictions();
  }, [team1Id, team2Id, leagueId, season]);

  if (loading) return <p>Calculando predicciones estadísticas...</p>;
  if (!predictions) return null;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
      <h3>Análisis Estadístico y Probabilidades</h3>

      {/* Probabilidades de Resultado */}
      <div style={{ marginBottom: "30px" }}>
        <h4>Probabilidad de Resultado</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Victoria Equipo 1</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#007bff" }}>
              {predictions.probabilities.team1Win}%
            </div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Empate</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f39c12" }}>
              {predictions.probabilities.draw}%
            </div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Victoria Equipo 2</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#e74c3c" }}>
              {predictions.probabilities.team2Win}%
            </div>
          </div>
        </div>
      </div>

      {/* Goles Esperados */}
      <div style={{ marginBottom: "30px" }}>
        <h4>Goles Esperados</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Equipo 1</div>
            <div style={{ fontSize: "28px", fontWeight: "bold" }}>{predictions.expectedGoals.team1}</div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Total Esperado</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#27ae60" }}>
              {predictions.expectedGoals.total}
            </div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Equipo 2</div>
            <div style={{ fontSize: "28px", fontWeight: "bold" }}>{predictions.expectedGoals.team2}</div>
          </div>
        </div>
      </div>

      {/* xG (Expected Goals) */}
      <div style={{ marginBottom: "30px" }}>
        <h4>Expected Goals (xG)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Equipo 1 xG</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3498db" }}>
              {predictions.xG.team1}
            </div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Equipo 2 xG</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9b59b6" }}>
              {predictions.xG.team2}
            </div>
          </div>
        </div>
      </div>

      {/* Over/Under */}
      <div>
        <h4>Probabilidad de Total de Goles</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Más de 2.5 Goles</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}>
              {predictions.overUnder.over25}%
            </div>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Menos de 2.5 Goles</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#e74c3c" }}>
              {predictions.overUnder.under25}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px", fontSize: "14px", color: "#856404" }}>
        <strong>Nota:</strong> Estas probabilidades están basadas en análisis estadístico de datos históricos y tendencias. 
        Son proyecciones matemáticas, no predicciones absolutas. Los resultados reales pueden variar.
      </div>
    </div>
  );
}
