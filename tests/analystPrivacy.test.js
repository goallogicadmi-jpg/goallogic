const assert = require('assert');
const {
  isSportsAnalystRole,
  forbidAnalystPrivateData,
  forbidAnalystViewingOtherAnalyst,
} = require('../utils/analystPrivacy');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runAnalystPrivacyTests() {
  const analystReq = { user: { id: 'a1', role: 'analista' } };
  const userReq = { user: { id: 'u1', role: 'usuario' } };

  assert.strictEqual(isSportsAnalystRole('analista'), true);
  assert.strictEqual(isSportsAnalystRole('usuario'), false);

  const blockedRes = mockRes();
  assert.strictEqual(forbidAnalystPrivateData(analystReq, blockedRes), true);
  assert.strictEqual(blockedRes.statusCode, 403);
  assert.strictEqual(blockedRes.body.code, 'analyst_forbidden');

  const allowedRes = mockRes();
  assert.strictEqual(forbidAnalystPrivateData(userReq, allowedRes), false);

  const otherAnalystRes = mockRes();
  assert.strictEqual(
    forbidAnalystViewingOtherAnalyst(analystReq, otherAnalystRes, 'a2'),
    true
  );
  assert.strictEqual(otherAnalystRes.statusCode, 403);

  const selfRes = mockRes();
  assert.strictEqual(forbidAnalystViewingOtherAnalyst(analystReq, selfRes, 'a1'), false);

  console.log('analystPrivacy tests OK');
}

runAnalystPrivacyTests();
