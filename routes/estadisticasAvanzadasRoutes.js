const express = require("express");
const { getEstadisticasAvanzadas } = require("../controllers/estadisticasAvanzadasController.js");

const router = express.Router();

router.get("/avanzadas", getEstadisticasAvanzadas);

module.exports = router;
