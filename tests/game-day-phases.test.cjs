const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");
test("pregame occupies first 20 percent and innings evenly fill the rest",()=>{
  const g=game();
  const phase=g.api.gameDayStage;
  assert.equal(phase(0,300).label,"PREGAME");
  assert.equal(phase(59.9,300).label,"PREGAME");
  assert.equal(phase(60,300).label,"INNING 1");
  assert.equal(phase(60+240/9,300).label,"INNING 2");
  assert.equal(phase(299.9,300).label,"INNING 9");
  assert.equal(phase(300,300).label,"FINAL");
});
test("phase timing scales to two minute events",()=>{
  const g=game();
  const phase=g.api.gameDayStage;
  assert.equal(phase(23.9,120).kind,"pregame");
  assert.equal(phase(24,120).inning,1);
  assert.equal(phase(120,120).kind,"final");
});

test("game day has an actual overlay and clear phase announcements",()=>{
  const fs=require("node:fs");
  const html=fs.readFileSync(new URL("../public/index.html",`file://${__filename}`),"utf8");
  assert.match(html,/id="stadiumGameClock"/);
  assert.match(html,/id="stadiumInnings"/);
  assert.match(html,/id="stadiumSeated"/);
  const g=game();
  assert.equal(g.api.stadiumBanner({kind:"inning",inning:1,label:"INNING 1"}),"FIRST PITCH");
  assert.equal(g.api.stadiumBanner({kind:"pregame",label:"PREGAME"}),"PREGAME FESTIVITIES");
  g.api.updateGameDayDisplay();
  assert.equal(g.element("stadiumPhase").textContent,"READY");
  assert.equal(g.element("stadiumClock").textContent,"5:00");
});
