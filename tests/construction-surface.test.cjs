const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');

const source = readFileSync(join(__dirname, '../public/game.js'), 'utf8');
function game() {
  const nodes = new Map();
  const ctx = new Proxy({}, {get: () => () => {}});
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        getContext: () => ctx, addEventListener() {},
        classList: {add() {}, remove() {}},
      });
      return nodes.get(id);
    },
    querySelectorAll: () => [],
  };
  const sandbox = {
    document, window: {addEventListener() {}},
    ResizeObserver: class {observe() {}},
    localStorage: new Map(), setTimeout() {}, clearTimeout() {},
  };
  sandbox.localStorage.setItem = sandbox.localStorage.set.bind(sandbox.localStorage);
  runInNewContext(source.replace('  try {\n    const raw = localStorage.getItem("svs01");', `
    globalThis.game = {
      click(type, x, y, height = "auto", foundation = "auto", underneath = false) {
        tool = type; hover = {x,y}; placementHeight = height;
        foundationChoice = foundation; workUnder = underneath;
        drawOverlays();
        const preview = document.getElementById("standHelp").textContent;
        action();
        return preview;
      },
      snapshot, groundItem, validatePark,
      undo: document.getElementById("undo").onclick,
    };
    draw = () => {};
    return;
    try {
    const raw = localStorage.getItem("svs01");`), sandbox);
  return sandbox.game;
}

test('concrete under an amenity preserves the amenity and does not create a walkway', () => {
  const g = game();
  g.click('concession', 12, 10);
  assert.equal(g.snapshot().tiles['12,10'].type, 'concession');
  const before = g.snapshot().money;
  assert.match(g.click('path', 12, 10), /existing construction is kept/);
  const park = g.snapshot();
  assert.equal(park.money, before - 100);
  assert.equal(park.tiles['12,10'].type, 'concession');
  assert.equal(park.groundConcrete['12,10'], true);
  assert.equal(g.groundItem(12, 10), null);
  const loaded = g.validatePark({version:2, fieldRevision:7, entranceRevision:1, ...park});
  assert.equal(loaded.groundConcrete['12,10'], true);
  g.undo();
  assert.equal(g.snapshot().groundConcrete['12,10'], undefined);
  assert.equal(g.snapshot().money, before);
});

for (const type of ['stand', 'concourse']) {
  test(`${type} preview and placement agree above an amenity`, () => {
    const g = game();
    g.click('concession', 12, 10);
    const before = g.snapshot().money;
    assert.match(g.click(type, 12, 10, type === 'stand' ? '5' : '10'), /Not enough open space/);
    assert.equal(g.snapshot().money, before);
    assert.match(g.click(type, 12, 10, '15', 'solid'), /Not enough open space/);
    assert.equal(g.snapshot().tiles['12,10'].type, 'concession');
    assert.doesNotMatch(g.click(type, 12, 10, type === 'stand' ? '10' : '15'), /Not enough open space|occupied/);
    assert.equal(g.snapshot().tiles['12,10'].type, type);
    assert.equal(g.snapshot().underlays['12,10'].type, 'concession');
  });
}

test('ground concrete respects the field and normal paving remains walkable', () => {
  const g = game();
  const before = g.snapshot().money;
  assert.match(g.click('path', 20, 20), /playing field/);
  assert.equal(g.snapshot().money, before);
  g.click('path', 12, 10);
  assert.equal(g.groundItem(12, 10).type, 'path');
});
