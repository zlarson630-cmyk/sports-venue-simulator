const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {game}=require("./helpers/game.cjs");
const fixture=()=>JSON.parse(fs.readFileSync(new URL("./fixtures/hollow-stands-v043.json",`file://${__filename}`),"utf8"));
function seatedGame(saved=fixture()){
 const g=game(saved,()=>0.5,{record:false});
 g.element("fanNeedsRate").value="0";g.element("fanNeedsRate").oninput();
 g.api.startFanTest();g.api.advanceFans(50);
 const crowd=g.api.fanState().fans;assert.ok(crowd.every(f=>f.seated));
 return {g,crowd};
}
test("returning amenity visitors do not block independent seating aisles",()=>{
 const saved=fixture();
 for(let x=13;x<=15;x++)saved.tiles[x+",7"]={type:"path",rot:0};
 saved.tiles["15,8"]={type:"stairStand",rot:0,baseFeet:0};
 saved.tiles["16,8"]={type:"stand",rot:0,baseFeet:0};
 const {g,crowd}=seatedGame(saved);
 const a=crowd.find(f=>f.sectionKey==="13,11"),b=crowd.find(f=>f.sectionKey==="16,8");
 assert.ok(a&&b);assert.ok(g.api.startAmenityTrip(a));
 for(let t=0;t<50&&a.activity!=="returning to seat";t++)g.api.advanceFans(0.5);
 assert.equal(a.activity,"returning to seat");
 assert.ok(g.api.startAmenityTrip(b),"a return in the other staircase must not close the whole stadium");
 g.api.advanceFans(30);
 assert.equal(a.bathroomVisits,1);assert.equal(b.bathroomVisits,1);
 assert.ok(a.seated&&b.seated);
});
test("middle seats can shuffle past seated neighbors and use a restroom at 75 percent",()=>{
 const {g,crowd}=seatedGame();
 crowd.forEach(f=>{f.bathroomNeed=0;f.hunger=0;});
 const fan=crowd.find(f=>f.sectionKey==="13,11"&&f.row===1&&f.col===2);
 const neighbors=crowd.filter(f=>f!==fan&&f.sectionKey===fan.sectionKey&&f.row===fan.row);
 fan.bathroomNeed=75;
 g.element("fanNeedsRate").value="0.25";g.element("fanNeedsRate").oninput();
 g.api.advanceFans(25);
 assert.equal(fan.bathroomVisits,1);assert.ok(fan.seated);
 assert.ok(neighbors.every(f=>f.seated));
 assert.ok(g.api.fanDistance(fan,fan.seatTarget)<1e-8);
});
test("inspector explains a full restroom instead of claiming its route is blocked",()=>{
 const {g,crowd}=seatedGame();const fan=crowd[0];
 assert.ok(g.api.startAmenityTrip(fan));fan.amenity.active=fan.amenity.capacity;
 const waiting=crowd.find(f=>f.seated);waiting.bathroomNeed=100;
 assert.equal(g.api.startAmenityTrip(waiting),false);
 g.element("fanNeedsRate").value="1";g.element("fanNeedsRate").oninput();
 g.element("fanPicker").onchange({target:{value:String(crowd.indexOf(waiting))}});
 assert.match(g.element("fanDetails").textContent,/waiting for space at a restroom/);
});
