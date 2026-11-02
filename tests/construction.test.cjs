const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync(
  new URL("../public/game.js", `file://${__filename}`),
  "utf8",
);

// Exercise the actual game and its event handlers without a browser dependency.
// Canvas commands are recorded so tests can check world geometry, not just counters.
function game(saved, random=()=>0.5) {
  const commands = [],
    elements = new Map(),
    storage = new Map(saved ? [["svs01", JSON.stringify(saved)]] : []);
  const ctx = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...args) => {
          // A cleared canvas begins a new frame. Keep that frame for assertions,
          // rather than retaining every prior frame across crowd simulations.
          if(name==="clearRect")commands.length=0;
          commands.push([name, ...args]);
        },
      set: (_,name,value) => {commands.push(["style",name,value]);return true;},
    },
  );
  function element(id) {
    if (!elements.has(id))
      elements.set(id, {
        id,
        clientWidth: 1100,
        clientHeight: 800,
        textContent: "",
        listeners: {},
        classList: { add() {}, remove() {}, toggle() {} },
        getContext: () => ctx,
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        focus() {},
        setPointerCapture() {},
        addEventListener(name, fn) {
          this.listeners[name] = fn;
        },
        click() {
          this.onclick?.();
        },
        files: [],
      });
    return elements.get(id);
  }
  const toolButtons = [
    "inspect",
    "path",
    "halfPath",
    "concourse",
    "bleacher",
    "stand",
    "stairStand", "halfConcourse", "cornerStandLeft", "cornerStandRight", "backstopCornerFirst", "backstopCornerThird", "stairs", "ramp", "cornerLanding", "backstopStand", "backstopStair",
    "endStairLeft",
    "endStairRight",
    "wall",
    "gate",
    "concession",
    "restroom", "drinks", "iceCream", "souvenir", "basicScoreboard", "deluxeScoreboard", "videoScoreboard", "vintageScoreboard",
    "erase",
  ].map((t) => {
    const button = element("tool-" + t);
    button.dataset = { tool: t };
    return button;
  });
  const keys = {};
  const context = {
    console,
    Math: Object.assign(Object.create(Math),{random}),
    JSON,
    Number,
    Object,
    Set,
    Map,
    Array,
    Blob,
    URL,
    devicePixelRatio: 1,
    document: {
      getElementById: element,
      querySelectorAll: () => toolButtons,
      createElement: () => ({ click() {} }),
    },
    window: { addEventListener: (key, fn) => (keys[key] = fn) },
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    confirm: () => true,
    ResizeObserver: class {
      observe() {}
    },
    setTimeout: () => 1,
    clearTimeout() {},
  };
  vm.createContext(context);
  vm.runInContext(
    source.replace(
      /update\(\);\s*resize\(\);\s*\}\)\(\);\s*$/,
      "globalThis.inspect={delayArrivals:seconds=>fans.forEach(f=>f.start+=seconds),prepareRestrooms,restroomTrip,updateFanPanel,centerFieldLine,insideStadium,polygonsOverlap,drawFieldFence,sharedSegment,surfaceSeams,walkingSurfaces,stairEnds,infillPlacement,clipFaceDepth,occlusionCuts,captureFace,drawVisibleFan,simulateTraffic:routes=>{fanActive=true;fanPhase=\"game\";fanElapsed=0;departureElapsed=0;fans=routes.map((r,i)=>({route:laneRoute(r),index:0,...r[0],start:0,spawned:true,seated:false,exited:false,paid:true,standSeat:false,gateIndex:0,exitStart:0}));return fans;},rowSeats,standShift,fenceSnap,drawStairApron,stairRearConnected,cornerRowSpan,cornerSeatPoint,accessReport,validAccessPiece,connectLegacyGate,groundItem,automaticPath,laneRoute,TRAFFIC_LANE,cornerPoint,cornerPorts,cornerCols,rowNeighbor,deckShape,deckCenter,deckOpening,deckRailSegments,pointInPolygon,buildCornerDemo,drawPartialDeck,drawNeighborhood,buildBackstopDemo,parkingLot,parkingSpawn,neighborhood,streetLamps,colors,partySeatPlan,footprint,footprintError,overlaps,stairEntrance,drawConcourse,buildDiagonalDemo,halfContains,entrancePavedAt,entrancePaving,halfCorners,pathPoint,pathOpens,buildConcourseDemo,concoursePlacement,concourseConnection,buildSideEntryDemo,standPlacement,standPoint,standAxes,drawStandRow,seatCapacity,project,inverse,diamond,drawObject,approachRoute,solidBuildingAt,defensivePlayers,draw,PAVEMENT,buildStandDemo,reachableSeats,startFanTest,advanceFans,buildFanDemo,arrivalSchedule,FAN_SPACE,fanDistance,fanState:()=>({fans,fanActive,fanElapsed,fanPhase,departureElapsed}),roadsideTrees,siteTemplate,stadiumBoundary,outerFence,mainGate,dugouts,drawDugout,warningTrack,warningTrackWidth,fieldFence,homeWorld,basesWorld,fenceCorners,wallEdge,edgePanel,validatePark,state:()=>({tiles,edges,infillDecks,money,rot,cameraRot,team,zoom}),setHover:(x,y)=>{hover={x,y}},action};update();resize();})();",
    ),
    context,
  );
  const api = context.inspect;
  return {
    api,
    commands,
    storage,
    element,
    clickTile(x, y, button = 0) {
      const p = api.project(x + 0.5, y + 0.5),
        canvas = element("game");
      const e = { clientX: p.x, clientY: p.y, button, pointerId: 1 };
      canvas.listeners.pointerdown(e);
      canvas.listeners.pointerup(e);
    },
    select(t) {
      element("tool-" + t).click();
    },
    key(key) {
      keys.keydown({ key, target: { tagName: "CANVAS" } });
    },
  };
}
test("projection round trips across four camera angles and map edges", () => {
  const g = game();
  for (let angle = 0; angle < 4; angle++) {
    for (const [x, y] of [
      [0, 0],
      [59, 59],
      [0, 59],
      [59, 0],
      [16, 12],
      [35, 22],
    ]) {
      const p = g.api.project(x + 0.5, y + 0.5),
        tile = g.api.inverse(p.x, p.y);
      assert.equal(tile.x, x);
      assert.equal(tile.y, y);
    }
    g.key("q");
  }
  assert.equal(g.api.state().cameraRot, 0);
});
test("all tile corners rotate with the camera and share edges", () => {
  const g = game();
  for (let camera = 0; camera < 4; camera++) {
    g.commands.length = 0;
    g.api.diamond(10.5, 10.5, "green", "black");
    const pts = g.commands
      .filter((c) => c[0] === "moveTo" || c[0] === "lineTo")
      .map((c) => c.slice(1));
    const expected = [
      [10, 10],
      [11, 10],
      [11, 11],
      [10, 11],
    ].map(([x, y]) => {
      const p = g.api.project(x, y);
      return [p.x, p.y];
    });
    assert.deepEqual(pts, expected);
    g.key("q");
  }
});
test("click placement, occupied tiles, field protection, undo and reload", () => {
  const g = game();
  g.clickTile(12, 12);
  assert.equal(g.api.state().tiles["12,12"].type, "path");
  assert.equal(g.api.state().money, 499900);
  g.clickTile(12, 12);
  g.clickTile(20, 20);
  assert.equal(Object.keys(g.api.state().tiles).length, 1);
  const reload = game(JSON.parse(g.storage.get("svs01")));
  assert.equal(reload.api.state().tiles["12,12"].type, "path");
  g.element("undo").click();
  assert.equal(g.api.state().money, 500000);
  assert.equal(Object.keys(g.api.state().tiles).length, 0);
});
test("click placement selects the same world tile after camera rotation", () => {
  const g = game();
  for (let i = 0; i < 4; i++) {
    g.key("q");
    g.clickTile(12 + i, 5);
    assert.ok(g.api.state().tiles[`${12 + i},5`]);
  }
  assert.equal(g.api.state().money, 499600);
});
test("wall endpoints follow all four tile boundaries at every camera angle", () => {
  const g=game();
  const expected=[[[10,10],[11,10]],[[11,10],[11,11]],[[10,11],[11,11]],[[10,10],[10,11]]];
  for(let camera=0;camera<4;camera++) {
    [0,2,4,6].forEach((rot,i)=>{
      g.commands.length=0;
      g.api.drawObject(10,10,{type:"wall",rot});
      const actual=g.commands.filter(c=>c[0]==="moveTo" || c[0]==="lineTo");
      expected[i].forEach(([x,y],j)=>{
        const p=g.api.project(x,y); assert.deepEqual(actual[j].slice(1),[p.x,p.y]);
      });
    });
    g.key("q");
  }
  assert.equal(g.api.wallEdge(10,10,2),g.api.wallEdge(11,10,6));
  assert.equal(g.api.wallEdge(10,10,4),g.api.wallEdge(10,11,0));
});
test("all directional items change geometry when rotated", () => {
  const g = game();
  for (const type of ["bleacher", "gate", "concession", "restroom"]) {
    g.commands.length = 0;
    g.api.drawObject(10, 10, { type, rot: 0 });
    const initial = JSON.stringify(g.commands);
    g.commands.length = 0;
    g.api.drawObject(10, 10, { type, rot: 1 });
    assert.notEqual(JSON.stringify(g.commands), initial, type);
  }
  for (let i = 0; i < 8; i++) g.key("r");
  assert.equal(g.api.state().rot, 0);
});
test("park import rejects corrupt, out of bounds and playing field construction", () => {
  const g = game();
  for (const bad of [
    { money: -1, tiles: {} },
    { money: 100, tiles: { "60,0": { type: "wall", rot: 0 } } },
    { money: 100, tiles: { "20,20": { type: "path", rot: 0 } } },
    { money: 100, tiles: { "1,1": { type: "bad", rot: 0 } } },
    { money: 100, tiles: { "1,1": { type: "path", rot: 9 } } },
  ])
    assert.throws(() => g.api.validatePark(bad));
});
test("dragging and right-clicking do not build", () => {
  const g = game(),
    canvas = g.element("game");
  canvas.listeners.pointerdown({
    clientX: 500,
    clientY: 400,
    button: 0,
    pointerId: 1,
  });
  canvas.listeners.pointermove({ clientX: 530, clientY: 430 });
  canvas.listeners.pointerup({ clientX: 530, clientY: 430, button: 0 });
  g.clickTile(12, 12, 2);
  assert.equal(Object.keys(g.api.state().tiles).length, 0);
});

test("wall tool placement, rotate buttons, refunds and funds checks", () => {
  const g = game();
  g.select("wall");
  g.element("rotate").click();
  g.clickTile(12, 12);
  assert.equal(g.api.state().edges["13,12:v"].type, "wall");
  assert.ok(g.api.state().edges["13,12:v"]);
  assert.equal(g.api.state().money, 499800);
  g.select("erase");
  g.clickTile(12, 12);
  assert.equal(g.api.state().money, 499940);
  g.element("undo").click();
  assert.ok(g.api.state().edges["13,12:v"]);
  const poor = game({ tiles: {}, money: 100 });
  poor.select("wall");
  poor.clickTile(12, 12);
  assert.equal(Object.keys(poor.api.state().edges).length, 0);
  assert.equal(poor.api.state().money, 100);
});

test("field fence has two dugout openings and stays grid aligned, and uses the two required heights", () => {
  const panels = game().api.fieldFence;
  assert.ok(panels.some(p => p.feet === 3));
  assert.ok(panels.some(p => p.feet === 8));
  panels.forEach((p, i) => {
    const next=panels[(i+1)%panels.length];
    const gap=Math.hypot(p.b[0]-next.a[0],p.b[1]-next.a[1]);
    assert.ok(gap===0||gap===1);
    const dx = Math.abs(p.b[0] - p.a[0]), dy = Math.abs(p.b[1] - p.a[1]);
    assert.ok(dx === 0 || dy === 0 || Math.abs(dx-dy)<1e-10, "Fence follows edges or corner-to-corner diagonals");
    for (const coord of [...p.a, ...p.b]) assert.ok(Number.isFinite(coord));
    const foul = (p.a[0]+p.b[0])/2 < 18 || (p.a[1]+p.b[1])/2 < 14;
    assert.equal(p.feet, foul ? 3 : 8);
  });
});

test("edge walls coexist with paths, reject shared-edge duplicates and survive save/undo",()=>{
  const g=game(); g.select("wall"); g.clickTile(12,12);
  g.select("path"); g.clickTile(12,12);
  assert.ok(g.api.state().tiles["12,12"]); assert.ok(g.api.state().edges["12,12:h"]);
  g.select("wall"); g.key("r"); g.key("r"); g.clickTile(12,11);
  assert.equal(g.api.state().money,499700);
  const reload=game(JSON.parse(g.storage.get("svs01")));
  assert.ok(reload.api.state().edges["12,12:h"]); assert.ok(reload.api.state().tiles["12,12"]);
  g.element("undo").click(); assert.equal(g.api.state().money,499800);
  assert.ok(g.api.state().edges["12,12:h"]); assert.equal(Object.keys(g.api.state().tiles).length,0);
});
test("old tile walls migrate onto edges without losing the park",()=>{
  const g=game({money:98000,tiles:{"12,12":{type:"wall",rot:1},"11,11":{type:"bleacher",rot:3}}});
  assert.ok(g.api.state().edges["12,12:a"]);
  assert.equal(g.api.state().tiles["12,12"],undefined);
  assert.equal(g.api.state().tiles["11,11"].rot,3);
  assert.equal(g.api.state().money,98000);
  for(const edge of ["60,0:h","0,60:v","20,20:h","bad"])
    assert.throws(()=>g.api.validatePark({money:100,tiles:{},edges:{[edge]:{type:"wall"}}}));
});

test("both wall diagonals join grid corners and persist through save, removal and undo",()=>{
  const g=game(); g.select("wall");
  for(let i=0;i<4;i++) g.key("r");
  g.clickTile(12,12); assert.ok(g.api.state().edges["12,12:a"]);
  g.select("path"); g.clickTile(12,12); assert.equal(g.api.state().tiles["12,12"],undefined);
  g.select("wall"); g.key("r"); g.clickTile(14,12); assert.ok(g.api.state().edges["14,12:d"]);
  const reload=game(JSON.parse(g.storage.get("svs01")));
  assert.ok(reload.api.state().edges["12,12:a"]); assert.ok(reload.api.state().edges["14,12:d"]);
  g.select("erase"); g.clickTile(14,12); assert.equal(g.api.state().edges["14,12:d"],undefined);
  g.element("undo").click(); assert.ok(g.api.state().edges["14,12:d"]);
  for(let camera=0;camera<4;camera++) {
    for(const [rot,points] of [[1,[[10,11],[11,10]]],[5,[[10,10],[11,11]]]]) {
      g.commands.length=0; g.api.drawObject(10,10,{type:"wall",rot});
      const lines=g.commands.filter(c=>c[0]==="moveTo"||c[0]==="lineTo");
      points.forEach(([x,y],i)=>{const p=g.api.project(x,y);assert.deepEqual(lines[i].slice(1),[p.x,p.y]);});
    }
    g.key("q");
  }
});

