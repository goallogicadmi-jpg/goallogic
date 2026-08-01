import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTemplateVariables } from '../utils/messageAdminHelpers.js';

test('applyTemplateVariables replaces welcome variables', () => {
  const user = {
    nombre: 'Ana',
    email: 'ana@example.com',
    trialEndsAt: new Date('2026-06-06T12:00:00Z'),
    plan: 'trial',
  };

  const titulo = applyTemplateVariables('Hola {{name}} ({{email}})', user);
  const contenido = applyTemplateVariables(
    'Tu plan {{plan}} termina el {{trialEndsAt}}. Duración: {{trialDays}} días.',
    user
  );

  assert.equal(titulo, 'Hola Ana (ana@example.com)');
  assert.match(contenido, /Tu plan Prueba gratuita termina el/);
  assert.match(contenido, /Duración: 5 días\./);
});

test('applyTemplateVariables replaces premium variables', () => {
  const user = {
    nombre: 'Luis',
    email: 'luis@example.com',
    premium_since: new Date('2026-05-01T12:00:00Z'),
    plan: 'pro',
  };

  const contenido = applyTemplateVariables(
    'Hola {{name}}, PRO desde {{premium_since}} ({{plan}}).',
    user
  );

  assert.match(contenido, /Hola Luis, PRO desde/);
  assert.match(contenido, /\(PRO\)\./);
});
