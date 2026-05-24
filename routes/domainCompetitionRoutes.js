const express = require("express");
const {
  listClubCompetitions,
  listSelectionCompetitions,
  getClubCompetitionSeasons,
  getSelectionCompetitionSeasons,
  getClubFixtures,
  getSelectionFixtures,
  getMixedFixtures,
  getClubTeamProfile,
  getSelectionTeamProfile,
} = require("../controllers/domainCompetitionController");

const router = express.Router();

router.get("/clubes/competitions", listClubCompetitions);
router.get("/selecciones/competitions", listSelectionCompetitions);

router.get("/clubes/competitions/:competitionId/seasons", getClubCompetitionSeasons);
router.get("/selecciones/competitions/:competitionId/seasons", getSelectionCompetitionSeasons);

router.get("/clubes/fixtures", getClubFixtures);
router.get("/selecciones/fixtures", getSelectionFixtures);
router.get("/partidos", getMixedFixtures);

router.get("/clubes/teams/:teamId/profile", getClubTeamProfile);
router.get("/selecciones/teams/:teamId/profile", getSelectionTeamProfile);

module.exports = router;