test("basepaths measure 90 feet and the outfield reaches 300 feet down the lines",()=>{
  const g=game(), bases=g.api.basesWorld;
  for(let i=0;i<4;i++) {
    const a=bases[i],b=bases[(i+1)%4];
    assert.equal(Math.hypot(b[0]-a[0],b[1]-a[1])*10,90);
  }
  const [hx,hy]=g.api.homeWorld;
  const fair=g.api.fieldFence.filter(p=>(p.a[0]+p.b[0])/2>=hx && (p.a[1]+p.b[1])/2>=hy);
  for(const p of fair) {
    const [ax,ay]=p.a,[bx,by]=p.b, dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((hx-ax)*dx+(hy-ay)*dy)/(dx*dx+dy*dy)));
    assert.ok(Math.hypot(ax+t*dx-hx,ay+t*dy-hy)*10>=300-1e-9);
  }
  assert.ok(fair.some(p=>p.a[0]===hx+30&&p.a[1]===hy));
  assert.ok(fair.some(p=>[p.a,p.b].some(v=>v[0]===hx&&v[1]===hy+30)));
});
test("larger-field migration refunds only overlaps and preserves remaining park",()=>{
  const g=game({version:2,money:97000,tiles:{"36,32":{type:"bleacher",rot:0},"12,12":{type:"path",rot:0}},edges:{"30,30:h":{type:"wall"},"12,12:h":{type:"wall"}}});
  assert.equal(g.api.state().money,98700);
  assert.ok(g.api.state().tiles["12,12"]);assert.ok(g.api.state().edges["12,12:h"]);
  assert.equal(g.api.state().tiles["36,32"],undefined);assert.equal(g.api.state().edges["30,30:h"],undefined);
  const reload=game(JSON.parse(g.storage.get("svs01")));assert.equal(reload.api.state().money,98700);
});

test("warning track is 15 feet wide at straight and diagonal outfield fences",()=>{
  const g=game(), t=g.api.warningTrack;
  assert.equal(g.api.warningTrackWidth*10,15);
  assert.equal((t[0][0]-t[7][0])*10,15);
  assert.equal((t[3][1]-t[4][1])*10,15);
  const outer=t[1][0]+t[1][1],inner=t[6][0]+t[6][1];
  assert.ok(Math.abs((outer-inner)/Math.SQRT2*10-15)<1e-9);
});
test("backstop follows a 45-degree diagonal behind home plate",()=>{
  const g=game(), [a,b]=g.api.fenceCorners, [hx,hy]=g.api.homeWorld;
  assert.equal(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
  assert.ok(a[0]+a[1]<hx+hy);
  const low=g.api.fieldFence.filter(p=>p.a[0]+p.a[1]===28&&p.b[0]+p.b[1]===28);
  assert.equal(low.length,4); assert.ok(low.every(p=>p.feet===3));
});

test("v0.7 layouts refund newly expanded foul-territory overlaps only",()=>{
 const g=game({version:2,fieldRevision:2,money:98400,tiles:{"15,16":{type:"bleacher",rot:2},"12,12":{type:"path",rot:0}},edges:{}});
 assert.equal(g.api.state().money,99900); assert.ok(g.api.state().tiles["12,12"]);
 assert.equal(g.api.state().tiles["15,16"],undefined);
 const again=game(JSON.parse(g.storage.get("svs01")));assert.equal(again.api.state().money,99900);
});

test("both dugouts are 30 feet long, sunken, and render through camera rotation",()=>{
 const g=game(), ds=g.api.dugouts;
 assert.equal(ds.length,2);assert.notEqual(ds[0].swap,ds[1].swap);
 for(const d of ds) {assert.equal(d.length*10,30);assert.ok(d.depthFeet>0);}
 for(let camera=0;camera<4;camera++) {
  for(const d of ds) {g.commands.length=0;g.api.drawDugout(d);assert.ok(g.commands.filter(c=>c[0]==="fill").length>=9);}
  g.key("q");
 }
});

test("dugouts sit outside the fence with aligned player entrances",()=>{
 const g=game(), ds=g.api.dugouts;
 assert.ok(ds[0].y+ds[0].width<=10);
 assert.ok(ds[1].x+ds[1].width<=14);
 const gaps=g.api.fieldFence.filter((p,i)=>{
  const n=g.api.fieldFence[(i+1)%g.api.fieldFence.length];return p.b[0]!==n.a[0]||p.b[1]!==n.a[1];
 });assert.equal(gaps.length,2);
 g.select("path");g.clickTile(22,9);g.clickTile(13,18);
 assert.equal(Object.keys(g.api.state().tiles).length,0);
});

test("stadium perimeter has one main gate behind home plate",()=>{
 const g=game(),f=g.api.outerFence;
 const gaps=f.filter((p,i)=>{const n=f[(i+1)%f.length];return p.b[0]!==n.a[0]||p.b[1]!==n.a[1];});
 assert.equal(gaps.length,1);assert.ok(f.every(p=>p.feet===6));
 const m=g.api.mainGate;
 assert.equal(m.a[0]+m.a[1],13);assert.equal(m.b[0]+m.b[1],13);
 assert.equal((m.a[0]+m.b[0])/2-(m.a[1]+m.b[1])/2,4);
 assert.ok(m.intersection[0]+m.intersection[1]<23);
});

test("Small Stadium roads form four intersections with extensions and fading ends",()=>{
 const t=game().api.siteTemplate;
 assert.equal(t.roadLayout,"hashtag");assert.equal(t.roads.length,4);
 const xs=t.roads.filter(r=>r.axis==="x"),ys=t.roads.filter(r=>r.axis==="y");
 assert.equal(xs.length,2);assert.equal(ys.length,2);
 for(const r of t.roads){assert.ok(r.at>t.roadStart+t.fadeLength);assert.ok(r.at<t.roadEnd-t.fadeLength);}
 assert.equal(xs.length*ys.length,4);assert.ok(t.fadeLength>0);
 const g=game().api.mainGate;assert.equal(g.intersection[0]-g.intersection[1],4);
});

test("roadside trees line all four curbs and leave the main entrance clear",()=>{
 const ts=game().api.roadsideTrees;
 assert.ok(ts.length>30);
 assert.ok(ts.every(t=>t.x===5.7||t.x===53.3||t.y===1.7||t.y===49.3));
 assert.ok(ts.every(t=>!(t.x+t.y<28&&Math.abs(t.x-t.y-4)<3.5)));
 for(const side of [t=>t.x===5.7,t=>t.x===53.3,t=>t.y===1.7,t=>t.y===49.3]) assert.ok(ts.some(side));
});

test("dugouts measure 30 feet along the fence by 10 feet deep with roofs",()=>{
 const ds=game().api.dugouts;
 for(const d of ds) {assert.equal(d.length*10,30);assert.equal(d.width*10,10);assert.ok(d.roofHeightFeet>0);}
 assert.equal(ds[0].y+ds[0].width,10);assert.equal(ds[1].x+ds[1].width,14);
});

test("demo fans walk from parking through gate to seats and unreachable sections are excluded",()=>{
 const g=game();assert.equal(g.api.reachableSeats().length,0);
 g.api.buildFanDemo();assert.equal(g.api.state().money,498000);
 assert.equal(g.api.reachableSeats().length,1);
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,24);
 g.api.advanceFans(1);assert.ok(g.api.fanState().fans[0].x>g.api.parkingSpawn.x);
 for(let i=0;i<300;i++)g.api.advanceFans(0.1);
 assert.ok(g.api.fanState().fans.every(f=>f.seated));
 const blocked=game({version:2,fieldRevision:6,money:99000,tiles:{"17,8":{type:"bleacher",rot:4}},edges:{}});
 assert.equal(blocked.api.reachableSeats().length,0);
});
test("walls block fan routes without removing construction",()=>{
 const g=game();g.api.buildFanDemo();g.select("wall");g.clickTile(16,9);
 assert.equal(g.api.reachableSeats().length,1);
 g.key("r");g.clickTile(16,9);assert.equal(g.api.reachableSeats().length,0);
});

test("fans spread across connected sections and the report separates fans from disconnected seats",()=>{
 const tiles={"14,10":{type:"path",rot:0},"14,9":{type:"path",rot:0},"15,9":{type:"path",rot:0},"16,9":{type:"path",rot:0},"17,9":{type:"path",rot:0},"15,8":{type:"bleacher",rot:4},"17,8":{type:"bleacher",rot:4},"11,30":{type:"bleacher",rot:0}};
 const g=game({version:2,fieldRevision:6,money:90000,tiles,edges:{}});
 g.api.startFanTest();const fs=g.api.fanState().fans;
 assert.equal(fs.filter(f=>f.sectionKey==="15,8").length,24);
 assert.equal(fs.filter(f=>f.sectionKey==="17,8").length,24);
 assert.equal(new Set(fs.map(f=>f.sectionKey+":"+f.seat)).size,48);
 assert.equal(new Set(fs.filter(f=>f.partyId===0).map(f=>f.sectionKey)).size,1,"party stays in one section");
 for(let i=0;i<600;i++)g.api.advanceFans(0.1);
 const report=g.element("fanStatus").textContent;
 assert.match(report,/All 48 arriving fans are seated/);assert.match(report,/0 reachable seats remain empty/);
 assert.match(report,/1 disconnected section \(24 seats\)/);
});

test("walkway paving matches entrance paving and always renders before walking fans",()=>{
 const g=game();g.api.buildFanDemo();g.api.startFanTest();g.api.advanceFans(2);
 for(let camera=0;camera<4;camera++) {
  g.commands.length=0;g.api.draw();
  const paving=g.commands.map((c,i)=>c[0]==="style"&&c[1]==="fillStyle"&&c[2]===g.api.PAVEMENT?i:-1).filter(i=>i>=0);
  const heads=g.commands.map((c,i)=>c[0]==="style"&&c[1]==="fillStyle"&&c[2]==="#ecc29a"?i:-1).filter(i=>i>=0);
  assert.ok(paving.length>=7);assert.ok(heads.length>0);
  assert.ok(Math.max(...paving)<Math.min(...heads));g.key("q");
 }
});

test("nine defenders cover standard baseball positions and pitcher stands on the mound",()=>{
 const g=game(),ps=g.api.defensivePlayers;
 assert.equal(ps.length,9);assert.equal(new Set(ps.map(p=>p.position)).size,9);
 assert.equal(ps.map(p=>p.position).sort().join(","),["P","C","1B","2B","SS","3B","LF","CF","RF"].sort().join(","));
 const p=ps.find(p=>p.position==="P");assert.ok(Math.abs(Math.hypot(p.x-18,p.y-14)*10-60.5)<1e-9);
 const c=ps.find(p=>p.position==="C");assert.ok(c.x<18&&c.y<14);
 for(const pos of ["LF","CF","RF"]){const o=ps.find(p=>p.position===pos);assert.ok(Math.hypot(o.x-18,o.y-14)>20);assert.ok(o.x+o.y<75);}
});

test("arrival route avoids concession and bathroom footprints",()=>{
 for(const type of ["concession","restroom"]) {
  const g=game({version:2,fieldRevision:6,money:90000,tiles:{"9,5":{type,rot:0}},edges:{}});
  const route=g.api.approachRoute();assert.ok(route);
  for(let i=1;i<route.length;i++)for(let j=0;j<=8;j++) {
   const a=route[i-1],b=route[i];assert.equal(g.api.solidBuildingAt(a.x+(b.x-a.x)*j/8,a.y+(b.y-a.y)*j/8),false);
  }
 }
});
test("building on entry landing blocks arrivals instead of allowing fans through",()=>{
 const g=game({version:2,fieldRevision:6,money:90000,tiles:{"8,4":{type:"restroom",rot:0},"15,10":{type:"bleacher",rot:0}},edges:{}});
 assert.equal(g.api.approachRoute(),null);assert.equal(g.api.reachableSeats().length,0);
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,0);
 assert.match(g.element("fanStatus").textContent,/Entrance blocked/);
});

test("concession stands and bathrooms cannot substitute for internal walkway tiles",()=>{
 for(const type of ["concession","restroom"]) {
  const g=game({version:2,fieldRevision:6,money:90000,tiles:{"14,9":{type:"path",rot:0},"15,9":{type,rot:0},"16,9":{type:"path",rot:0},"17,9":{type:"path",rot:0},"17,8":{type:"bleacher",rot:4}},edges:{}});
  assert.equal(g.api.reachableSeats().length,0);
 }
});

test("five-minute game charges only at gate crossing and ends automatically",()=>{
 const g=game();g.api.buildFanDemo();const initial=g.api.state().money;
 g.api.startFanTest();assert.equal(g.api.state().money,initial);
 g.api.advanceFans(1);assert.equal(g.api.state().money,initial);
 let paid=0;
 for(let i=0;i<29;i++) {
  g.api.advanceFans(1);
  const fs=g.api.fanState().fans;
  paid=fs.filter(f=>f.paid).length;
  assert.equal(g.api.state().money,initial+paid*5);
  assert.ok(fs.every(f=>f.paid===(f.index>=f.gateIndex)));
 }
 assert.equal(paid,24);assert.equal(g.api.state().money,498120);
 g.api.advanceFans(269);assert.equal(g.api.fanState().fanActive,true);
 assert.match(g.element("fanStatus").textContent,/0:01 remaining/);
 assert.equal(g.api.state().money,498120);
 g.api.advanceFans(1);assert.equal(g.api.fanState().fanActive,true);
 assert.equal(g.api.fanState().fanPhase,"exiting");
 assert.match(g.element("fanStatus").textContent,/Postgame/);
 g.api.advanceFans(60);assert.equal(g.api.fanState().fanActive,false);
 assert.equal(g.api.fanState().fans.length,0);
 assert.match(g.element("fanStatus").textContent,/Game complete! 5:00 played · 24 admissions · \$120 gate revenue/);
 g.api.advanceFans(30);assert.equal(g.api.state().money,498120);
 g.element("undo").click();assert.equal(g.api.state().money,500120);
 const reload=game(JSON.parse(g.storage.get("svs01")));
 assert.equal(reload.api.state().money,500120);
});

