const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {game}=require("./helpers/game.cjs");

test("the entry page advertises the real release and contains the park menu",()=>{
  const page=fs.readFileSync(new URL("../public/index.html",`file://${__filename}`),"utf8");
  const pkg=require("../package.json");
  assert.equal(pkg.version,"0.49.0");
  assert.match(page,/BUILD|GAME DAY BUILD/);
  assert.match(page,/v0\.49/);
  for(const id of ["openParkMenu","parkMenu","parkSaveList","newPark","closeParkMenu","openGuestList"])assert.match(page,new RegExp('id="'+id+'"'));
  assert.match(page,/game\.js\?v=0\.49/);
  assert.match(page,/styles\.css\?v=0\.49/);
});

test("startup menu creates an isolated starter save without losing the legacy backup",()=>{
  const g=game();
  const records=JSON.parse(g.storage.get("svs.parks.v1"));
  assert.equal(records.length,1);
  assert.equal(records[0].name,"Starter Ballpark");
  assert.ok(g.storage.get("svs01"));
  assert.equal(g.storage.get("svs.activePark.v1"),records[0].id);
  assert.equal(g.element("parkMenu").hidden,false);
  assert.equal(g.element("parkSaveList").children.length,1);
  g.element("closeParkMenu").click();
  assert.equal(g.element("parkMenu").hidden,true);
  g.element("openParkMenu").click();
  assert.equal(g.element("parkMenu").hidden,false);
});

test("new ballparks use separate save slots and preserve existing money and construction",()=>{
  const saved={version:2,fieldRevision:7,entranceRevision:1,seatingRevision:2,wallFinishRevision:1,
    gameMinutes:5,requestedFans:100,tiles:{"17,9":{type:"path",rot:0}},edges:{},infillDecks:{},underlays:{},
    groundConcrete:{},money:321500,team:{primary:"#31566b",secondary:"#edc75b",accent:"#fff0c9",fenceMaterial:"green"}};
  const g=game(saved,()=>0.5,{prompt:()=>"Riverfront Field"});
  const before=JSON.parse(g.storage.get("svs.parks.v1"))[0];
  assert.equal(before.name,"My Original Ballpark");
  assert.ok(before.data.tiles["17,9"]);
  g.element("newPark").click();
  const records=JSON.parse(g.storage.get("svs.parks.v1"));
  assert.equal(records.length,2);
  assert.equal(records[0].id,before.id);
  assert.ok(records[0].data.tiles["17,9"]);
  assert.equal(records[0].data.money,321500);
  assert.equal(records[1].name,"Riverfront Field");
  assert.deepEqual(Object.keys(records[1].data.tiles),[]);
  assert.equal(records[1].data.money,500000);
  assert.equal(g.storage.get("svs.activePark.v1"),records[1].id);
});

test("Marinelli test renders its scenery and autosaves without touching main storage",()=>{
  const original={version:2,fieldRevision:7,tiles:{},money:321500};
  const g=game(original,()=>0.5,{marinelliTest:true});
  assert.ok(g.commands.some(command=>command[0]==="style"&&command[2]==="#538793"));
  assert.equal(g.storage.get("svs01"),JSON.stringify(original));
  assert.equal(g.storage.has("svs.parks.v1"),false);
  assert.equal(g.storage.has("svs.activePark.v1"),false);
  const records=JSON.parse(g.storage.get("marinelli.test.svs.parks.v1"));
  assert.equal(records[0].data.money,500000);
  g.element("closeParkMenu").click();
  g.clickTile(17,9);
  const updated=JSON.parse(g.storage.get("marinelli.test.svs.parks.v1"));
  assert.equal(updated[0].data.tiles["17,9"].type,"path");
  assert.equal(g.storage.get("svs01"),JSON.stringify(original));
});
