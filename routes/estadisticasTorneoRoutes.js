const express = require("express");
const { getEstadisticasTorneo } = require("../controllers/estadisticasTorneoController.js");

const router = express.Router();

router.get("/torneo", getEstadisticasTorneo);

module.exports = router;