test("another game collects new tickets and large frame deltas include spaced departures",()=>{
 const g=game();g.api.buildFanDemo();g.api.startFanTest();
 g.api.advanceFans(380);assert.equal(g.api.fanState().fanElapsed,300);
 assert.equal(g.api.fanState().fanActive,false);assert.equal(g.api.state().money,498120);
 g.api.startFanTest();assert.equal(g.api.state().money,498120);
 g.api.advanceFans(380);assert.equal(g.api.state().money,498240);
 assert.match(g.element("fanStatus").textContent,/24 admissions · \$120 gate revenue/);
});

function modularPark(extra={}) {
 return {version:2,fieldRevision:6,money:80000,edges:{},tiles:{
  "14,10":{type:"path",rot:0},"14,9":{type:"path",rot:0},"15,9":{type:"path",rot:0},"16,9":{type:"path",rot:0},"17,9":{type:"path",rot:0},"18,9":{type:"path",rot:0},"19,9":{type:"path",rot:0},
  "18,8":{type:"stand",rot:4,baseFeet:0},"19,8":{type:"stairStand",rot:4,baseFeet:0},"20,8":{type:"stand",rot:4,baseFeet:0},
  "18,7":{type:"stand",rot:4,baseFeet:5},"19,7":{type:"stairStand",rot:4,baseFeet:5},"20,7":{type:"stand",rot:4,baseFeet:5},...extra}};
}
test("modular sections snap sideways and uphill at all four facings without changing standalone bleachers",()=>{
 for(const rotation of [0,2,4,6]) {
  const g=game();g.select("stand");for(let i=0;i<rotation;i++)g.key("r");
  assert.equal(g.api.state().rot,rotation);g.clickTile(10,30);
  const {ax,ay,bx,by}=g.api.standAxes(rotation);
  g.clickTile(10+bx,30+by);g.clickTile(10+ax,30+ay);
  const ts=g.api.state().tiles;
  assert.equal(ts[`${10+bx},${30+by}`].baseFeet,5);assert.equal(ts[`${10+ax},${30+ay}`].baseFeet,0);
  assert.equal(g.element("seats").textContent,60);
  const p=g.api.standPoint(10,30,ts["10,30"],0,0.5,5),q=g.api.standPoint(10+bx,30+by,ts[`${10+bx},${30+by}`],0,-0.5,5);
  assert.deepEqual(JSON.stringify(p),JSON.stringify(q));
  g.element("undo").click();assert.equal(g.element("seats").textContent,40);
  assert.equal(game(JSON.parse(g.storage.get("svs01"))).api.state().tiles[`${10+bx},${30+by}`].baseFeet,5);
  g.select("bleacher");g.clickTile(9,35);assert.equal(g.api.state().tiles["9,35"].type,"bleacher");
  assert.equal(g.element("seats").textContent,64);
 }
});
test("connected stairs unlock ground and raised rows; fans climb treads then shuffle sideways",()=>{
 const g=game(modularPark()),sections=g.api.reachableSeats();
 assert.equal(sections.length,6);assert.equal(sections.reduce((n,s)=>n+s.capacity,0),96);
 const upper=sections.find(s=>s.key==="20,7");assert.equal(upper.capacity,20);
 assert.ok(upper.slots.every(s=>s.route.some(p=>p.feet===0.625)&&s.route.at(-1).feet>5));
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,96);
 const upperFan=g.api.fanState().fans.find(f=>f.sectionKey==="20,7");
 assert.ok(upperFan.route.some(p=>p.feet===5));
 for(let i=1;i<upperFan.route.length;i++)assert.ok(Math.abs((upperFan.route[i].feet||0)-(upperFan.route[i-1].feet||0))<=0.625+1e-8);
 g.api.advanceFans(40);
 assert.ok(g.api.fanState().fans.every(f=>f.seated));assert.ok(upperFan.feet>5);
 assert.equal(g.api.state().money,80480);
 for(let camera=0;camera<4;camera++){g.commands.length=0;g.api.draw();assert.ok(g.commands.some(c=>c[0]==="fill"));g.key("q");}
});
test("paths beside seats cannot replace stairs, and missing upper stairs leave upper seats inaccessible",()=>{
 const saved=modularPark();delete saved.tiles["19,7"];
 const g=game(saved),sections=g.api.reachableSeats();
 assert.equal(sections.reduce((n,s)=>n+s.capacity,0),48);
 assert.ok(!sections.some(s=>s.key==="18,7"||s.key==="20,7"));
 delete saved.tiles["19,8"];
 assert.equal(game(saved).api.reachableSeats().length,0);
});
test("walls, mismatched elevations and rotated stairs cannot create an elevated route",()=>{
 const wall=modularPark();wall.edges["19,9:h"]={type:"wall"};
 assert.equal(game(wall).api.reachableSeats().length,0);
 for(const wrong of [{type:"stairStand",rot:0,baseFeet:5},{type:"stairStand",rot:4,baseFeet:10}]) {
  const sections=game(modularPark({"19,7":wrong})).api.reachableSeats();
  assert.ok(!sections.some(s=>s.key==="18,7"||s.key==="20,7"));
 }
});
test("new stand saves validate heights and retain legacy capacity",()=>{
 const g=game();for(const item of [{type:"concourse",rot:1,baseFeet:0},{type:"stand",rot:0,baseFeet:-5},{type:"stairStand",rot:0,baseFeet:2},{type:"stand",rot:0}]) {
  assert.throws(()=>g.api.validatePark({version:2,fieldRevision:6,money:100,tiles:{"10,30":item},edges:{}}));
 }
 const valid=g.api.validatePark(modularPark());assert.equal(valid.tiles["19,7"].baseFeet,5);
 assert.equal(g.api.seatCapacity({type:"bleacher"}),24);assert.equal(g.api.seatCapacity({type:"stand"}),20);assert.equal(g.api.seatCapacity({type:"stairStand"}),8);
});

test("stand demo preserves layouts, costs only additions and is undoable",()=>{
 const g=game();g.api.buildStandDemo();assert.equal(g.api.state().money,488900);
 assert.equal(g.element("seats").textContent,96);assert.equal(g.api.reachableSeats().length,6);
 g.api.buildStandDemo();assert.equal(g.api.state().money,488900);
 g.element("undo").click();g.element("undo").click();assert.equal(Object.keys(g.api.state().tiles).length,0);
 const blocked=game(modularPark({"19,8":{type:"restroom",rot:0}})),before=JSON.stringify(blocked.api.state());
 blocked.api.buildStandDemo();assert.equal(JSON.stringify(blocked.api.state()),before);
});
test("conflicting stand heights reject placement and stands cannot occupy the arrival route",()=>{
 const g=game(modularPark({"20,7":{type:"stand",rot:4,baseFeet:10}}));
 assert.ok(g.api.standPlacement(19,7,4).error);
 const blocked=game(modularPark({"8,4":{type:"stairStand",rot:4,baseFeet:0}}));
 assert.equal(blocked.api.approachRoute(),null);blocked.api.startFanTest();assert.equal(blocked.api.fanState().fanActive,false);
});

function sideEntryPark() {
 const g=game();g.api.buildSideEntryDemo();return JSON.parse(g.storage.get("svs01"));
}
test("side-entry end stairs reach 80 seats without any front-row pavement",()=>{
 const saved=sideEntryPark(),g=game(saved);
 for(const x of [17,18,19])assert.equal(saved.tiles[`${x},9`],undefined);
 assert.equal(g.element("seats").textContent,80);assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),80);
 const section=g.api.reachableSeats().find(s=>s.key==="19,7");
 assert.ok(section.slots.every(s=>s.route.some(p=>p.x===17.25&&p.y===8.5&&p.feet===0)));
 g.api.startFanTest();const fans=g.api.fanState().fans;
 for(const f of fans)for(let i=1;i<f.route.length;i++)assert.ok(Math.abs((f.route[i].feet||0)-(f.route[i-1].feet||0))<=0.625+1e-8);
 g.api.advanceFans(40);assert.ok(fans.every(f=>f.seated));assert.ok(fans.some(f=>f.feet>5));
 assert.equal(g.api.state().money,490300);
});
test("end stairs require their marked side entrance; walls, wrong mirror and raised landings cannot grant ground access",()=>{
 for(const mutate of [s=>delete s.tiles["16,8"],s=>s.edges["17,8:v"]={type:"wall"},s=>s.tiles["17,8"].type="endStairLeft",s=>s.tiles["17,8"].baseFeet=5]) {
  const saved=sideEntryPark();mutate(saved);assert.equal(game(saved).api.reachableSeats().length,0);
 }
 const saved=sideEntryPark();delete saved.tiles["17,7"];
 assert.equal(game(saved).api.reachableSeats().reduce((n,s)=>n+s.capacity,0),40);
});
test("both end-stair mirrors accept side access at all four facings and retain elevations on reload",()=>{
 for(const type of ["endStairLeft","endStairRight"])for(const rot of [0,2,4,6]) {
  const tiles={"14,10":{type:"path",rot:0},"13,10":{type:"path",rot:0},"13,11":{type:"path",rot:0},"12,11":{type:"path",rot:0},"12,12":{type:"path",rot:0},"11,12":{type:"path",rot:0},"11,13":{type:"path",rot:0},"10,13":{type:"path",rot:0}};
  for(let x=9;x<=12;x++)for(let y=14;y<40;y++)tiles[`${x},${y}`]={type:"path",rot:0};
  const g=game(),{ax,ay,bx,by}=g.api.standAxes(rot),side=type==="endStairLeft"?-1:1,x=11,y=30;
  tiles[`${x},${y}`]={type,rot,baseFeet:0};
  tiles[`${x+bx},${y+by}`]={type,rot,baseFeet:5};
  tiles[`${x-ax*side},${y-ay*side}`]={type:"stand",rot,baseFeet:0};
  tiles[`${x+bx-ax*side},${y+by-ay*side}`]={type:"stand",rot,baseFeet:5};
  const play=game({version:2,fieldRevision:6,money:90000,tiles,edges:{}});
  assert.equal(play.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),40,`${type} rotation ${rot}`);
  assert.equal(play.api.seatCapacity({type}),0);
  for(let camera=0;camera<4;camera++){play.api.draw();play.key("q");}
 }
});
test("side-entry demo is undoable and never overwrites an existing stand layout",()=>{
 const g=game();g.api.buildSideEntryDemo();assert.equal(g.api.state().money,489900);
 g.element("undo").click();assert.equal(Object.keys(g.api.state().tiles).length,0);
 g.api.buildStandDemo();const before=JSON.stringify(g.api.state());g.api.buildSideEntryDemo();assert.equal(JSON.stringify(g.api.state()),before);
 assert.match(g.element("fanStatus").textContent,/area is occupied/);
 g.select("endStairLeft");g.clickTile(10,30);g.clickTile(10,31);
 assert.equal(g.api.state().tiles["10,31"].baseFeet,5);
 const reload=game(JSON.parse(g.storage.get("svs01")));
 assert.equal(reload.api.state().tiles["10,31"].type,"endStairLeft");assert.equal(reload.api.state().tiles["10,31"].baseFeet,5);
});

function concoursePark() {
 const saved=sideEntryPark();
 for(const x of [17,18,19])saved.tiles[`${x},7`]={type:"concourse",rot:0,baseFeet:5};
 saved.tiles["19,8"]={type:"stairStand",rot:4,baseFeet:0};
 saved.edges["18,8:v"]={type:"wall"}; // Force entry through the rear concourse.
 return saved;
}
test("fans reach rear seating aisles across a level concourse and descend to seats",()=>{
 const g=game(concoursePark()),sections=g.api.reachableSeats();
 assert.equal(sections.reduce((n,s)=>n+s.capacity,0),28);
 for(const section of sections)assert.ok(section.slots.every(slot=>slot.route.some(p=>p.x===18.5&&p.y===7.5&&p.feet===5)));
 g.api.startFanTest();for(const f of g.api.fanState().fans)for(let i=1;i<f.route.length;i++)assert.ok(Math.abs((f.route[i].feet||0)-(f.route[i-1].feet||0))<=0.625+1e-8);
 g.api.advanceFans(45);assert.ok(g.api.fanState().fans.every(f=>f.seated));
});
test("concourse elevation gaps, missing platforms and blocked edges prevent access",()=>{
 for(const mutate of [s=>s.tiles["18,7"].baseFeet=0,s=>delete s.tiles["18,7"],s=>s.edges["18,7:v"]={type:"wall"}]) {
  const saved=concoursePark();mutate(saved);assert.equal(game(saved).api.reachableSeats().length,0);
 }
});
test("concourse placement snaps to stair tops, saves heights and opens rails only for valid connections",()=>{
 const g=game(sideEntryPark());g.select("concourse");g.clickTile(17,7); // Already occupied: preserve end stairs.
 g.clickTile(17,6);assert.equal(g.api.state().tiles["17,6"].baseFeet,10);
 g.clickTile(18,6);assert.equal(g.api.state().tiles["18,6"].baseFeet,10);
 assert.equal(g.api.concourseConnection(17,6,g.api.state().tiles["17,6"],1,0).kind,"deck");
 assert.equal(g.api.concourseConnection(17,6,g.api.state().tiles["17,6"],0,1).kind,"top");
 assert.equal(g.api.concourseConnection(17,6,g.api.state().tiles["17,6"],-1,0),null);
 const reload=game(JSON.parse(g.storage.get("svs01")));assert.equal(reload.api.state().tiles["18,6"].baseFeet,10);
 g.element("undo").click();assert.equal(g.api.state().tiles["18,6"],undefined);
});

 test("concourse demo forces the rear route, costs only additions and preserves occupied layouts",()=>{
 const g=game();g.api.buildConcourseDemo();assert.equal(g.api.state().money,488600);assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),48);
 for(const section of g.api.reachableSeats())assert.ok(section.slots.every(slot=>slot.route.some(p=>p.x===18.5&&p.y===7.5&&p.feet===5)));
 g.element("undo").click();assert.equal(Object.keys(g.api.state().tiles).length,0);
 g.api.buildStandDemo();const before=JSON.stringify(g.api.state());g.api.buildConcourseDemo();assert.equal(JSON.stringify(g.api.state()),before);
 });

test("concourse rotations remain valid after switching from a diagonal tool",()=>{
 const g=game();g.key("r");g.select("concourse");g.key("r");g.clickTile(10,30);
 assert.equal(g.api.state().tiles["10,30"].rot%2,0);
 assert.equal(game(JSON.parse(g.storage.get("svs01"))).api.state().tiles["10,30"].type,"concourse");
});

