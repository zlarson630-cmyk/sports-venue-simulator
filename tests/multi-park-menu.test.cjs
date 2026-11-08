const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("main menu migrates the legacy park into a named save",()=>{
  const g=game();
  const parks=JSON.parse(g.storage.get("svs.parks.v1"));
  assert.equal(parks.length,1);
  assert.equal(parks[0].name,"Starter Ballpark");
  assert.equal(g.storage.get("svs.activePark.v1"),parks[0].id);
  assert.ok(g.storage.has("svs01"));
});

test("new park creates an isolated save slot without erasing the original",()=>{
  const g=game(null,()=>0.5,{prompt:()=>"Riverfront Field"});
  const first=JSON.parse(g.storage.get("svs.parks.v1"))[0];
  g.element("newPark").click();
  const parks=JSON.parse(g.storage.get("svs.parks.v1"));
  assert.equal(parks.length,2);
  assert.equal(parks[0].id,first.id);
  assert.equal(parks[1].name,"Riverfront Field");
  assert.equal(g.storage.get("svs.activePark.v1"),parks[1].id);
  assert.equal(parks[1].data.money,500000);
  assert.deepEqual(Object.keys(parks[1].data.tiles),[]);
});
