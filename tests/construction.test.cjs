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
function game(saved) {
  const commands = [],
    elements = new Map(),
    storage = new Map(saved ? [["svs01", JSON.stringify(saved)]] : []);
  const ctx = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...args) =>
          commands.push([name, ...args]),
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
    "path",
    "bleacher",
    "wall",
    "gate",
    "concession",
    "restroom",
    "erase",
  ].map((t) => {
    const button = element("tool-" + t);
    button.dataset = { tool: t };
    return button;
  });
  const keys = {};
  const context = {
    console,
    Math,
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
      "globalThis.inspect={project,inverse,diamond,drawObject,draw,PAVEMENT,reachableSeats,startFanTest,advanceFans,buildFanDemo,fanState:()=>({fans,fanActive,fanElapsed}),roadsideTrees,siteTemplate,stadiumBoundary,outerFence,mainGate,dugouts,drawDugout,warningTrack,warningTrackWidth,fieldFence,homeWorld,basesWorld,fenceCorners,wallEdge,edgePanel,validatePark,state:()=>({tiles,edges,money,rot,cameraRot}),setHover:(x,y)=>{hover={x,y}},action};update();resize();})();",
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
  assert.equal(g.api.state().money, 99900);
  g.clickTile(12, 12);
  g.clickTile(20, 20);
  assert.equal(Object.keys(g.api.state().tiles).length, 1);
  const reload = game(JSON.parse(g.storage.get("svs01")));
  assert.equal(reload.api.state().tiles["12,12"].type, "path");
  g.element("undo").click();
  assert.equal(g.api.state().money, 100000);
  assert.equal(Object.keys(g.api.state().tiles).length, 0);
});
test("click placement selects the same world tile after camera rotation", () => {
  const g = game();
  for (let i = 0; i < 4; i++) {
    g.key("q");
    g.clickTile(12 + i, 5);
    assert.ok(g.api.state().tiles[`${12 + i},5`]);
  }
  assert.equal(g.api.state().money, 99600);
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
  assert.equal(g.api.state().money, 99800);
  g.select("erase");
  g.clickTile(12, 12);
  assert.equal(g.api.state().money, 99940);
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
    for (const coord of [...p.a, ...p.b]) assert.ok(Math.abs(coord - Math.round(coord)) < 1e-10);
    const foul = (p.a[0]+p.b[0])/2 < 18 || (p.a[1]+p.b[1])/2 < 14;
    assert.equal(p.feet, foul ? 3 : 8);
  });
});

test("edge walls coexist with paths, reject shared-edge duplicates and survive save/undo",()=>{
  const g=game(); g.select("wall"); g.clickTile(12,12);
  g.select("path"); g.clickTile(12,12);
  assert.ok(g.api.state().tiles["12,12"]); assert.ok(g.api.state().edges["12,12:h"]);
  g.select("wall"); g.key("r"); g.key("r"); g.clickTile(12,11);
  assert.equal(g.api.state().money,99700);
  const reload=game(JSON.parse(g.storage.get("svs01")));
  assert.ok(reload.api.state().edges["12,12:h"]); assert.ok(reload.api.state().tiles["12,12"]);
  g.element("undo").click(); assert.equal(g.api.state().money,99800);
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
 assert.equal(m.a[0]+m.a[1],23);assert.equal(m.b[0]+m.b[1],23);
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
 assert.ok(ts.every(t=>t.x===8.7||t.x===53.3||t.y===4.7||t.y===49.3));
 assert.ok(ts.every(t=>!(t.x+t.y<28&&Math.abs(t.x-t.y-4)<3.5)));
 for(const side of [t=>t.x===8.7,t=>t.x===53.3,t=>t.y===4.7,t=>t.y===49.3]) assert.ok(ts.some(side));
});

test("dugouts measure 30 feet along the fence by 10 feet deep with roofs",()=>{
 const ds=game().api.dugouts;
 for(const d of ds) {assert.equal(d.length*10,30);assert.equal(d.width*10,10);assert.ok(d.roofHeightFeet>0);}
 assert.equal(ds[0].y+ds[0].width,10);assert.equal(ds[1].x+ds[1].width,14);
});

test("demo fans walk from street through gate to seats and unreachable sections are excluded",()=>{
 const g=game();assert.equal(g.api.reachableSeats().length,0);
 g.api.buildFanDemo();assert.equal(g.api.state().money,98000);
 assert.equal(g.api.reachableSeats().length,1);
 g.api.startFanTest();assert.equal(g.api.fanState().fans.length,24);
 g.api.advanceFans(1);assert.ok(g.api.fanState().fans[0].x>6);
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
 assert.equal(fs.filter(f=>f.sectionKey==="15,8").length,13);
 assert.equal(fs.filter(f=>f.sectionKey==="17,8").length,12);
 assert.equal(new Set(fs.map(f=>f.sectionKey+":"+f.seat)).size,25);
 assert.deepEqual(fs.filter(f=>f.sectionKey==="15,8").slice(0,4).map(f=>f.seat).join(","),"0,23,7,16");
 for(let i=0;i<600;i++)g.api.advanceFans(0.1);
 const report=g.element("fanStatus").textContent;
 assert.match(report,/All 25 arriving fans are seated/);assert.match(report,/23 reachable seats remain empty/);
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