test("expanded home-plate apron supports accessible stands without changing the diamond",()=>{
 const saved={version:2,fieldRevision:6,money:90000,edges:{},tiles:{}};
 for(const y of [10,9,8,7])saved.tiles[`14,${y}`]={type:"path",rot:0};
 saved.tiles["14,6"]={type:"stairStand",rot:4,baseFeet:0};saved.tiles["15,6"]={type:"stand",rot:4,baseFeet:0};
 const g=game(saved);assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),28);
 assert.equal(JSON.stringify(g.api.fenceCorners.slice(0,2)),JSON.stringify([[14,14],[18,10]]));
 const route=g.api.approachRoute();assert.ok(route.some(p=>p.x===8.5&&p.y===4.5));
 g.api.startFanTest();g.api.advanceFans(40);assert.ok(g.api.fanState().fans.every(f=>f.seated));assert.equal(g.api.state().money,90140);
});

test("half walkways rotate, cost half price, complete complementary squares and survive undo/reload",()=>{
 const g=game();g.select("halfPath");g.clickTile(10,30);assert.equal(g.api.state().money,499950);
 assert.equal(g.api.state().tiles["10,30"].rot,0);g.key("r");g.key("r");g.clickTile(10,30);
 assert.equal(g.api.state().tiles["10,30"].type,"path");assert.equal(g.api.state().money,499900);
 g.element("undo").click();assert.equal(g.api.state().tiles["10,30"].type,"halfPath");
 assert.equal(game(JSON.parse(g.storage.get("svs01"))).api.state().tiles["10,30"].type,"halfPath");
 g.select("path");g.clickTile(10,30);assert.equal(g.api.state().money,499900);
});
test("half paths only connect through paved edges and keep every route point within the triangle",()=>{
 const saved=modularPark();saved.tiles["16,9"]={type:"halfPath",rot:0};
 assert.equal(game(saved).api.reachableSeats().length,0); // No east edge to continue toward seats.
 const g=game();
 for(const rot of [0,2,4,6]) {
  const item={type:"halfPath",rot},p=g.api.pathPoint(0,0,item);
  assert.ok(g.api.halfContains(item,p.x,p.y));
  assert.equal([[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>g.api.pathOpens(item,dx,dy)).length,2);
 }
});
test("the main entrance is tiled with regular square pavers and arrival routes stay on them",()=>{
 const g=game(),route=g.api.approachRoute();assert.ok(route);
 assert.ok(g.api.entrancePaving.length>=5&&g.api.entrancePaving.length<=10);assert.ok(g.api.entrancePaving.every(p=>p.every(Number.isInteger)));
 for(let i=1;i<route.length;i++)for(let j=0;j<=8;j++) {
  const a=route[i-1],b=route[i];assert.ok(g.api.entrancePavedAt(a.x+(b.x-a.x)*j/8,a.y+(b.y-a.y)*j/8));
 }
});

test("fans traverse a half-tile corner without crossing its unpaved half",()=>{
 const saved={version:2,fieldRevision:6,money:90000,edges:{"15,10:v":{type:"wall"}},tiles:{"14,10":{type:"path",rot:0},"14,9":{type:"path",rot:0},"15,9":{type:"halfPath",rot:6},"15,10":{type:"path",rot:0},"16,10":{type:"bleacher",rot:0}}};
 const g=game(saved),route=g.api.reachableSeats()[0].route;
 assert.ok(route.some(p=>Math.abs(p.x-15-1/3)<1e-8&&Math.abs(p.y-9-2/3)<1e-8));
 for(let i=1;i<route.length;i++)for(let j=0;j<=16;j++) {
  const a=route[i-1],b=route[i],x=a.x+(b.x-a.x)*j/16,y=a.y+(b.y-a.y)*j/16;
  if(x>=15&&x<=16&&y>=9&&y<=10)assert.ok(g.api.halfContains(saved.tiles["15,9"],x-15,y-9));
 }
 g.api.startFanTest();g.api.advanceFans(40);assert.ok(g.api.fanState().fans.every(f=>f.seated));
});

// New parks get $500k; saved parks retain their existing financial balance.
test("new park budget and legacy save balance",()=>{
 const fresh=game();assert.equal(fresh.api.state().money,500000);
 const saved=game({version:2,fieldRevision:6,money:73123,tiles:{},edges:{}});
 assert.equal(saved.api.state().money,73123);
 fresh.element("reset").click();assert.equal(fresh.api.state().money,500000);
});

function seededRandom(seed) {
 return ()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
}

test("arrival schedules contain groups, singles and gaps and vary between games",()=>{
 const g=game(),a=Array.from(g.api.arrivalSchedule(100,seededRandom(42))),b=Array.from(g.api.arrivalSchedule(100,seededRandom(99)));
 assert.equal(a.length,100);assert.equal(a[0],0);assert.notDeepEqual(a,b);
 const gaps=a.slice(1).map((time,i)=>time-a[i]);
 assert.ok(gaps.every(gap=>gap>0));assert.ok(gaps.some(gap=>gap<0.2));assert.ok(gaps.some(gap=>gap>0.6));
 assert.ok(a.at(-1)<90,"arrivals fit inside the two-minute game");
});

test("weighted routes use the rear concourse and the aisle nearest the seat",()=>{
 const g=game();g.api.buildConcourseDemo();
 g.api.state().tiles["21,8"]={type:"stairStand",rot:4,baseFeet:0};
 const sections=g.api.reachableSeats(),right=sections.find(s=>s.key==="21,8");
 assert.ok(right);
 for(const slot of right.slots) {
   const ids=slot.route.map(p=>p.node);
   assert.ok(ids.includes("c:21,7"),"walk along the deck before entering the far aisle");
   assert.ok(ids.some(id=>id.startsWith("t:21,8:")));
   assert.ok(!ids.some(id=>id.startsWith("r:19,8:")||id.startsWith("r:20,8:")),"avoid shuffling across other seating sections");
 }
});

test("100 fans queue without overlap and all exit without a second ticket charge",()=>{
 const saved=modularPark({"21,8":{type:"stand",rot:4,baseFeet:0}});
 const g=game(saved,seededRandom(27)),initial=g.api.state().money;
 g.api.startFanTest();const fans=g.api.fanState().fans;
 assert.equal(fans.length,100);
 let queued=false,sawDeparture=false,sawReturned=false;
 for(let frame=0;frame<2000&&g.api.fanState().fanActive;frame++) {
   g.api.advanceFans(0.2);
   const state=g.api.fanState();
   queued ||= fans.some(f=>f.spawned&&!f.seated&&!f.exited&&state.fanElapsed>f.start+15);
   sawDeparture ||= state.fanPhase==="exiting";
   sawReturned ||= fans.some(f=>f.exited);
   const walking=fans.filter(f=>f.spawned&&!f.seated&&!f.exited);
   for(let i=0;i<walking.length;i++)for(let j=i+1;j<walking.length;j++) {
     assert.ok(g.api.fanDistance(walking[i],walking[j])>=g.api.FAN_SPACE-1e-7,"walking fans keep personal space, including at merges");
   }
   for(const f of fans.filter(f=>f.exited)) {
     assert.equal(f.x,g.api.parkingSpawn.x);assert.equal(f.y,g.api.parkingSpawn.y);assert.equal(f.feet,0);
   }
   if(state.fanElapsed===300)assert.equal(g.api.state().money,initial+500);
 }
 assert.ok(queued);assert.ok(sawDeparture);assert.ok(sawReturned);
 assert.equal(g.api.fanState().fanActive,false,"all 100 fans complete the full cycle");
 assert.ok(fans.every(f=>f.exited));assert.equal(g.api.state().money,initial+500);
 const reload=game(JSON.parse(g.storage.get("svs01")));
 assert.equal(reload.api.state().money,initial+500);
 assert.equal(JSON.stringify(reload.api.state().tiles),JSON.stringify(g.api.state().tiles));
});

test("all demo crowds finish arrivals and staggered exits across different random seeds",()=>{
 for(const [demo,seed] of [["buildFanDemo",4],["buildStandDemo",33],["buildSideEntryDemo",71],["buildConcourseDemo",19]]) {
   const g=game(undefined,seededRandom(seed));g.api[demo]();g.api.startFanTest();const fans=g.api.fanState().fans;
   const geometry=JSON.stringify(g.api.state().tiles),balance=g.api.state().money;
   g.api.advanceFans(100);assert.ok(fans.every(f=>f.seated),`${demo}: all arrivals seated`);
   for(let i=0;i<4;i++)g.key("q");
   g.api.advanceFans(200);assert.equal(g.api.fanState().fanPhase,"exiting");
   assert.ok(fans.every(f=>!f.exited),"fans remain visible at the end of the game");
   assert.ok(new Set(fans.map(f=>f.exitStart)).size>1,"departures are staggered");
   g.api.advanceFans(100);assert.ok(fans.every(f=>f.exited),`${demo}: all fans return to spawn`);
   assert.equal(g.api.fanState().fanActive,false);
   assert.equal(g.api.state().money,balance+fans.length*5);
   assert.equal(JSON.stringify(g.api.state().tiles),geometry);
 }
});

test("seat approaches do not overshoot nearer seats and turn into following fans",()=>{
 const g=game();g.api.buildSideEntryDemo();g.api.startFanTest();
 for(const f of g.api.fanState().fans) {
   const target=f.route.at(-1),previous=f.route.at(target.aisle?-3:-2);
   if(target.x<18.5&&f.sectionKey.startsWith("18,"))assert.ok(previous.x<target.x,"approach the near seat directly from the stair side");
 }
});

test("100-fan crowd cycles remain live across several arrival and departure patterns",()=>{
 for(const seed of [1,7,42,2026]) {
   const g=game(modularPark({"21,8":{type:"stand",rot:4,baseFeet:0}}),seededRandom(seed));
   g.api.startFanTest();const fans=g.api.fanState().fans;
   g.api.advanceFans(100);assert.ok(fans.every(f=>f.seated),`seed ${seed}: arrivals complete`);
   g.api.advanceFans(300);assert.ok(fans.every(f=>f.exited),`seed ${seed}: exit queues drain`);
   assert.equal(g.api.fanState().fanActive,false);
 }
});


function diagonalPark(rotation,type="endStairLeft",rear=false) {
 const g=game(),tiles=g.api.state().tiles,{ax,ay,bx,by}=g.api.standAxes(rotation),side=type==="endStairLeft"?-1:1;
 let x,y,found=false;
 for(let px=10;px<53&&!found;px++)for(let py=25;py<49&&!found;py++) {
  const entries=[[px,py,{type,rot:rotation,baseFeet:0}],[px-ax*side,py-ay*side,{type:"stand",rot:rotation,baseFeet:0}],
   [px+bx,py+by,{type,rot:rotation,baseFeet:5}],[px+bx-ax*side,py+by-ay*side,{type:"stand",rot:rotation,baseFeet:5}]];
  if(rear)entries.push([px+bx*2,py+by*2,{type:"concourse",rot:0,baseFeet:10}],[px+bx*3,py+by*3,{type:"stairStand",rot:(rotation+4)%8,baseFeet:5}]);
  const inside=(a,b)=>a>=9&&a<53&&b>=5&&b<49&&a+b>=19&&a+b<g.api.centerFieldLine+6;
  if((px+ax*side<15&&py+ay*side<12)||!inside(px+ax*side,py+ay*side)||entries.some(([a,b,v])=>!inside(a,b)||g.api.footprintError(a,b,v)))continue;
  for(const [a,b,v] of entries)tiles[`${a},${b}`]=v;
  try {g.api.validatePark({version:2,fieldRevision:6,money:90000,tiles,edges:{}});if(!g.api.approachRoute())throw Error("approach blocked");if(g.api.footprintError(px+ax*side,py+ay*side,{type:"path",rot:0}))throw Error("entry blocked");x=px;y=py;found=true;}
  catch {for(const k of Object.keys(tiles))delete tiles[k];}
 }
 assert.ok(found,"fixture fits outside field");
 const goal=`${x+ax*side},${y+ay*side}`;
 const queue=[[14,10]],parents=new Map([["14,10",null]]);
 for(let i=0;i<queue.length&&!parents.has(goal);i++) {
  const [px,py]=queue[i];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
   const nx=px+dx,ny=py+dy,k=`${nx},${ny}`;
   if((nx<15&&ny<11)||nx<9||nx>=53||ny<5||ny>=49||nx+ny<19||nx+ny>=g.api.centerFieldLine+6||parents.has(k)||tiles[k]||g.api.footprintError(nx,ny,{type:"path",rot:0}))continue;
   parents.set(k,`${px},${py}`);queue.push([nx,ny]);
  }
 }
 assert.ok(parents.has(goal),"entrance can be reached without overlapping diagonal footprint");
 for(let k=goal;k!==null;k=parents.get(k))tiles[k]={type:"path",rot:0};
 const park={version:2,fieldRevision:6,money:90000,tiles:JSON.parse(JSON.stringify(tiles)),edges:{}};g.api.validatePark(park);return park;
}
test("diagonal sections place, snap exact shared edges, undo and reload at every facing",()=>{
 for(const rot of [1,3,5,7]) {
  const g=game();g.select("stand");for(let r=0;r<rot;r++)g.key("r");
  g.clickTile(11,30);
  const {ax,ay,bx,by}=g.api.standAxes(rot);
  g.clickTile(11+ax,30+ay);g.clickTile(11+bx,30+by);
  const tiles=g.api.state().tiles;
  assert.equal(tiles[`${11+bx},${30+by}`].baseFeet,5);
  assert.equal(g.element("seats").textContent,84);
  const a=g.api.standPoint(11,30,tiles["11,30"],0.5,0,2),b=g.api.standPoint(11+ax,30+ay,tiles[`${11+ax},${30+ay}`],-0.5,0,2);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  const reloaded=game(JSON.parse(g.storage.get("svs01")));
  assert.equal(reloaded.api.state().tiles["11,30"].rot,rot);
  g.element("undo").click();assert.equal(g.element("seats").textContent,56);
 }
});
test("both diagonal end-stair mirrors reach every tier and return fans to spawn",()=>{
 for(const rot of [1,3,5,7])for(const type of ["endStairLeft","endStairRight"]) {
  const g=game(diagonalPark(rot,type)),sections=g.api.reachableSeats();
  assert.equal(sections.reduce((n,s)=>n+s.capacity,0),56,`${type} ${rot}`);
  const [stairKey,item]=Object.entries(g.api.state().tiles).find(([,v])=>v.type===type&&v.baseFeet===0);
  const [sx,sy]=stairKey.split(",").map(Number),info=g.api.stairEntrance(sx,sy,item);
  assert.equal(info.connected,true);
  for(let angle=0;angle<4;angle++){g.api.draw();g.key("q");}
  g.api.startFanTest();
  for(let i=0;i<420&&g.api.fanState().fanActive;i++)g.api.advanceFans(1);
  assert.equal(g.api.fanState().fanActive,false,`full cycle ${type} ${rot}: `+JSON.stringify(g.api.fanState().fans.filter(f=>!f.exited&&!f.seated).slice(0,5).map(f=>({x:f.x,y:f.y,z:f.feet,index:f.index,next:f.route[f.index+1],start:f.start,exit:f.exitStart}))));
  assert.equal(g.api.state().money,90280);
 }
});
test("diagonal stair tops connect to matching rear concourses without connecting wrong heights",()=>{
 for(const rot of [1,3,5,7]) {
  const g=game(diagonalPark(rot,"endStairLeft",true)),{bx,by}=g.api.standAxes(rot);
  const deckKey=Object.keys(g.api.state().tiles).find(k=>g.api.state().tiles[k].type==="concourse"),[x,y]=deckKey.split(",").map(Number);
  assert.equal(g.api.concourseConnection(x,y,g.api.state().tiles[`${x},${y}`],-bx,-by).kind,"top");
  assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),72);
  g.api.state().tiles[`${x},${y}`].baseFeet=5;
  assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),56);
 }
});
test("diagonal footprints block overlapping construction, field corners and invalid imports",()=>{
 const g=game();g.select("stand");g.key("r");g.clickTile(11,30);
 g.select("path");g.clickTile(12,30);assert.equal(g.api.state().tiles["12,30"],undefined);
 g.select("stand");g.clickTile(21,9);assert.equal(g.api.state().tiles["21,9"],undefined,"field corner protected");
 const saved=diagonalPark(1),anchor=Object.keys(saved.tiles).find(k=>saved.tiles[k].type==="endStairLeft"&&saved.tiles[k].baseFeet===0),[sx,sy]=anchor.split(",").map(Number);saved.tiles[`${sx+1},${sy}`]={type:"restroom",rot:0};
 assert.throws(()=>g.api.validatePark(saved),/overlaps/);
});
test("side-entry guidance distinguishes missing pavement, disconnected paths, walls and raised landings",()=>{
 const saved=sideEntryPark();delete saved.tiles["16,8"];
 const g=game(saved),item=g.api.state().tiles["17,8"];
 assert.match(g.api.stairEntrance(17,8,item).message,/highlighted tile/);
 g.api.state().tiles["16,8"]={type:"path",rot:0};delete g.api.state().tiles["16,9"];g.api.reachableSeats();
 assert.match(g.api.stairEntrance(17,8,item).message,/main gate/);
 g.api.state().edges["17,8:v"]={type:"wall"};assert.match(g.api.stairEntrance(17,8,item).message,/wall/);
 delete g.api.state().edges["17,8:v"];item.baseFeet=5;g.api.reachableSeats();assert.match(g.api.stairEntrance(17,8,item).message,/5 ft/);
});
test("concourse surfaces participate in depth order and remain below people in every camera",()=>{
 const g=game(concoursePark());
 for(let camera=0;camera<4;camera++) {
  g.commands.length=0;g.api.drawObject(19,7,{type:"concourse",rot:0,baseFeet:5});
  assert.ok(g.commands.some(c=>c[0]==="style"&&c[1]==="fillStyle"&&c[2]===g.api.PAVEMENT),"deck surface is rendered in object pass");
  g.key("q");
 }
});

