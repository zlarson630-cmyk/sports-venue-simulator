const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("postgame report summarizes recorded favorites and complaints without invented responses",()=>{
  const g=game();
  const fans=[
    {paid:true,experienceTime:120,seatTime:100,sawScoreboard:true,sawStatue:true,scenicPauseDone:true,thoughts:[
      {message:"Great scoreboard view",impact:4},{message:"Too crowded to get around",impact:-5}]},
    {paid:true,experienceTime:120,seatTime:80,sawScoreboard:true,thoughts:[
      {message:"Great scoreboard view",impact:4}]}
  ];
  const report=g.api.buildPostgameReport(fans);
  assert.equal(report.experience.admitted,2);
  assert.ok(report.favorites.some(([name,count])=>name==="Watching from the seats"&&count===2));
  assert.ok(report.favorites.some(([name,count])=>name==="Scoreboard view"&&count===2));
  assert.deepEqual(Array.from(report.praise[0]),["Great scoreboard view",2]);
  assert.deepEqual(Array.from(report.complaints[0]),["Too crowded to get around",1]);
  assert.ok(report.experience.average>=0&&report.experience.average<=100);
});
test("empty postgame experiences never invent a favorite or complaint",()=>{
  const g=game();
  const report=g.api.buildPostgameReport([]);
  assert.equal(report.experience.average,0);
  assert.equal(report.praise.length,0);
  assert.equal(report.complaints.length,0);
  assert.equal(report.favorites.length,0);
});
