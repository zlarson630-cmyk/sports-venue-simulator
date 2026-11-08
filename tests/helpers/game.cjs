const vm = require("node:vm");
const fs = require("node:fs");
const defaultSource = fs.readFileSync(new URL("../../public/game.js", `file://${__filename}`), "utf8");

// Exercise the actual game and its event handlers without a browser dependency.
// Canvas commands are recorded so tests can check world geometry, not just counters.
function game(saved, random=()=>0.5, options={}) {
  const source=options.sourceText||defaultSource;
  const frames=[];
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
          if(options.record!==false)commands.push([name, ...args]);
        },
      set: (_,name,value) => {if(options.record!==false)commands.push(["style",name,value]);return true;},
    },
  );
  function element(id) {
    if (!elements.has(id))
      elements.set(id, {
        id,
        hidden:id==="guestManager",
        style:{},
        dataset:{},
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
        setAttribute(name,value){this[name]=value;},
        children: [],
        replaceChildren(...nodes){this.children=nodes;},
        appendChild(node){this.children.push(node);},
        showModal(){this.open=true;},
        close(){this.open=false;},
      });
    return elements.get(id);
  }
  const toolButtons = [
    "inspect", "inspectFan", "foundation",
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
    "tree", "baseballStatue", "restroom", "drinks", "iceCream", "souvenir", "basicScoreboard", "deluxeScoreboard", "videoScoreboard", "vintageScoreboard",
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
      createElement: tag => tag==="canvas"&&options.cacheCanvas?{width:0,height:0,getContext:()=>({drawImage(){}})}:({tagName:tag.toUpperCase(),click(){this.onclick?.();this.listeners?.click?.();},textContent:"",children:[],listeners:{},classList:{add(){},remove(){},toggle(){}},appendChild(node){this.children.push(node);},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this[name]=value;}}),
    },
    window: { addEventListener: (key, fn) => (keys[key] = fn) },
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    confirm: () => true,
    prompt: options.prompt || (()=>"New Ballpark"),
    ResizeObserver: class {
      observe() {}
    },
    setTimeout: () => 1,
    clearTimeout() {},
  };
  if(options.animationFrames)context.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  vm.createContext(context);
  vm.runInContext(
    source.replace(
      /update\(\);\s*resize\(\);\s*\}\)\(\);\s*$/,
      "globalThis.inspect={parkPayload,renderParkMenu,initializeParkMenu,guestAction,guestFilterMatch,guestSpending,renderGuestManager,gameDayStage,buildPostgameReport,showPostgameReport,fanHappinessScore,fanThought,venueExperienceReport,applyEntertainment,fanFoodType,groundClearance,supportColumns,columnError,isHollow,groundLayout,underlaysState:()=>underlays,benchmarkZoom:()=>{zoom=Math.min(6,zoom*1.18);draw();},renderStats:()=>typeof renderStats===\"undefined\"?null:{...renderStats},delayArrivals:seconds=>fans.forEach(f=>f.start+=seconds),prepareAmenities,startAmenityTrip,updateFanPanel,centerFieldLine,insideStadium,polygonsOverlap,drawFieldFence,sharedSegment,surfaceSeams,walkingSurfaces,stairEnds,infillPlacement,clipFaceDepth,occlusionCuts,captureFace,drawVisibleFan,simulateTraffic:routes=>{fanActive=true;fanPhase=\"game\";fanElapsed=0;departureElapsed=0;fans=routes.map((r,i)=>({route:laneRoute(r),index:0,...r[0],start:0,spawned:true,seated:false,exited:false,paid:true,standSeat:false,gateIndex:0,exitStart:0}));return fans;},rowSeats,standShift,fenceSnap,drawStairApron,stairRearConnected,cornerRowSpan,cornerSeatPoint,accessReport,validAccessPiece,connectLegacyGate,groundItem,automaticPath,laneRoute,TRAFFIC_LANE,cornerPoint,cornerPorts,cornerCols,rowNeighbor,deckShape,deckCenter,deckOpening,deckRailSegments,pointInPolygon,buildCornerDemo,drawPartialDeck,drawNeighborhood,buildBackstopDemo,parkingLot,parkingSpawn,neighborhood,streetLamps,colors,partySeatPlan,footprint,footprintError,overlaps,stairEntrance,drawConcourse,buildDiagonalDemo,halfContains,entrancePavedAt,entrancePaving,halfCorners,pathPoint,pathOpens,buildConcourseDemo,concoursePlacement,concourseConnection,buildSideEntryDemo,standPlacement,standPoint,standAxes,drawStandRow,seatCapacity,project,inverse,diamond,drawObject,approachRoute,solidBuildingAt,defensivePlayers,draw,PAVEMENT,buildStandDemo,reachableSeats,startFanTest,advanceFans,buildFanDemo,arrivalSchedule,FAN_SPACE,fanDistance,fanState:()=>({fans,fanActive,fanElapsed,fanPhase,departureElapsed}),roadsideTrees,siteTemplate,stadiumBoundary,outerFence,mainGate,dugouts,drawDugout,warningTrack,warningTrackWidth,fieldFence,homeWorld,basesWorld,fenceCorners,wallEdge,edgePanel,validatePark,state:()=>({tiles,edges,infillDecks,money,rot,cameraRot,team,zoom}),setHover:(x,y)=>{hover={x,y}},action};update();resize();})();",
    ),
    context,
  );
  const api = context.inspect;
  return {
    api,
    commands,
    frames,
    flushFrame(time=0){for(const fn of frames.splice(0))fn(time);},
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

module.exports={game};