test("diagonal demo supports a complete 100-fan game, preserves money on reload and is undoable",()=>{
 const g=game();g.api.buildDiagonalDemo();
 assert.equal(g.element("seats").textContent,184);
 assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),184);
 const cost=500000-g.api.state().money;
 assert.equal(cost,19600,"the new outfield approach is included in the demo price");
 const saved=JSON.parse(g.storage.get("svs01"));assert.equal(game(saved).api.state().money,500000-cost);
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,100);
 for(let i=0;i<420&&g.api.fanState().fanActive;i++)g.api.advanceFans(1);
 assert.equal(g.api.fanState().fanActive,false);assert.equal(g.api.state().money,500500-cost);
 g.element("undo").click();assert.equal(g.api.state().money,500500);assert.equal(Object.keys(g.api.state().tiles).length,0);
});

test("social parties reserve adjacent seats together and preserve the 100-fan cap",()=>{
 const g=game();g.api.buildDiagonalDemo();const sections=g.api.reachableSeats(),plan=g.api.partySeatPlan(sections,100,seededRandom(11));
 assert.equal(plan.length,100);assert.equal(new Set(plan.map(p=>`${p.section.key}:${p.slot.seat}`)).size,100);
 const groups=Map.groupBy(plan,p=>p.partyId);
 assert.ok([...groups.values()].some(p=>p.length>=2));assert.ok([...groups.values()].some(p=>p.length===1));
 for(const group of groups.values()) {
  assert.ok(group.length>=1&&group.length<=4);
  assert.equal(new Set(group.map(p=>p.section.key)).size,1);assert.equal(new Set(group.map(p=>p.slot.row)).size,1);
  const cols=group.map(p=>p.slot.col).sort((a,b)=>a-b);assert.equal(cols.at(-1)-cols[0],cols.length-1);
 }
});
test("parties prefer space from strangers and front rows when comparable blocks remain",()=>{
 const g=game();g.api.buildStandDemo();const plan=g.api.partySeatPlan(g.api.reachableSeats(),6,()=>0.5);
 assert.equal(plan[0].slot.row,0);
 const first=plan.filter(p=>p.partyId===0),second=plan.filter(p=>p.partyId===1);
 assert.equal(first.length,3);assert.equal(second.length,3);
 assert.ok(first[0].section.key!==second[0].section.key||first[0].slot.row!==second[0].slot.row);
});

test("team palette and per-item overrides survive global changes, undo and save reload",()=>{
 const g=game();g.select("stand");g.clickTile(11,30);
 g.element("teamprimary").onchange({target:{value:"#aabbcc"}});
 assert.equal(g.api.colors(g.api.state().tiles["11,30"]).primary,"#aabbcc");
 g.element("customPrimary").value="#cc1122";g.element("paintTool").click();g.api.setHover(11,30);g.api.action();
 g.element("teamprimary").onchange({target:{value:"#113355"}});
 assert.equal(g.api.colors(g.api.state().tiles["11,30"]).primary,"#cc1122");
 const saved=JSON.parse(g.storage.get("svs01")),again=game(saved);
 assert.equal(again.api.state().team.primary,"#113355");assert.equal(again.api.colors(again.api.state().tiles["11,30"]).primary,"#cc1122");
 g.element("undo").click();assert.equal(g.api.state().team.primary,"#aabbcc");
 g.element("paintLinked").checked=true;g.api.action();assert.equal(g.api.colors(g.api.state().tiles["11,30"]).primary,"#aabbcc");
 assert.equal(g.api.state().money,498200);
 saved.team.primary="not-a-color";assert.throws(()=>g.api.validatePark(saved),/colors/);
});
test("chain and padded fences retain their material, team colors and collision behavior",()=>{
 const g=game();g.element("wallMaterial").value="padded";g.select("wall");g.clickTile(11,30);
 assert.equal(g.api.state().edges["11,30:h"].material,"padded");
 g.element("fieldMaterial").onchange({target:{value:"padded"}});
 const saved=JSON.parse(g.storage.get("svs01")),again=game(saved);
 assert.equal(again.api.state().edges["11,30:h"].material,"padded");assert.equal(again.api.state().team.fenceMaterial,"padded");
 assert.equal(again.api.state().money,499800);
 g.element("undo").click();assert.equal(g.api.state().team.fenceMaterial,"green");
});
test("all shops and four distinct scoreboards place, rotate, charge, draw and reload",()=>{
 for(const [type,cost] of [["concession",2500],["drinks",2200],["iceCream",2300],["souvenir",3000],["basicScoreboard",5000],["deluxeScoreboard",12000],["videoScoreboard",25000],["vintageScoreboard",8000]]) {
  const g=game();g.select(type);g.key("r");g.clickTile(11,30);
  assert.equal(g.api.state().tiles["11,30"].type,type);assert.equal(g.api.state().tiles["11,30"].rot,1);assert.equal(g.api.state().money,500000-cost);
  const again=game(JSON.parse(g.storage.get("svs01")));assert.equal(again.api.state().tiles["11,30"].type,type);
  for(let a=0;a<4;a++){g.commands.length=0;g.api.drawObject(11,30,g.api.state().tiles["11,30"]);assert.ok(g.commands.some(c=>c[0]==="fill"));g.key("q");}
  g.element("undo").click();assert.equal(g.api.state().money,500000);
 }
});
test("parking lot is the functional spawn and neighborhood models stay outside stadium editing",()=>{
 const g=game(),route=g.api.approachRoute();assert.ok(route);
 assert.equal(route[0].x,g.api.parkingSpawn.x);assert.equal(route[0].y,g.api.parkingSpawn.y);
 const lot=g.api.parkingLot;assert.ok(route[0].x>=lot.x&&route[0].x<=lot.x+lot.width&&route[0].y>=lot.y&&route[0].y<=lot.y+lot.depth);
 assert.equal(g.api.neighborhood.filter(b=>b.kind==="house").length,4);
 assert.ok(["bar","gas","apartment"].every(kind=>g.api.neighborhood.some(b=>b.kind===kind)));
 assert.ok(g.api.streetLamps.length>0);const before=JSON.stringify(g.api.state().tiles);
 for(let a=0;a<4;a++){g.api.draw();g.key("q");}
 assert.equal(JSON.stringify(g.api.state().tiles),before);
});

test("new construction cannot overwrite neighborhood buildings or the parking lot",()=>{
 const g=game();assert.match(g.api.footprintError(-2,19,{type:"path",rot:0}),/Neighborhood/);g.select("path");g.clickTile(-2,19);
 assert.equal(Object.keys(g.api.state().tiles).length,0);assert.equal(g.api.state().money,500000);
 g.select("wall");g.key("r");g.clickTile(-2,19);assert.equal(Object.keys(g.api.state().edges).length,0);
});

test("expanded baseline grounds provide three extra cells without moving legacy parks",()=>{
 const g=game(modularPark());assert.equal(g.api.stadiumBoundary[0][0],6);assert.equal(g.api.stadiumBoundary[1][1],2);
 assert.equal(g.api.state().tiles["19,8"].baseFeet,0);assert.equal(g.api.state().money,80000);
 g.select("stand");g.clickTile(7,25);assert.equal(g.api.state().tiles["7,25"].type,"stand");
});
test("backstop front edge meets the real angled fence and retains rear access",()=>{
 const g=game();g.select("backstopStair");g.clickTile(13,12);
 const stair=g.api.state().tiles["13,12"];assert.ok(stair);assert.equal(stair.rot,5);
 for(const a of [-0.5,0,0.5]){const p=g.api.standPoint(13,12,stair,a,-0.5);assert.equal(p.x+p.y,28);}
 g.select("backstopStand");g.clickTile(14,11);assert.ok(g.api.state().tiles["14,11"]);
 const tiles=g.api.state().tiles;
 for(const k of ["11,7","11,8","11,9","10,9","10,10","10,11","10,12","10,13"])tiles[k]={type:"path",rot:0};
 tiles["10,14"]={type:"stairs",rot:0,baseFeet:0};
 for(const k of ["10,15","11,15","11,14","11,13","11,12","11,11","12,11"])tiles[k]={type:"concourse",rot:0,baseFeet:5};
 assert.equal(g.api.concourseConnection(12,11,tiles["12,11"],1,1)?.kind,"top");
 g.api.connectLegacyGate();const sections=g.api.reachableSeats();assert.ok(sections.some(s=>s.key==="13,12"));assert.ok(sections.some(s=>s.key==="14,11"));
 const clean=g.api.validatePark({version:2,fieldRevision:6,money:100000,tiles,edges:{}});assert.equal(clean.tiles["10,14"].type,"stairs");
 assert.equal(g.api.seatCapacity({type:"stairs"}),0);
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,44);
 for(let i=0;i<420&&g.api.fanState().fanActive;i++)g.api.advanceFans(1);
 assert.equal(g.api.fanState().fanActive,false);
});
test("standalone stairs snap uphill without adding seats and hotkeys select tools",()=>{
 const g=game();g.select("stairs");g.clickTile(10,30);g.clickTile(10,31);
 assert.equal(g.api.state().tiles["10,31"].baseFeet,5);assert.equal(g.element("seats").textContent,0);
 g.key("w");g.clickTile(11,30);assert.equal(g.api.state().tiles["11,30"].type,"path");
 g.key("g");g.clickTile(11,30);assert.equal(g.api.state().tiles["11,30"],undefined);
 const again=game(JSON.parse(g.storage.get("svs01")));assert.equal(again.api.state().tiles["10,31"].baseFeet,5);
});

test("backstop demo is a validated connected layout, preserves occupied parks and is undoable",()=>{
 const g=game();g.api.buildBackstopDemo();assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),44);
 assert.equal(g.api.state().money,488300);const before=JSON.stringify(g.api.state().tiles);g.api.buildBackstopDemo();assert.equal(JSON.stringify(g.api.state().tiles),before);
 g.element("undo").click();g.element("undo").click();assert.equal(Object.keys(g.api.state().tiles).length,0);
 const occupied=game();occupied.select("restroom");occupied.clickTile(13,12);occupied.api.buildBackstopDemo();assert.equal(occupied.api.state().tiles["13,12"].type,"restroom");
});

