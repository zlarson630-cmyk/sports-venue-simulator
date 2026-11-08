const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("individual happiness considers seat time and is capped",()=>{
  const g=game();
  const fan={paid:true,experienceTime:100,seatTime:100,persona:"diehard",moodImpact:0};
  assert.ok(g.api.fanHappinessScore(fan)>g.api.fanHappinessScore({...fan,seatTime:0}));
  assert.equal(g.api.fanHappinessScore({...fan,moodImpact:1000}),100);
  assert.equal(g.api.fanHappinessScore({...fan,moodImpact:-1000}),0);
});
test("guest thoughts remember positive and negative experiences",()=>{
  const g=game();
  const fan={paid:true,experienceTime:30,seatTime:10,persona:"family",thoughts:[],moodImpact:0};
  const before=g.api.fanHappinessScore(fan);
  g.api.fanThought(fan,"Enjoyed the mascot",8,"entertainment");
  assert.equal(fan.thoughts.length,1);
  assert.equal(fan.thoughts[0].message,"Enjoyed the mascot");
  assert.ok(g.api.fanHappinessScore(fan)>before);
  g.api.fanThought(fan,"Too crowded",-10,"traffic");
  assert.equal(fan.thoughts.length,2);
  const report=g.api.venueExperienceReport([fan]);
  assert.equal(report.complaint[0],"Too crowded");
  assert.equal(report.praise[0],"Enjoyed the mascot");
});
test("entertainment hooks respond to different fan preferences",()=>{
  const g=game();
  const family={persona:"family",thoughts:[],moodImpact:0};
  const casual={persona:"casual",thoughts:[],moodImpact:0};
  assert.equal(g.api.applyEntertainment(family,"kidsGame"),true);
  assert.equal(g.api.applyEntertainment(casual,"kidsGame"),true);
  assert.ok(family.moodImpact>casual.moodImpact);
  assert.equal(g.api.applyEntertainment(family,"unknown"),false);
  assert.equal(g.api.fanFoodType({favoriteFood:"ice cream"}),"iceCream");
  assert.equal(g.api.fanFoodType({favoriteFood:"drinks"}),"drinks");
});
