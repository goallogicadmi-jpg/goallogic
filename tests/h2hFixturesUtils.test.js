const assert = require('assert');
const {
  sortH2HFixturesByDateDesc,
  selectRecentH2HFixtures,
  buildH2HDisplayData,
  MAX_H2H_FIXTURES_VISIBLE,
} = require('../frontend/src/utils/h2hFixturesUtils.js');

function fixture(id, date) {
  return { fixture: { id, date }, teams: { home: { id: 1 }, away: { id: 2 } } };
}

function testSortDesc() {
  const fixtures = [
    fixture(1, '2020-01-01T00:00:00Z'),
    fixture(2, '2024-06-15T00:00:00Z'),
    fixture(3, '2022-03-10T00:00:00Z'),
  ];
  const sorted = sortH2HFixturesByDateDesc(fixtures);
  assert.strictEqual(sorted[0].fixture.id, 2);
  assert.strictEqual(sorted[1].fixture.id, 3);
  assert.strictEqual(sorted[2].fixture.id, 1);
}

function testSelectRecentFour() {
  const fixtures = Array.from({ length: 8 }, (_, i) =>
    fixture(i + 1, `2024-0${(i % 9) + 1}-01T00:00:00Z`)
  );
  fixtures.push(fixture(99, '2015-01-01T00:00:00Z'));

  const recent = selectRecentH2HFixtures(fixtures, 4);
  assert.strictEqual(recent.length, 4);
  assert.ok(!recent.some((f) => f.fixture.id === 99), 'no debe incluir partido muy antiguo si hay recientes');
  for (let i = 0; i < recent.length - 1; i++) {
    assert.ok(
      Date.parse(recent[i].fixture.date) >= Date.parse(recent[i + 1].fixture.date),
      'debe estar ordenado de más reciente a más antiguo'
    );
  }
}

function testBuildDisplayData() {
  const raw = [
    fixture(1, '2023-01-01T00:00:00Z'),
    fixture(2, '2024-01-01T00:00:00Z'),
  ];
  const data = buildH2HDisplayData(raw);
  assert.strictEqual(data.totalPartidos, 2);
  assert.strictEqual(data.partidosDetallados.length, 2);
  assert.strictEqual(data.partidosDetallados[0].fixtureId, 2);
  assert.strictEqual(MAX_H2H_FIXTURES_VISIBLE, 4);
}

testSortDesc();
testSelectRecentFour();
testBuildDisplayData();
console.log('✅ h2hFixturesUtils tests passed');