test("main entrance paving reaches the relocated curb and follows the gate approach",()=>{
 const g=game();assert.deepEqual(Array.from(g.api.siteTemplate.arrivalIntersection),[3,-1]);
 assert.ok(g.api.entrancePaving.some(([x,y])=>x===5&&y===1));
 for(let n=0;n<=35;n++)assert.ok(g.api.entrancePavedAt(5+n/10,1+n/10));
 assert.equal(g.api.entrancePavedAt(7.5,6.5),false);
});
test("scoreboard display is clipped to its world plane and never appears on the back",()=>{
 const g=game();let fronts=0,backs=0;
 for(let camera=0;camera<4;camera++){
  g.commands.length=0;g.api.drawObject(11,30,{type:"deluxeScoreboard",rot:0});
  const labels=g.commands.filter(c=>c[0]==="fillText"),transform=g.commands.find(c=>c[0]==="transform");
  if(labels.length){fronts++;assert.ok(g.commands.some(c=>c[0]==="clip"));assert.ok(transform);assert.ok(transform.slice(1).every(Number.isFinite));assert.ok(transform[1]>0,"front lettering must read left to right");assert.ok(labels.some(c=>c[1]==="LINE SCORE"));for(const c of labels){assert.equal(c[2],500);assert.ok(c[3]>0&&c[3]<600);}}
  else{backs++;assert.equal(transform,undefined);}
  g.key("q");
 }
 assert.equal(fronts,2);assert.equal(backs,2);
});
test("neighborhood roof paints after visible wall windows and doors at every camera angle",()=>{
 const g=game();
 for(let camera=0;camera<4;camera++){
  g.commands.length=0;g.api.drawNeighborhood({kind:"house",x:3,y:20,w:3,d:3,height:18,variant:0});
  const styles=g.commands.filter(c=>c[0]==="style"&&c[1]==="fillStyle").map(c=>c[2]);
  assert.equal(styles.filter(c=>c==="#afd0cf").length,4);assert.equal(styles.filter(c=>c==="#344e59").length,2);
  assert.ok(styles.lastIndexOf("#afd0cf")<styles.findIndex(c=>c==="#74808a"||c==="#59636a"));
  assert.equal(styles.filter(c=>c==="#74808a"||c==="#59636a").length,4);g.key("q");
 }
});
test("six-cell ramp snaps both endpoints, reaches seats, survives reload and erases from any covered cell",()=>{
 const g=game(),tiles=g.api.state().tiles;tiles["14,9"]={type:"path",rot:0};
 g.select("ramp");g.key("r");g.clickTile(14,8);
 const ramp=tiles["14,8"];assert.equal(ramp.type,"ramp");assert.equal(ramp.rot,2);assert.equal(ramp.baseFeet,0);
 assert.equal(g.api.footprint(14,8,ramp).length,4);
 g.select("concourse");g.clickTile(14,2);assert.equal(tiles["14,2"].baseFeet,5);
 assert.equal(g.api.concourseConnection(14,2,tiles["14,2"],0,1).kind,"rampTop");
 tiles["15,2"]={type:"stairStand",rot:6,baseFeet:0};tiles["15,3"]={type:"stand",rot:6,baseFeet:0};
 g.api.connectLegacyGate();const seats=g.api.reachableSeats();assert.equal(seats.reduce((n,s)=>n+s.capacity,0),28);
 assert.ok(seats[0].slots[0].route.some(p=>p.feet>0&&p.feet<5&&p.x===14.5&&p.y>3&&p.y<8));
 const saved={version:2,fieldRevision:6,money:90000,tiles,edges:{}};const again=game(saved);assert.equal(again.api.state().tiles["14,8"].type,"ramp");assert.equal(again.api.reachableSeats().length,2);
 g.api.startFanTest();for(let n=0;n<480&&g.api.fanState().fanActive;n++)g.api.advanceFans(1);assert.equal(g.api.fanState().fanActive,false);assert.ok(g.api.fanState().fans.every(f=>f.exited));
 g.key("g");g.api.setHover(14,5);g.api.action();assert.equal(tiles["14,8"],undefined);g.element("undo").click();assert.equal(g.api.state().tiles["14,8"].type,"ramp");
});
test("ramp footprint protects all six cells and rejects walls, invalid heights and diagonal imports",()=>{
 const g=game();g.select("ramp");g.clickTile(7,30);assert.equal(g.api.state().tiles["7,30"].type,"ramp");
 g.select("restroom");g.clickTile(12,30);assert.equal(g.api.state().tiles["12,30"],undefined);
 const saved={version:2,fieldRevision:6,money:100000,tiles:{"7,30":{type:"ramp",rot:0,baseFeet:0}},edges:{"10,30:v":{type:"wall"}}};
 assert.throws(()=>g.api.validatePark(saved),/wall crosses/);saved.edges={};saved.tiles["7,30"].rot=1;assert.throws(()=>g.api.validatePark(saved),/facing/);
 saved.tiles["7,30"].rot=0;saved.tiles["7,30"].baseFeet=300;assert.throws(()=>g.api.validatePark(saved),/height/);
});
test("corner landing uses its triangular footprint and only opens its two full sides",()=>{
 const g=game(),tiles=g.api.state().tiles;tiles["10,30"]={type:"concourse",rot:0,baseFeet:5};
 g.select("cornerLanding");g.clickTile(11,30);const corner=tiles["11,30"];assert.equal(corner.type,"cornerLanding");assert.equal(corner.baseFeet,5);assert.equal(g.api.footprint(11,30,corner).length,3);
 for(const [x,y] of [[11,29],[12,30],[11,31]])tiles[`${x},${y}`]={type:"concourse",rot:0,baseFeet:5};
 assert.equal(g.api.concourseConnection(11,30,corner,-1,0)?.kind,"deck");assert.equal(g.api.concourseConnection(11,30,corner,0,-1)?.kind,"deck");
 assert.equal(g.api.concourseConnection(11,30,corner,1,0),null);assert.equal(g.api.concourseConnection(11,30,corner,0,1),null);
 const saved={version:2,fieldRevision:6,money:90000,tiles,edges:{}};assert.equal(game(saved).api.state().tiles["11,30"].type,"cornerLanding");
});

test("standalone stair risers remain one step tall at all facings and camera angles",()=>{
 const g=game();
 for(let camera=0;camera<4;camera++){
  for(let rot=0;rot<8;rot++){
   g.commands.length=0;g.api.drawObject(11,30,{type:"stairs",rot,baseFeet:5});
   let polygon=[],fill;const treads=[],risers=[];
   for(const c of g.commands){if(c[0]==="beginPath")polygon=[];if(c[0]==="moveTo"||c[0]==="lineTo")polygon.push([c[1],c[2]]);if(c[0]==="style"&&c[1]==="fillStyle")fill=c[2];if(c[0]==="fill"&&fill===g.api.PAVEMENT)treads.push(polygon);if(c[0]==="fill"&&fill==="#8e9898")risers.push(polygon);}
   assert.equal(treads.length,8);assert.ok(risers.length>0);
   const feetScale=Math.abs(g.api.project(12,30).x-g.api.project(11,30).x)/10;
   const stepFaces=risers.filter(face=>Math.abs(Math.abs(face[0][1]-face[3][1])-0.625*feetScale)<1e-6);assert.ok(stepFaces.length>=8);for(const face of stepFaces){assert.ok(Math.abs(Math.abs(face[0][1]-face[3][1])-0.625*feetScale)<1e-6);assert.ok(Math.abs(Math.abs(face[1][1]-face[2][1])-0.625*feetScale)<1e-6);}
  }g.key("q");
 }
});

test("corner bowl demo fits the home-plate fence and connects every seating row",()=>{
 const g=game();g.api.buildCornerDemo();const tiles=g.api.state().tiles;
 assert.equal(tiles["17,9"]?.type,"backstopCornerFirst",g.element("fanStatus").textContent);
 assert.equal(tiles["13,13"].type,"backstopCornerThird");
 const all=g.api.reachableSeats();assert.equal(all.length,9);assert.equal(all.reduce((n,s)=>n+s.capacity,0),160);
 for(const [k,side] of [["17,9",1],["13,13",-1]]){const [x,y]=k.split(",").map(Number),v=tiles[k];for(const a of [-0.5,0,0.5]){const p=g.api.standPoint(x,y,v,a,-0.5);assert.equal(p.x+p.y,28);}assert.ok(g.api.rowNeighbor(x,y,v,-1));assert.ok(g.api.rowNeighbor(x,y,v,1));}
 assert.equal(g.api.state().money,468800);
 const saved=JSON.parse(g.storage.get("svs01"));assert.equal(game(saved).api.reachableSeats().reduce((n,s)=>n+s.capacity,0),160);
 const before=JSON.stringify(g.api.state());g.api.buildCornerDemo();assert.equal(JSON.stringify(g.api.state()),before);
 g.element("undo").click();assert.equal(Object.keys(g.api.state().tiles).length,0);assert.equal(g.api.state().money,500000);
});
test("regular corner mirrors meet straight and diagonal rows exactly at all cardinal rotations",()=>{
 const g=game();
 for(const type of ["cornerStandLeft","cornerStandRight"])for(const rot of [0,2,4,6]){
  const corner={type,rot,baseFeet:10},ports=g.api.cornerPorts(25,25,corner);
  assert.equal(g.api.seatCapacity(corner),7);
  for(let n=0;n<2;n++)for(const b of [-0.5,-0.2625,-0.0125,0.5]){
   const p=g.api.standPoint(25,25,corner,n?0.5:-0.5,b),port=ports[n],q=g.api.standPoint(port.x,port.y,{type:"stand",rot:port.rot,baseFeet:10},port.side*0.5,b);
   assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);
  }
  const tiles=g.api.state().tiles;for(const k of Object.keys(tiles))delete tiles[k];tiles["25,25"]=corner;
  for(const p of ports)tiles[`${p.x},${p.y}`]={type:"stand",rot:p.rot,baseFeet:10};
  assert.ok(g.api.rowNeighbor(25,25,corner,-1));assert.ok(g.api.rowNeighbor(25,25,corner,1));
  tiles[`${ports[1].x},${ports[1].y}`].baseFeet=5;assert.equal(g.api.rowNeighbor(25,25,corner,1),null);
 }
});
test("corner row links carry fans across a transition when the other bank has no stairs",()=>{
 const g=game();g.api.buildCornerDemo();const tiles=g.api.state().tiles;
 delete tiles["12,14"]; // Block third-base stair top: its bank must use the joined rows.
 const all=g.api.reachableSeats(),third=all.find(s=>s.key==="13,14");assert.ok(third);assert.equal(third.capacity,8);
 assert.ok(third.slots.every(s=>s.route.some(p=>p.node?.startsWith("corner:17,9"))&&s.route.some(p=>p.node?.startsWith("corner:13,13"))));
 tiles["17,9"].baseFeet=5;assert.equal(g.api.reachableSeats().find(s=>s.key==="13,14"),undefined);
});
test("partial concourses connect through shared surface, keep uncovered rails, and complete at retained height",()=>{
 const g=game(),tiles=g.api.state().tiles;tiles["10,30"]={type:"concourse",rot:0,baseFeet:5};
 g.select("halfConcourse");g.clickTile(11,30);const half=tiles["11,30"];assert.equal(half.baseFeet,5);
 const port=g.api.concourseConnection(10,30,tiles["10,30"],1,0);assert.equal(port.kind,"deck");assert.equal(port.point.y,30.25);
 assert.deepEqual(Array.from(port.opening),[0,0.5]);
 const rails=g.api.deckRailSegments(10,30,tiles["10,30"],1);assert.equal(rails.length,1);assert.deepEqual(Array.from(rails[0][0]),[1,0.5]);
 tiles["11,31"]={type:"concourse",rot:0,baseFeet:5};assert.equal(g.api.concourseConnection(11,30,half,0,1),null);
 tiles["12,30"]={type:"halfConcourse",rot:4,baseFeet:5};assert.equal(g.api.concourseConnection(11,30,half,1,0),null,"opposite strips only touch at a point");
 g.key("r");g.key("r");g.clickTile(11,30);assert.equal(tiles["11,30"].type,"concourse");assert.equal(tiles["11,30"].baseFeet,5);assert.equal(g.api.state().money,499100);
 g.element("undo").click();assert.equal(g.api.state().tiles["11,30"].type,"halfConcourse");
 const t=game();t.select("cornerLanding");t.clickTile(10,30);t.select("concourse");t.clickTile(10,30);assert.equal(t.api.state().money,499100);assert.equal(t.api.state().tiles["10,30"].type,"concourse");
});
test("partial deck route waypoints stay on its polygon and import rejects invalid corner geometry",()=>{
 const g=game();g.api.buildCornerDemo();const tiles=g.api.state().tiles,all=g.api.reachableSeats();
 let partialNodes=0;
 for(const s of all)for(const slot of s.slots)for(const p of slot.route)if(p.node?.startsWith("c:")){
  const k=p.node.split(":")[1],v=tiles[k];if(v?.type!=="halfConcourse"&&v?.type!=="cornerLanding")continue;
  const [x,y]=k.split(",").map(Number);assert.ok(g.api.pointInPolygon(p.x,p.y,g.api.footprint(x,y,v)));partialNodes++;
 }
 assert.ok(partialNodes>0);
 const saved=JSON.parse(g.storage.get("svs01"));saved.tiles["17,9"].rot=2;assert.throws(()=>g.api.validatePark(saved),/fixed facing/);
 saved.tiles["17,9"].rot=4;saved.tiles["16,10"]={type:"path",rot:0};assert.throws(()=>g.api.validatePark(saved),/overlaps/);
 const before=g.api.state().money;g.select("restroom");g.clickTile(16,10);assert.equal(g.api.state().money,before);
});
test("100 fans use the corner bowl and partial concourses then return to parking",()=>{
 for(const seed of [1,33,42]){const g=game(undefined,seededRandom(seed));g.api.buildCornerDemo();const before=g.api.state().money;
 g.api.startFanTest();const fans=g.api.fanState().fans;assert.equal(fans.length,100);
 g.api.advanceFans(110);assert.ok(fans.every(f=>f.seated),`${fans.filter(f=>f.seated).length}/100 seated`);
 g.api.advanceFans(340);assert.equal(g.api.fanState().fanActive,false,`${fans.filter(f=>f.exited).length}/100 exited`);assert.ok(fans.every(f=>f.exited));assert.equal(g.api.state().money,before+500);}
});

test("partial completion protects adjacent diagonal corners and existing deck-boundary walls reload",()=>{
 const g=game(),tiles=g.api.state().tiles;
 tiles["11,30"]={type:"halfConcourse",rot:0,baseFeet:5};tiles["11,31"]={type:"stand",rot:1,baseFeet:0};
 assert.equal(g.api.footprintError(11,30,tiles["11,30"]),null);
 g.select("concourse");g.clickTile(11,30);assert.equal(tiles["11,30"].type,"halfConcourse");assert.equal(g.api.state().money,500000);
 const park={version:2,fieldRevision:6,money:90000,tiles:{"10,30":{type:"concourse",rot:0,baseFeet:5}},edges:{"10,30:h":{type:"wall"}}};
 assert.equal(game(park).api.state().tiles["10,30"].type,"concourse");
});

