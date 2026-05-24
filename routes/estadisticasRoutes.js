const express = require("express");
const { getEstadisticasEquipo } = require("../controllers/estadisticasController.js");

const router = express.Router();

router.get("/equipo/:id", getEstadisticasEquipo);

module.exports = router;
