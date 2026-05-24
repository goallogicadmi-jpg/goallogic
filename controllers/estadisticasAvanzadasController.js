const axios = require("axios");

const apiHeaders = {
  "x-apisports-key": process.env.API_KEY,
  "x-rapidapi-host": "v3.football.api-sports.io"
};

const getEstadisticasAvanzadas = async (req, res) => {
  try {
    const { leagueId, season } = req.query;

    if (!leagueId || !season) {
      return res.status(400).json({ message: "Faltan parámetros: leagueId, season" });
    }

    // Obtener equipos de la liga
    const teamsResponse = await axios.get(
      `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`,
      { headers: apiHeaders }
    );

    if (!teamsResponse.data.response || teamsResponse.data.response.length === 0) {
      return res.status(404).json({ message: "No se encontraron equipos en la liga" });
    }

    const equipos = teamsResponse.data.response;

    // Obtener estadísticas avanzadas de cada equipo
    const tabla = await Promise.all(
      equipos.map(async (item) => {
        const teamId = item.team.id;
        const teamName = item.team.name;
        const teamLogo = item.team.logo;

        try {
          // Obtener estadísticas del equipo
          const statsResponse = await axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
          );

          const stats = statsResponse.data.response;

          if (!stats) {
            return {
              equipo: teamName,
              logo: teamLogo,
              goles: 0,
              tiros: 0,
              tirosAlArco: 0,
              pasesClave: 0,
              xG: 0,
              xA: 0,
              eficiencia: 0
            };
          }

          // Extraer datos de la API
          const goles = stats.goals?.for?.total?.total || 0;
          
          // Tiros totales y al arco
          const tirosAlArco = stats.shots?.on?.total || 0;
          const tirosFuera = stats.shots?.off?.total || 0;
          const tiros = tirosAlArco + tirosFuera;

          // Pases (usando pases totales como aproximación de pases clave)
          const pasesTotal = stats.passes?.total || 0;
          const pasesAccuracy = stats.passes?.accuracy ? parseInt(stats.passes.accuracy) : 0;
          const pasesClave = Math.round((pasesTotal * pasesAccuracy) / 10000); // Aproximación

          // Calcular xG (Expected Goals) - aproximación basada en tiros
          const xG = Number(((tirosAlArco * 0.15) + (tirosFuera * 0.05)).toFixed(2));

          // Calcular xA (Expected Assists) - aproximación basada en pases
          const xA = Number((pasesClave * 0.12).toFixed(2));

          // Eficiencia: goles reales vs goles esperados
          const eficiencia = xG > 0 ? Number((goles / xG).toFixed(2)) : 0;

          // Datos adicionales
          const posesion = stats.possession ? parseInt(stats.possession) : 0;
          const tarjetasAmarillas = stats.cards?.yellow?.total || 0;
          const tarjetasRojas = stats.cards?.red?.total || 0;
          const penaltisAnotados = stats.penalty?.scored?.total || 0;
          const penaltisFallados = stats.penalty?.missed?.total || 0;

          return {
            equipo: teamName,
            logo: teamLogo,
            goles,
            tiros,
            tirosAlArco,
            pasesClave,
            xG,
            xA,
            eficiencia,
            posesion,
            tarjetasAmarillas,
            tarjetasRojas,
            penaltisAnotados,
            penaltisFallados
          };

        } catch (err) {
          console.error(`Error obteniendo stats de ${teamName}:`, err.message);
          return {
            equipo: teamName,
            logo: teamLogo,
            goles: 0,
            tiros: 0,
            tirosAlArco: 0,
            pasesClave: 0,
            xG: 0,
            xA: 0,
            eficiencia: 0
          };
        }
      })
    );

    // Ordenar por goles de mayor a menor
    const tablaOrdenada = tabla.sort((a, b) => b.goles - a.goles);

    res.json({
      liga: leagueId,
      temporada: season,
      equipos: tablaOrdenada
    });

  } catch (error) {
    console.error("Error al obtener estadísticas avanzadas:", error.response?.data || error);
    res.status(500).json({ message: "Error al obtener estadísticas avanzadas" });
  }
};

module.exports = { getEstadisticasAvanzadas };