test("regular corner construction snaps to raised banks and supports refund, undo and reload",()=>{
 for(const type of ["cornerStandLeft","cornerStandRight"])for(const rot of [0,2,4,6]){
  const g=game(),corner={type,rot,baseFeet:5};
  for(const p of g.api.cornerPorts(11,30,corner))g.api.state().tiles[`${p.x},${p.y}`]={type:"stand",rot:p.rot,baseFeet:5};
  g.select(type);for(let n=0;n<rot/2;n++)g.key("r");g.clickTile(11,30);
  assert.equal(g.api.state().tiles["11,30"]?.baseFeet,5);assert.equal(g.api.state().money,497800);
  assert.equal(game(JSON.parse(g.storage.get("svs01"))).api.state().tiles["11,30"].type,type);
  g.key("g");g.clickTile(11,30);assert.equal(g.api.state().tiles["11,30"],undefined);assert.equal(g.api.state().money,499340);
  g.element("undo").click();assert.equal(g.api.state().tiles["11,30"].baseFeet,5);
 }
});

test("stairs snap only to a partial deck edge that meets their landing",()=>{
 const g=game(),tiles=g.api.state().tiles;g.select("stairs");
 tiles["11,31"]={type:"halfConcourse",rot:4,baseFeet:10};assert.equal(g.api.standPlacement(11,30,0).baseFeet,0);
 tiles["11,31"].rot=0;assert.equal(g.api.standPlacement(11,30,0).baseFeet,5);
});

test("two directed walking lanes let opposing fans pass on paths, half concourses and stairs",()=>{
 for(const kind of ["path","halfConcourse","stairs"]){
  const g=game(),vertical=kind!=="path",coords=Array.from({length:9},(_,n)=>({x:vertical?0.25:n/4,y:vertical?n/8:0.25,feet:kind==="stairs"?n*0.625:0,node:(kind==="stairs"?"t:":kind==="path"?"g:":"c:")+n}));
  const fans=g.api.simulateTraffic([coords,coords.slice().reverse()]);
  for(let n=0;n<180;n++){g.api.advanceFans(1/60);const walking=fans.filter(f=>!f.seated);if(walking.length===2)assert.ok(g.api.fanDistance(...walking)>=g.api.FAN_SPACE-1e-7);}
  assert.ok(fans.every(f=>f.seated),kind+" passes in both directions");
  if(kind==="halfConcourse")for(const f of fans)assert.ok(f.route.every(p=>p.x>=0&&p.x<=0.5));
 }
});
test("the player rear-concourse stall completes arrivals and exits under several seeds",()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('fixtures/rear-concourse-stall.json',`file://${__filename}`),'utf8'));
 for(const seed of [1,7,2026]){const g=game(saved,seededRandom(seed));assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),212);
  for(const [k,v] of Object.entries(saved.tiles))assert.equal(JSON.stringify(g.api.state().tiles[k]),JSON.stringify(v));assert.equal(g.api.state().money,saved.money);
  g.api.startFanTest();const fans=g.api.fanState().fans;assert.equal(fans.length,100);g.api.advanceFans(110);assert.ok(fans.every(f=>f.seated),`seed ${seed}: all seated`);g.api.advanceFans(380);assert.ok(fans.every(f=>f.exited),`seed ${seed}: all exited`);assert.equal(g.api.fanState().fanActive,false);assert.equal(g.api.state().money,saved.money+500);
 }
});
test("remaining gate pavement participates in the walking graph and matches the fence opening",()=>{
 const g=game(),tiles=g.api.state().tiles;tiles["8,6"]={type:"stairs",rot:0,baseFeet:0};tiles["9,6"]={type:"stand",rot:0,baseFeet:0};
 assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),20);assert.ok(g.api.groundItem(8,5));
 const gap=g.api.outerFence.find((p,i)=>{const q=g.api.outerFence[(i+1)%g.api.outerFence.length];return p.b[0]!==q.a[0]||p.b[1]!==q.a[1];});
 assert.deepEqual(Array.from(gap.b),Array.from(g.api.mainGate.a));
 assert.ok(g.api.entrancePaving.length<=10);
});
test("access inspector finds a missing walkway and its suggested piece repairs the route",()=>{
 const saved=modularPark();delete saved.tiles["16,9"];const g=game(saved),before=JSON.stringify(g.api.state());
 const report=g.api.accessReport("18,8");assert.equal(report.connected,false);assert.ok(report.suggestion);assert.match(report.message,/walkway|Walkway/);assert.equal(JSON.stringify(g.api.state()),before,"inspection never changes construction or money");assert.ok(g.api.validAccessPiece(report.suggestion));
 const c=report.suggestion;g.select(c.type);g.api.setHover(c.x,c.y);g.api.action();assert.ok(g.api.accessReport("18,8").connected);
});
test("access inspector explains blocked entrances and offers stairs for an aisle-free bank",()=>{
 const saved=modularPark();saved.edges["19,9:h"]={type:"wall"};const blocked=game(saved);assert.match(blocked.api.accessReport("18,8").message,/wall blocks/i);
 const bare=modularPark();for(const v of Object.values(bare.tiles))if(v.type==="stairStand")v.type="stand";
 const g=game(bare),report=g.api.accessReport("18,8");assert.match(report.message,/no connected stair/i);assert.ok(report.suggestion);assert.ok(g.api.validAccessPiece(report.suggestion));assert.ok(report.suggestion.type==="stairs"||report.suggestion.type==="stairStand");
});
test("corner seat rows are parallel, rigid and remain inside their tier footprint",()=>{
 const g=game();for(const type of ["cornerStandLeft","cornerStandRight","backstopCornerFirst","backstopCornerThird"]){const item={type,rot:type==="backstopCornerFirst"?4:type==="backstopCornerThird"?6:0,baseFeet:0};let direction;
  for(let row=0;row<4;row++){const cols=g.api.cornerCols(item,row);if(!cols)continue;const a=g.api.cornerSeatPoint(20,20,item,row,0),b=g.api.cornerSeatPoint(20,20,item,row,cols-1);assert.ok(g.api.pointInPolygon(a.x,a.y,g.api.footprint(20,20,item)));if(cols>1){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(direction)assert.ok(Math.abs(direction.x*dy-direction.y*dx)<1e-8);else direction={x:dx/len,y:dy/len};}}
 }
});
test("zoom reaches six times and keeps picking aligned at every camera angle",()=>{
 const g=game();for(let i=0;i<30;i++)g.element("zoomIn").click();assert.equal(g.api.state().zoom,6);
 for(let camera=0;camera<4;camera++){const p=g.api.project(11.5,30.5),q=g.api.inverse(p.x,p.y);assert.equal(q.x,11);assert.equal(q.y,30);g.key("q");}
 g.key("i");g.api.setHover(11,30);g.api.action();assert.equal(Object.keys(g.api.state().tiles).length,0);
});

test("attendance selection persists and changes only the next game, capped by accessible seats",()=>{
 const g=game();g.api.buildCornerDemo();const select=g.element("fanCount");select.value="250";select.onchange();
 assert.equal(JSON.parse(g.storage.get("svs01")).requestedFans,250);g.api.startFanTest();assert.equal(g.api.fanState().fans.length,160);
 select.value="100";select.onchange();assert.equal(g.api.fanState().fans.length,160);g.element("stopFans").click();g.api.startFanTest();assert.equal(g.api.fanState().fans.length,100);
 const again=game({...JSON.parse(g.storage.get("svs01")),requestedFans:500});assert.equal(again.element("fanCount").value,"500");
 assert.equal(g.api.validatePark({...JSON.parse(g.storage.get("svs01")),requestedFans:999999}).requestedFans,100);
});
test("fence wedges share a front apex, widen outward and meet matching-height rows",()=>{
 const g=game();for(const type of ["backstopCornerFirst","backstopCornerThird"]){const item={type,rot:type==="backstopCornerFirst"?4:6,baseFeet:15},x=type==="backstopCornerFirst"?17:13,y=type==="backstopCornerFirst"?9:13;
 const a=g.api.standPoint(x,y,item,-0.5,-0.5),b=g.api.standPoint(x,y,item,0.5,-0.5);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8);assert.equal(g.api.cornerCols(item,0),0);
 let last=0;for(let r=0;r<4;r++){const n=g.api.cornerCols(item,r);assert.ok(n>=last);last=n;for(let c=0;c<n;c++){const p=g.api.cornerSeatPoint(x,y,item,r,c);assert.equal(p.feet,15+(r+1)*1.25);assert.ok(g.api.pointInPolygon(p.x,p.y,g.api.footprint(x,y,item)));}}
 for(const [n,port] of g.api.cornerPorts(x,y,item).entries())for(let r=0;r<4;r++){const t=-0.5+(r+1)/4,p=g.api.standPoint(x,y,item,n?0.5:-0.5,t,15+(r+1)*1.25),q=g.api.standPoint(port.x,port.y,{type:port.backstop?"backstopStand":"stand",rot:port.rot,baseFeet:15},port.side*0.5,t,15+(r+1)*1.25);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);assert.equal(p.feet,q.feet);}
 }
});
test("backstop shares diagonal row depth and connects a separate rear concourse",()=>{
 const g=game(),item={type:"backstopStair",rot:5,baseFeet:10},a=g.api.standPoint(13,12,item,0,-0.5),b=g.api.standPoint(13,12,item,0,0.5);assert.ok(Math.abs(Math.hypot(b.x-a.x,b.y-a.y)-Math.SQRT2)<1e-8);
 const tiles=g.api.state().tiles;tiles["13,12"]=item;tiles["12,11"]={type:"concourse",rot:0,baseFeet:15};assert.ok(g.api.stairRearConnected(13,12,item));
 for(const edge of [1,2]){const rails=g.api.deckRailSegments(12,11,tiles["12,11"],edge);assert.equal(rails.length,1);assert.ok(Math.hypot(rails[0][1][0]-rails[0][0][0],rails[0][1][1]-rails[0][0][1])<1);}
 tiles["12,11"].baseFeet=10;assert.equal(g.api.stairRearConnected(13,12,item),false);assert.equal(g.api.deckRailSegments(12,11,tiles["12,11"],1).length,1);
});
test("500 fans can enter a multi-tier stand and finish their exits",()=>{
 const g=game(undefined,seededRandom(35)),tiles=g.api.state().tiles;
 tiles['9,4']={type:'path',rot:0};for(let y=4;y<=48;y++)tiles[`10,${y}`]={type:'path',rot:0};
 for(let x=11;x<=16;x++)tiles[`${x},48`]={type:'path',rot:0};
 for(let tier=0;tier<3;tier++)for(let n=0;n<9;n++)tiles[`${16+n},${47-tier}`]={type:n===0?'stairStand':'stand',rot:4,baseFeet:tier*5};
 g.api.validatePark({version:2,fieldRevision:7,seatingRevision:2,money:50000,tiles,edges:{}});assert.equal(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0),504);
 const select=g.element("fanCount");select.value="500";select.onchange();g.api.startFanTest();const crowd=g.api.fanState().fans;assert.equal(crowd.length,500);
 g.api.advanceFans(230);assert.ok(g.api.fanState().fans.every(f=>f.seated)||g.api.fanState().fanPhase==="exiting"||!g.api.fanState().fanActive,`${g.api.fanState().fans.filter(f=>f.seated).length}/500 seated`);
 g.api.advanceFans(400);assert.equal(g.api.fanState().fanActive,false,`${g.api.fanState().fans.filter(f=>f.exited).length}/500 exited`);assert.ok(crowd.every(f=>f.exited));
});

test("older fence connectors retain their original bank ports on reload",()=>{
 const g=game();g.api.buildCornerDemo();const saved=JSON.parse(g.storage.get("svs01"));delete saved.seatingRevision;delete saved.tiles["16,9"];delete saved.tiles["13,12"];const old=game(saved);assert.equal(old.api.state().money,saved.money);assert.equal(old.api.state().tiles["17,9"].legacyCorner,true);assert.equal(old.api.rowNeighbor(17,9,old.api.state().tiles["17,9"],1),"15,10");assert.equal(old.api.rowNeighbor(13,13,old.api.state().tiles["13,13"],1),"14,11");assert.equal(old.api.reachableSeats().length,7);
});

test("physical seat bays are two feet apart at every rotation and diagonal stairs retain a six-foot aisle",()=>{
 const g=game();for(let rot=0;rot<8;rot++)for(const type of ['stand','stairStand','backstopStand','backstopStair']){
  const item={type,rot,baseFeet:0},seats=g.api.rowSeats(item),len=Math.hypot(...[g.api.standAxes(rot).ax,g.api.standAxes(rot).ay]);
  assert.equal(seats.length,type.endsWith('Stair')||type==='stairStand'?(rot%2?4:2):(rot%2?7:5));
  for(let c=1;c<seats.length;c++)if(Math.sign(seats[c])===Math.sign(seats[c-1])||type==='stand'||type==='backstopStand')assert.ok(Math.abs((seats[c]-seats[c-1])*len*10-2)<1e-8);
  if(type==='stairStand'||type==='backstopStair')assert.ok(seats.every(a=>Math.abs(a)*len*10>=4-1e-8));
 }
});
test("front-edge fence snapping rotates reusable sections and starts outfield seating five feet high",()=>{
 const g=game();for(const [x,y,rot,sum] of [[46,43,1,32+40*Math.SQRT2],[13,12,5,28]])for(const type of ['stand','backstopStand']){
  const snap=g.api.fenceSnap(x,y,{type,rot,baseFeet:0});assert.ok(snap);assert.equal(snap.baseFeet,rot===1?5:0);
  const item={type,rot,...snap};for(const a of [-0.5,0.5]){const p=g.api.standPoint(x,y,item,a,-0.5);assert.ok(Math.abs(p.x+p.y-sum)<1e-8);}
  assert.equal(g.api.footprintError(x,y,item),null);
 }
 g.select('backstopStand');g.key('r');g.key('r');g.key('r');g.key('r');assert.equal(g.api.state().rot,1);
 g.clickTile(46,43);assert.equal(g.api.state().tiles['46,43'].baseFeet,5);assert.equal(g.api.state().tiles['46,43'].rot,1);
});
test("backstop stair bands stack without mandatory concourses and preserve exact shared edges",()=>{
 const g=game();g.select('backstopStair');g.clickTile(13,12);g.clickTile(12,11);g.clickTile(11,10);
 const tiles=g.api.state().tiles;for(let band=0;band<3;band++)assert.equal(tiles[`${13-band},${12-band}`].baseFeet,band*5);
 for(let band=0;band<2;band++){const a=g.api.standPoint(13-band,12-band,tiles[`${13-band},${12-band}`],0,0.5,band*5+5),b=g.api.standPoint(12-band,11-band,tiles[`${12-band},${11-band}`],0,-0.5,band*5+5);assert.deepEqual(a,b);}
 const reloaded=game(JSON.parse(g.storage.get('svs01')));assert.equal(reloaded.api.state().tiles['11,10'].baseFeet,10);
});
test("upper fence wedges grow with each band and meet both adjoining seating banks",()=>{
 for(const [type,x,y,rot] of [['backstopCornerFirst',17,9,4],['backstopCornerThird',13,13,6]]){
  const g=game(),tiles=g.api.state().tiles,{bx,by}=g.api.standAxes(rot);g.select(type);
  for(let band=0;band<3;band++){
   const cx=x+bx*band,cy=y+by*band;g.clickTile(cx,cy);const wedge=tiles[`${cx},${cy}`];assert.equal(wedge?.ring,band,g.element('toast').textContent);assert.equal(wedge.baseFeet,band*5);
   const ports=g.api.cornerPorts(cx,cy,wedge);for(const [n,p] of ports.entries()){
    const bank={type:p.backstop?'backstopStand':'stand',rot:p.rot,baseFeet:band*5};tiles[`${p.x},${p.y}`]=bank;
    assert.ok(g.api.rowNeighbor(cx,cy,wedge,n?1:-1));for(const b of [-0.5,-0.25,0,0.25,0.5]){const a=g.api.standPoint(cx,cy,wedge,n?0.5:-0.5,b),q=g.api.standPoint(p.x,p.y,bank,p.side*0.5,b);assert.ok(Math.hypot(a.x-q.x,a.y-q.y)<1e-8);}
   }
   if(band){const below=tiles[`${cx-bx},${cy-by}`];for(const a of [-0.5,0,0.5]){const p=g.api.standPoint(cx,cy,wedge,a,-0.5,band*5),q=g.api.standPoint(cx-bx,cy-by,below,a,0.5,band*5);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);}}
  }
  const upper=tiles[`${x+bx*2},${y+by*2}`];assert.ok(g.api.seatCapacity(upper)>g.api.seatCapacity(tiles[`${x},${y}`]));
  assert.equal(g.api.validatePark({version:2,fieldRevision:6,seatingRevision:2,money:100000,tiles,edges:{}}).tiles[`${x+bx*2},${y+by*2}`].ring,2);
 }
});
test("exported park caps a 1,000-fan request at 976 reachable seats and supports arrivals and departures with no stranded backstop fans",()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('./fixtures/backstop-jam-v035.json',`file://${__filename}`),'utf8'));saved.requestedFans=1000;
 const g=game(saved,seededRandom(36));assert.equal(g.element('fanCount').value,'1000');assert.ok(g.api.reachableSeats().reduce((n,s)=>n+s.capacity,0)>=900);
 g.api.startFanTest();const crowd=g.api.fanState().fans;assert.equal(crowd.length,976);
 g.api.advanceFans(600);assert.equal(g.api.fanState().fanActive,false,`${crowd.filter(f=>f.exited).length}/976 exited`);assert.ok(crowd.every(f=>f.exited));
});


