const assert = require('assert');
const { slugifyPublicName, mapSubscriberPublicView } = require('../utils/publicId');

function runPublicIdTests() {
  assert.strictEqual(slugifyPublicName('Brayan', 'Cortés'), 'BRAYAN-CORTES');
  assert.strictEqual(slugifyPublicName('  maría   lópez '), 'MARIA-LOPEZ');
  assert.strictEqual(slugifyPublicName('', ''), 'USUARIO');

  const mapped = mapSubscriberPublicView({
    _id: '507f1f77bcf86cd799439011',
    nombre: 'Ana',
    publicId: 'ANA-PEREZ-123',
    email: 'hidden@example.com',
  });

  assert.strictEqual(mapped.name, 'Ana');
  assert.strictEqual(mapped.publicId, 'ANA-PEREZ-123');
  assert.strictEqual(mapped.email, undefined);
  assert.strictEqual(mapped.id, undefined);

  console.log('publicId tests OK');
}

runPublicIdTests();
