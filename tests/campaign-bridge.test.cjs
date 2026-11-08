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