test("late scheduled arrivals continue after the five-minute clock reaches zero",()=>{
 const g=game();g.api.buildFanDemo();g.api.startFanTest();const crowd=g.api.fanState().fans;g.api.delayArrivals(310);
 g.api.advanceFans(300);assert.equal(g.api.fanState().fanElapsed,300);assert.equal(g.api.fanState().fanPhase,'finishing arrivals');assert.ok(crowd.every(f=>!f.spawned));
 g.api.advanceFans(120);assert.equal(g.api.fanState().fanActive,false);assert.ok(crowd.every(f=>f.exited));
});

test('pregame duration choices persist and an active game keeps its starting duration',()=>{
 for(const minutes of [1,2,5,10]){
  const g=game();g.api.buildFanDemo();const select=g.element('gameMinutes');select.value=String(minutes);select.onchange();
  const saved=JSON.parse(g.storage.get('svs01'));assert.equal(saved.gameMinutes,minutes);assert.equal(game(saved).element('gameMinutes').value,String(minutes));
  g.api.startFanTest();select.value=String(minutes===10?1:10);select.onchange();g.api.advanceFans(minutes*60-1);assert.equal(g.api.fanState().fanPhase,'game');assert.match(g.element('fanStatus').textContent,/0:01 remaining/);
  g.api.advanceFans(1);assert.equal(g.api.fanState().fanPhase,'exiting');g.api.advanceFans(80);assert.equal(g.api.fanState().fanActive,false);
 }
});
test('all attendance choices persist and invalid settings fall back safely',()=>{
 for(const n of [100,250,500,1000]){const g=game();g.element('fanCount').value=String(n);g.element('fanCount').onchange();assert.equal(game(JSON.parse(g.storage.get('svs01'))).element('fanCount').value,String(n));}
 const g=game();const park=g.api.validatePark({version:2,fieldRevision:6,money:100,tiles:{},gameMinutes:999,requestedFans:999});assert.equal(park.gameMinutes,5);assert.equal(park.requestedFans,100);
});
test('field finishes use short brick between dugouts and dark green padding elsewhere without changing height',()=>{
 const g=game();const panels=g.api.fieldFence;const height=panels.map(p=>p.feet);
 for(const panel of panels){g.commands.length=0;g.api.drawFieldFence(panel);const fill=g.commands.find(c=>c[0]==='style'&&c[1]==='fillStyle');const mx=(panel.a[0]+panel.b[0])/2,my=(panel.a[1]+panel.b[1])/2;assert.equal(fill[2],panel.feet===3&&mx<24&&my<20?'#925f49':'#174f36');}
 assert.deepEqual(panels.map(p=>p.feet),height);assert.ok(height.includes(3));assert.ok(height.includes(8));
 const old=game({version:2,fieldRevision:6,money:12345,tiles:{},team:{primary:'#31566b',secondary:'#edc75b',accent:'#fff0c9',fenceMaterial:'chain'}});assert.equal(old.api.state().team.fenceMaterial,'green');assert.equal(old.api.state().money,12345);
});

test('independent concourse triangles fill reserved seating cells, undo, refund and reload',()=>{
 const g=game();g.select('backstopStair');g.clickTile(13,12);g.select('cornerLanding');g.key('r');g.key('r');g.clickTile(13,12);
 assert.equal(g.api.state().infillDecks['13,12'].baseFeet,5);assert.equal(g.api.state().tiles['13,12'].type,'backstopStair');
 const saved=JSON.parse(g.storage.get('svs01')),again=game(saved);assert.equal(again.api.state().infillDecks['13,12'].rot,0);assert.equal(again.api.state().money,saved.money);
 const seam=g.api.surfaceSeams(13,12,g.api.state().infillDecks['13,12']).find(s=>s.id==='t:13,12:8');assert.ok(seam);
 assert.equal(g.api.deckRailSegments(13,12,g.api.state().infillDecks['13,12'],seam.edge).length,2,'only the usable stair width opens');
 g.select('erase');g.clickTile(13,12);assert.equal(g.api.state().infillDecks['13,12'],undefined);assert.equal(g.api.state().tiles['13,12'].type,'backstopStair');assert.equal(g.api.state().money,saved.money+490);
 g.element('undo').click();assert.ok(g.api.state().infillDecks['13,12']);
 saved.infillDecks['13,12'].rot=4;assert.throws(()=>g.api.validatePark(saved),/overlaps/);
});
test('a user-built diagonal concourse connects lower and upper bands across real shared edges',()=>{
 const g=game(),tiles=g.api.state().tiles;tiles['13,12']={type:'backstopStair',rot:5,baseFeet:0};
 g.select('cornerLanding');g.clickTile(13,12);assert.ok(g.api.state().infillDecks['13,12']);
 g.select('concourse');g.clickTile(12,12);assert.equal(tiles['12,12'].baseFeet,5);
 g.select('cornerLanding');g.key('r');g.key('r');g.clickTile(12,11);assert.equal(tiles['12,11'].baseFeet,5);
 g.select('backstopStair');g.key('r');g.clickTile(11,10);assert.equal(tiles['11,10']?.baseFeet,5,g.element('toast').textContent);
 tiles['11,12']={type:'stairs',rot:2,baseFeet:0};for(const k of ['11,7','10,7','10,8','10,9','10,10','10,11','10,12'])tiles[k]={type:'path',rot:0};g.api.connectLegacyGate();
 const reached=g.api.reachableSeats();assert.equal(reached.reduce((n,s)=>n+s.capacity,0),32);
 assert.ok(reached.find(s=>s.key==='13,12').slots.every(slot=>slot.route.some(p=>p.node?.startsWith('i:13,12'))));
 assert.ok(reached.find(s=>s.key==='11,10').slots.every(slot=>slot.route.some(p=>p.feet===5&&p.node?.startsWith('c:12,11'))));
 g.api.draw();assert.ok(g.api.stairRearConnected(13,12,tiles['13,12']));g.commands.length=0;g.api.drawStairApron(13,12,tiles['13,12']);assert.equal(g.commands.length,0,'a matching triangle replaces the automatic bridge');
 g.api.validatePark({...JSON.parse(g.storage.get('svs01')),tiles,infillDecks:g.api.state().infillDecks});
 g.api.startFanTest();const crowd=g.api.fanState().fans;g.api.advanceFans(420);assert.ok(crowd.every(f=>f.exited));assert.equal(g.api.fanState().fanActive,false);
});
test('solid wall occlusion hides legs behind padding while leaving heads above the wall visible at every camera',()=>{
 const g=game();for(let camera=0;camera<4;camera++){
  const x=camera<2?47.8:48.2,y=18;const crowd=g.api.simulateTraffic([[{x,y,feet:5},{x,y,feet:5}]]),fan=crowd[0];fan.standSeat=true;fan.color='#df5853';g.api.draw();
  const p=g.api.project(x,y),z=g.api.state().zoom,feetScale=Math.abs(g.api.project(x+1,y).x-p.x)/10;
  const leg={x:p.x,y:p.y-5*feetScale-1*z},head={x:p.x,y:p.y-5*feetScale-9*z};
  const cuts=g.api.occlusionCuts(fan).map(poly=>poly.map(p=>[p.x,p.y]));assert.ok(cuts.some(poly=>g.api.pointInPolygon(leg.x,leg.y,poly)),`camera ${camera}: wall covers legs`);assert.ok(!cuts.some(poly=>g.api.pointInPolygon(head.x,head.y,poly)),`camera ${camera}: head above wall remains visible`);
  g.key('q');
 }
});


test('400-foot center field, unchanged foul poles and ten-cell tight foul corners stay outside the expanded perimeter',()=>{
 const g=game(),line=g.api.centerFieldLine;
 assert.ok(Math.abs((line-32)/Math.SQRT2*10-400)<1e-8);
 const cf=g.api.fieldFence.filter(p=>Math.abs(p.a[0]+p.a[1]-line)<1e-8&&Math.abs(p.b[0]+p.b[1]-line)<1e-8);
 assert.ok(cf.length>0);assert.ok(cf.every(p=>p.feet===8));
 for(const panel of g.api.fieldFence)for(const [x,y] of [panel.a,panel.b])assert.ok(g.api.pointInPolygon(x,y,g.api.stadiumBoundary));
 for(let n=0;n<10;n++){
  assert.ok(g.api.fieldFence.some(p=>Math.abs(p.a[0]-(38+n))<1e-8&&p.a[1]===13&&p.b[1]===13));
  assert.ok(!g.api.footprintError(38+n,12,{type:'path',rot:0}));
  assert.ok(!g.api.footprintError(16,34+n,{type:'path',rot:0}));
 }
 assert.ok(g.api.footprintError(40,36,{type:'path',rot:0}));
 assert.ok(g.api.insideStadium(46,47));
});
test('field expansion refunds only swallowed old construction once and preserves the current two-level park',()=>{
 const saved={version:2,fieldRevision:6,money:10000,tiles:{'42,36':{type:'stand',rot:1,baseFeet:0},'12,5':{type:'path',rot:0}},edges:{}};
 const g=game(saved);assert.equal(g.api.state().money,11800);assert.ok(!g.api.state().tiles['42,36']);assert.ok(g.api.state().tiles['12,5']);
 assert.equal(game(JSON.parse(g.storage.get('svs01'))).api.state().money,11800);
 const park=JSON.parse(fs.readFileSync(new URL('./fixtures/two-level-wedge-v038.json',`file://${__filename}`),'utf8'));
 const original=JSON.stringify(park.tiles),p=game(park);assert.equal(JSON.stringify(p.api.state().tiles),original);assert.equal(p.api.state().money,park.money);
});
test('upper wedge metadata reaches reserved fan seats and all 100 visitors exit the reported park',()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('./fixtures/two-level-wedge-v038.json',`file://${__filename}`),'utf8'));
 const g=game(saved);g.api.startFanTest();const crowd=g.api.fanState().fans;assert.equal(crowd.length,100);
 assert.ok(crowd.every(f=>f.route.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.feet||0))));
 g.api.advanceFans(40);assert.ok(crowd.every(f=>f.seated));g.api.advanceFans(100);assert.ok(crowd.every(f=>f.exited));
});
test('bathroom meter grows, queues use at most two stalls, parties take independent trips and return before exiting',()=>{
 for(const seed of [39,51,71]){
 const saved=JSON.parse(fs.readFileSync(new URL('./fixtures/two-level-wedge-v038.json',`file://${__filename}`),'utf8'));
 saved.tiles['10,4']={type:'restroom',rot:0};
 const g=game(saved,seededRandom(seed));g.api.startFanTest();const crowd=g.api.fanState().fans,targets=crowd.map(f=>({...f.seatTarget}));
 let used=false,returned=false,partySplit=false;
 for(let t=0;t<210&&g.api.fanState().fanActive;t++){
  g.api.advanceFans(1);
  const using=crowd.filter(f=>f.activity==='using restroom');assert.ok(using.length<=2);used ||=using.length>0;
  returned ||=crowd.some(f=>f.bathroomVisits>0&&f.seated);
  partySplit ||=crowd.some(f=>f.activity==='to restroom'&&crowd.some(other=>other!==f&&other.partyId===f.partyId&&other.seated));
  assert.ok(crowd.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));
  for(let i=0;i<crowd.length;i++)if(crowd[i].seated){assert.ok(g.api.fanDistance(crowd[i],targets[i])<1e-7);}
 }
 assert.ok(used);assert.ok(returned);assert.ok(partySplit);assert.ok(crowd.every(f=>f.exited));
 assert.match(g.element('fanStatus').textContent,/restroom round trips completed/);
 }
});
test('missing bathrooms report the problem without stranding fans',()=>{
 const g=game();g.api.buildStandDemo();g.api.startFanTest();const crowd=g.api.fanState().fans;
 g.api.advanceFans(100);assert.ok(crowd.every(f=>f.seated));assert.ok(crowd.some(f=>f.bathroomBlocked));
 g.api.updateFanPanel();assert.match(g.element('fanDetails').textContent,/No reachable restroom/);
 g.api.advanceFans(300);assert.ok(crowd.every(f=>f.exited));
});
