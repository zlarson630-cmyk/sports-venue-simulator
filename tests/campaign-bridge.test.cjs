const test=require("node:test");const assert=require("node:assert/strict");const Park=require("../public/test/park-link.js");const Owner=require("../public/test/ownership.js");
test("seat proximity to concessions improves access score",()=>{
 const near=Park.analyze({tiles:{"0,0":{type:"stand"},"1,0":{type:"concession"}}});
 const far=Park.analyze({tiles:{"0,0":{type:"stand"},"20,0":{type:"concession"}}});
 assert.equal(near.capacity,20);assert.ok(near.accessScore>far.accessScore);
});
test("linked park layout influences concession revenue",()=>{
 const near=Park.apply(Owner.newCampaign(),{tiles:{"0,0":{type:"stand"},"1,0":{type:"concession"},"2,0":{type:"restroom"}}});
 const far=Park.apply(Owner.newCampaign(),{tiles:{"0,0":{type:"stand"},"20,0":{type:"concession"},"20,1":{type:"restroom"}}});
 const a=Owner.game(near,.5),b=Owner.game(far,.5);
 assert.ok(a.history[0].concessions>b.history[0].concessions);
});

test("more walkable space improves flow and concession sales",()=>{
 const make=(count)=>{const tiles={"0,0":{type:"stand"},"1,0":{type:"concession"}};for(let i=0;i<count;i++)tiles[i+",5"]={type:"path"};return Park.apply(Owner.newCampaign(),{tiles});};
 const tight=Owner.game(make(1),.5).history[0],wide=Owner.game(make(50),.5).history[0];
 assert.ok(wide.crowdFlow>tight.crowdFlow);
 assert.ok(wide.concessions>tight.concessions);
});

test("completed fan test adjusts reputation once without booking money",()=>{
 const park={tiles:{"0,0":{type:"stand"},"1,0":{type:"concession"}}};
 const storage={getItem:()=>JSON.stringify([{id:"test-park",name:"Test",data:park}])};
 const state=Park.link(Owner.newCampaign(),"test-park",storage);
 const report={parkId:"test-park",completed:true,recordedAt:12345,admissions:20,averageHappiness:95};
 const next=Owner.applyLiveExperience(state,report);
 assert.equal(next.cash,state.cash);assert.ok(next.fanRating>state.fanRating);
 assert.throws(()=>Owner.applyLiveExperience(next,report),/already applied/);
 assert.throws(()=>Owner.applyLiveExperience(state,{...report,parkId:"other"}),/linked park/);
});
