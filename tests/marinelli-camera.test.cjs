const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("Marinelli opens behind home plate toward center with correct baseline orientation",()=>{
 const g=game(undefined,()=>0.5,{marinelliTest:true});
 assert.equal(g.api.state().cameraRot,2);
 assert.equal(g.element("cameraRotation").textContent,"180°");
 const home=g.api.project(18,14),center=g.api.project(34.5,30.5);
 const first=g.api.project(28,15.5),third=g.api.project(19.5,24);
 assert.ok(center.y<home.y,"center field must be upscreen from home");
 assert.ok(first.x>home.x,"first base must be right of home");
 assert.ok(third.x<home.x,"third base must be left of home");
 const p=g.api.project(25.5,35.5);
 const picked=g.api.inverse(p.x,p.y);
 assert.equal(picked.x,25);assert.equal(picked.y,35);
});

test("ordinary sandbox keeps its original default camera",()=>{
 const g=game();
 assert.equal(g.api.state().cameraRot,0);
});
