const axios = require("axios");

const apiHeaders = {
  "x-apisports-key": process.env.API_KEY,
  "x-rapidapi-host": "v3.football.api-sports.io"
};

const getEstadisticasEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { leagueId, season } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Falta el ID del equipo" });
    }

    if (!leagueId || !season) {
      return res.status(400).json({ message: "Faltan parámetros: leagueId, season" });
    }

    // Obtener información del equipo
    const equipoResponse = await axios.get(
      `https://v3.football.api-sports.io/teams?id=${id}`,
      { headers: apiHeaders }
    );

    if (!equipoResponse.data.response || equipoResponse.data.response.length === 0) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }

    const equipo = equipoResponse.data.response[0].team;

    // Obtener estadísticas del equipo en la liga/temporada
    const statsResponse = await axios.get(
      `https://v3.football.api-sports.io/teams/statistics?team=${id}&league=${leagueId}&season=${season}`,
      { headers: apiHeaders }
    );

    const stats = statsResponse.data.response;

    // Obtener últimos 6 partidos
    const fixturesResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures?team=${id}&last=6`,
      { headers: apiHeaders }
    );

    const fixtures = fixturesResponse.data.response || [];

    // Calcular tendencias de los últimos partidos
    const tendencias = fixtures.map((fix) => {
      const esLocal = fix.teams.home.id === parseInt(id);
      const golesFavor = esLocal ? fix.goals.home : fix.goals.away;
      const golesContra = esLocal ? fix.goals.away : fix.goals.home;
      const rival = esLocal ? fix.teams.away.name : fix.teams.home.name;

      let resultado = "Empate";
      if (golesFavor > golesContra) resultado = "Victoria";
      else if (golesFavor < golesContra) resultado = "Derrota";

      return {
        rival,
        golesFavor,
        golesContra,
        resultado,
        fecha: fix.fixture.date.split("T")[0]
      };
    });

    // Construir respuesta con datos de la API
    const respuesta = {
      equipo: equipo.name,
      logo: equipo.logo,
      golesFavor: stats?.goals?.for?.total?.total || 0,
      golesContra: stats?.goals?.against?.total?.total || 0,
      posesionPromedio: stats?.possession ? parseInt(stats.possession) : 0,
      partidosJugados: stats?.fixtures?.played?.total || 0,
      victorias: stats?.fixtures?.wins?.total || 0,
      empates: stats?.fixtures?.draws?.total || 0,
      derrotas: stats?.fixtures?.loses?.total || 0,
      tarjetasAmarillas: stats?.cards?.yellow?.total || 0,
      tarjetasRojas: stats?.cards?.red?.total || 0,
      tendencias
    };

    res.json(respuesta);

  } catch (error) {
    console.error("Error al obtener estadísticas del equipo:", error.response?.data || error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

module.exports = { getEstadisticasEquipo };
