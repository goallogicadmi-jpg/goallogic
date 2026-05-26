const express = require('express');
const { getPublicSettings } = require('../utils/systemSettingsService');

const router = express.Router();

router.get('/public', (req, res) => {
  res.json({
    success: true,
    data: getPublicSettings(),
  });
});

module.exports = router;
