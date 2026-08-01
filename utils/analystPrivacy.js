const User = require('../models/User');

function isSportsAnalystRole(role) {
  return role === 'analista';
}

function isRequesterAnalyst(req) {
  return isSportsAnalystRole(req.user?.role);
}

function forbidAnalystPrivateData(req, res) {
  if (!isRequesterAnalyst(req)) return false;
  res.status(403).json({
    success: false,
    code: 'analyst_forbidden',
    message: 'Los analistas no pueden acceder a datos privados de usuarios.',
  });
  return true;
}

function forbidAnalystViewingOtherAnalyst(req, res, analystId) {
  if (!isRequesterAnalyst(req)) return false;
  if (String(req.user.id) === String(analystId)) return false;

  res.status(403).json({
    success: false,
    code: 'analyst_forbidden',
    message: 'Los analistas no pueden acceder a datos de otros analistas.',
  });
  return true;
}

async function assertAnalystSelf(req, res, analystId) {
  if (String(req.user.id) !== String(analystId)) {
    res.status(403).json({
      success: false,
      code: 'analyst_forbidden',
      message: 'Solo el analista titular puede realizar esta acción.',
    });
    return false;
  }

  const user = await User.findById(req.user.id).select('role').lean();
  if (!user || !isSportsAnalystRole(user.role)) {
    res.status(403).json({
      success: false,
      code: 'analyst_forbidden',
      message: 'Acceso reservado a analistas deportivos.',
    });
    return false;
  }

  return true;
}

module.exports = {
  isSportsAnalystRole,
  isRequesterAnalyst,
  forbidAnalystPrivateData,
  forbidAnalystViewingOtherAnalyst,
  assertAnalystSelf,
};
