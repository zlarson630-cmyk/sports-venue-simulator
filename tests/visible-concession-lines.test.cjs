const assert = require('node:assert/strict');
const {test} = require('node:test');
const {game} = require('./helpers/game.cjs');
const saved = require('./fixtures/hollow-stands-v043.json');

test('food customers queue visibly, pay, return to their seats, and exit', () => {
  const g = game({...saved, gameMinutes: 5}, () => 0.5, {record:false});
  g.api.startFanTest();
  const fans = g.api.fanState().fans;
  assert.equal(fans.length, 48);
  let sawLine = false;
  let sawService = false;
  for (let second = 0; second < 360 && g.api.fanState().fanActive; second++) {
    g.api.advanceFans(1);
    for (const fan of fans) {
      if (fan.activity === 'waiting for food') {
        assert.equal(fan.insideAmenity, false);
        assert.equal(fan.spawned, true);
        sawLine = true;
      }
      if (fan.activity === 'buying food') {
        assert.equal(fan.insideAmenity, false);
        sawService = true;
      }
    }
  }
  assert.ok(sawLine && sawService);
  assert.ok(fans.some(f => f.foodVisits > 0));
  assert.ok(fans.every(f => f.exited));
  assert.equal(g.api.fanState().fanActive, false);
});

test('a visible queued fan blocks a pedestrian until the space clears', () => {
  const g = game(undefined, () => 0.5, {record:false});
  const point = x => ({x, y:15, feet:0});
  const [walker, queued] = g.api.simulateTraffic([[point(9),point(11)],[point(10),point(10)]]);
  // Match the lane used by the moving pedestrian.
  queued.y = walker.y;
  queued.activity = 'waiting for food';
  g.api.advanceFans(1);
  assert.ok(walker.x < queued.x);
  assert.ok(g.api.fanDistance(walker,queued) >= g.api.FAN_SPACE-1e-8);
  queued.exited = true;
  g.api.advanceFans(1);
  assert.equal(walker.x, 11);
});
