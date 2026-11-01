(() => {
  "use strict";
  const PAVEMENT = "#dedbc9", PAVEMENT_EDGE = "#aaa99c";
  const W = 60,
    H = 60,
    TW = 38,
    TH = 19,
    prices = {
      path: 100,
      halfPath: 50,
      concourse: 900,
      bleacher: 1500,
      stand: 1800,
      stairStand: 1600,
      stairs:1200,
      ramp:3600,
      cornerLanding:700,
      backstopStand:1800,
      backstopStair:1600,
      endStairLeft: 1200,
      endStairRight: 1200,
      wall: 200,
      gate: 800,
      concession: 2500,
      restroom: 2000,
      drinks:2200,
      iceCream:2300,
      souvenir:3000,
      basicScoreboard:5000,
      deluxeScoreboard:12000,
      videoScoreboard:25000,
      vintageScoreboard:8000,
    };
  const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d"),
    wrap = document.getElementById("worldwrap");
  let dpr = 1,
    zoom = 1.14,
    panX = 0,
    panY = 0,
    cameraRot = 0,
    tool = "path",
    rot = 0,
    hover = null,
    pointer = null,
    cameraInit = false,
    down = null,
    dragged = false,
    money = 500000,
    tiles = {},
    edges = {},
    history = [];
  const defaultTeam={primary:"#31566b",secondary:"#edc75b",accent:"#fff0c9",fenceMaterial:"chain"};
  let team={...defaultTeam};
  const colors=item=>item?.customColors||team;
  const validColor=value=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value);
  function cleanColors(value) {
    if(!value||!["primary","secondary","accent"].every(k=>validColor(value[k])))throw Error("Invalid team colors");
    return {primary:value.primary,secondary:value.secondary,accent:value.accent};
  }
  const snapshot=()=>({tiles:{...tiles},edges:{...edges},money,team:{...team}});
  const homeWorld = [18,14], baseSpacing = 9;
  const basesWorld = [homeWorld,[27,14],[27,23],[18,23]];
  const fenceCorners = [[14,14],[18,10],[48,10],[48,27],[31,44],[14,44]];
  const warningTrackWidth = 1.5; // 15 feet, measured perpendicular to the fence.
  const diagonalInset = warningTrackWidth * Math.SQRT2;
  const warningTrack = [[48,14],[48,27],[31,44],[18,44],
    [18,44-warningTrackWidth],[31-diagonalInset+warningTrackWidth,44-warningTrackWidth],
    [48-warningTrackWidth,27-diagonalInset+warningTrackWidth],[48-warningTrackWidth,14]];
  const field = new Set();
  for(let x=14;x<48;x++) for(let y=10;y<44;y++)
    if(x+y>=27 && x+y<=74) field.add(`${x},${y}`);
  const dugoutTiles = new Set();
  for(let x=22;x<25;x++) for(let y=9;y<10;y++) dugoutTiles.add(`${x},${y}`);
  for(let x=13;x<14;x++) for(let y=18;y<21;y++) dugoutTiles.add(`${x},${y}`);
  const blockedTile = k => field.has(k) || dugoutTiles.has(k);
  const key = (x, y) => x + "," + y;
  function rotated(x, y) {
    const c = 30;
    let a = x - c,
      b = y - c;
    switch (cameraRot) {
      case 1:
        return { x: -b + c, y: a + c };
      case 2:
        return { x: -a + c, y: -b + c };
      case 3:
        return { x: b + c, y: -a + c };
      default:
        return { x, y };
    }
  }
  const point = (x, y) => ({ x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 });
  function project(x, y) {
    const q = rotated(x, y),
      p = point(q.x, q.y);
    return { x: p.x * zoom + panX, y: p.y * zoom + panY };
  }
  function inverse(px, py) {
    const sx = (px - panX) / zoom,
      sy = (py - panY) / zoom,
      a = sx / TW + sy / TH,
      b = sy / TH - sx / TW,
      c = 30;
    let x, y;
    switch (cameraRot) {
      case 1:
        x = b;
        y = 60 - a;
        break;
      case 2:
        x = 60 - a;
        y = 60 - b;
        break;
      case 3:
        x = 60 - b;
        y = a;
        break;
      default:
        x = a;
        y = b;
    }
    return { x: Math.floor(x), y: Math.floor(y) };
  }
  function centerField() {
    const pts=streetBoundary.map(p=>project(...p));
    const c={x:(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2,
      y:(Math.min(...pts.map(p=>p.y))+Math.max(...pts.map(p=>p.y)))/2};
    panX += wrap.clientWidth * 0.5 - c.x;
    panY += wrap.clientHeight * 0.48 - c.y;
    draw();
  }
  function rotateCamera() {
    cameraRot = (cameraRot + 1) % 4;
    document.getElementById("cameraRotation").textContent =
      cameraRot * 90 + "°";
    centerField();
    toast("Camera: " + cameraRot * 90 + "°");
  }
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function polygon(pts, fill, stroke = "#70976d", lw = 0.6) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
  function diamond(x, y, fill, stroke) {
    polygon(
      [
        project(x - 0.5, y - 0.5),
        project(x + 0.5, y - 0.5),
        project(x + 0.5, y + 0.5),
        project(x - 0.5, y + 0.5),
      ],
      fill,
      stroke,
      0.8 * zoom,
    );
  }
  function line(a, b, color, width = 2) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * zoom;
    ctx.stroke();
  }
  const directions = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  const amenityTypes=["concession","drinks","iceCream","souvenir","restroom"];
  const scoreboardTypes=["basicScoreboard","deluxeScoreboard","videoScoreboard","vintageScoreboard"];
  const isPath = item => item?.type==="path"||item?.type==="halfPath";
  const halfCorners = rotation => [ [[0,0],[1,0],[0,1]], [[0,0],[1,0],[1,1]], [[1,0],[1,1],[0,1]], [[0,0],[1,1],[0,1]] ][rotation/2];
  function pathPoint(x,y,item) {
    const corners=item?.type==="halfPath"?halfCorners(item.rot):[[0,0],[1,1]];
    return {x:x+corners.reduce((n,p)=>n+p[0],0)/corners.length,y:y+corners.reduce((n,p)=>n+p[1],0)/corners.length,feet:0};
  }
  function pathOpens(item,dx,dy) {
    if(item?.type!=="halfPath")return true;
    if(dx&&dy)return pathOpens(item,dx,0)&&pathOpens(item,0,dy);
    const edge=dx>0?[[1,0],[1,1]]:dx<0?[[0,0],[0,1]]:dy>0?[[0,1],[1,1]]:[[0,0],[1,0]];
    return edge.every(p=>halfCorners(item.rot).some(q=>p[0]===q[0]&&p[1]===q[1]));
  }
  const halfContains=(item,a,b)=>item?.type!=="halfPath"||[a+b<=1+1e-8,a>=b-1e-8,a+b>=1-1e-8,a<=b+1e-8][item.rot/2];
  const entrancePavedAt=(x,y)=>(x<5||y<1)||entrancePaving.some(([a,b])=>x>=a-1e-8&&x<=a+1+1e-8&&y>=b-1e-8&&y<=b+1+1e-8&&halfContains(tiles[key(a,b)],x-a,y-b));
  const entrancePaving=[];
  for(let x=5;x<=14;x++)for(let y=1;y<=10;y++)if(Math.abs(x-y-4)<=2)entrancePaving.push([x,y]);
  const isEndStair = item => item?.type === "endStairLeft" || item?.type === "endStairRight";
  const endSide = item => item.type === "endStairLeft" ? -1 : 1;
  const isSeatSection=item=>item?.type==="stand"||item?.type==="backstopStand";
  const isBackstop=item=>item?.type==="backstopStand"||item?.type==="backstopStair";
  const isStand = item => isSeatSection(item) || item?.type === "stairs" || item?.type === "backstopStair" || item?.type === "stairStand" || isEndStair(item);
  const isDeck=item=>item?.type==="concourse"||item?.type==="cornerLanding";
  const isRamp=item=>item?.type==="ramp";
  const isPlatform = item => isStand(item)||isDeck(item)||isRamp(item);
  const deckOpens=(item,dx,dy)=>item?.type!=="cornerLanding"||pathOpens({type:"halfPath",rot:item.rot},dx,dy);
  const rampPoint=(x,y,item,t)=>{const [dx,dy]=directions[item.rot];return {x:x+0.5+dx*(t-0.5),y:y+0.5+dy*(t-0.5),feet:item.baseFeet+t*5/6};};
  const hasStairs = item => item?.type === "stairs" || item?.type === "backstopStair" || item?.type === "stairStand" || isEndStair(item);
  const rowOpens = (item,side) => !isEndStair(item) || side === -endSide(item);
  const stairCenter = item => isEndStair(item) ? -endSide(item)*0.25 : 0;
  const seatCapacity = item => item?.type === "bleacher" ? 24 : isSeatSection(item) ? 20 : (item?.type === "stairStand"||item?.type==="backstopStair") ? 8 : 0;
  const FT = TW / 20, STAND_RISE = 5;
  function standAxes(rotation) {
    const [ax,ay]=directions[rotation];
    return {ax,ay,bx:-ay,by:ax}; // a = across the row; b = uphill, away from the field.
  }
  function standPoint(x,y,item,a,b,feet=item.baseFeet||0) {
    const {ax,ay,bx,by}=standAxes(item.rot);
    const depth=isBackstop(item)?b*1.5-0.25:b;
    return {x:x+0.5+ax*a+bx*depth,y:y+0.5+ay*a+by*depth,feet};
  }
  function matchingStand(x,y,item,da,db) {
    const {ax,ay,bx,by}=standAxes(item.rot),nx=x+ax*da+bx*db,ny=y+ay*da+by*db;
    const next=tiles[key(nx,ny)];
    return !(isBackstop(item)&&db!==0)&&isStand(next)&&next.rot===item.rot&&isBackstop(next)===isBackstop(item)&&next.baseFeet===(item.baseFeet||0)+db*STAND_RISE&&!wallBlocks(key(x,y),key(nx,ny));
  }
  const neighborOffsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  function footprint(x,y,item) {
    if(isRamp(item)){const [dx,dy]=directions[item.rot];return [[0,-0.5],[6,-0.5],[6,0.5],[0,0.5]].map(([t,a])=>{const p=rampPoint(x,y,item,t);return [p.x-dy*a,p.y+dx*a];});}
    if(item?.type==="cornerLanding")return halfCorners(item.rot).map(([a,b])=>[x+a,y+b]);
    if(isStand(item))return [[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]].map(([a,b])=>{const p=standPoint(x,y,item,a,b);return [p.x,p.y];});
    return (item?.type==="halfPath"?halfCorners(item.rot):[[0,0],[1,0],[1,1],[0,1]]).map(([a,b])=>[x+a,y+b]);
  }
  function overlaps(a,b) {
    for(const poly of [a,b])for(let i=0;i<poly.length;i++) {
      const q=poly[i],r=poly[(i+1)%poly.length],axis=[q[1]-r[1],r[0]-q[0]];
      const ap=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),bp=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);
      if(Math.max(...ap)<=Math.min(...bp)+1e-8||Math.max(...bp)<=Math.min(...ap)+1e-8)return false;
    }
    return true;
  }
  function footprintError(x,y,item,layout=tiles,walls=edges) {
    const shape=footprint(x,y,item);
    if([...neighborhood,{...parkingLot,w:parkingLot.width,d:parkingLot.depth}].some(b=>overlaps(shape,[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.d],[b.x,b.y+b.d]])))return "Neighborhood scenery is outside the construction area.";
    if(isBackstop(item)&&overlaps(shape,fenceCorners))return "Seating must remain outside the backstop fence.";
    if(shape.some(([a,b])=>a<0||a>W||b<0||b>H))return "Section extends outside the map.";
    // Diagonal sections and six-cell ramps extend outside their anchor cell. Check both directions
    // so later paths/buildings cannot be placed inside their triangular corners.
    if(!isRamp(item))for(const [rk,rv] of Object.entries(layout))if(isRamp(rv)){const [a,b]=rk.split(",").map(Number);if((a!==x||b!==y)&&overlaps(shape,footprint(a,b,rv)))return "Section footprint overlaps construction. Leave its footprint clear.";}
    const radius=isRamp(item)?7:2;
    for(let a=x-radius;a<=x+radius;a++)for(let b=y-radius;b<=y+radius;b++) {
      const k=key(a,b),v=layout[k];
      if((dugoutTiles.has(k)||(!isBackstop(item)&&field.has(k)))&&overlaps(shape,footprint(a,b,{type:"path"})))return "Section overlaps the field or dugout.";
      if((a!==x||b!==y)&&v&&(isStand(item)&&item.rot%2||isStand(v)&&v.rot%2||isRamp(item)||isRamp(v)||item.type==="cornerLanding"||v.type==="cornerLanding")&&overlaps(shape,footprint(a,b,v)))return "Section footprint overlaps construction. Leave its footprint clear.";
      for(const axis of ["h","v","a","d"])if(walls[k+":"+axis]) {
        const {a:start,b:end}=edgePanel(k+":"+axis),dx=end[0]-start[0],dy=end[1]-start[1],epsilon=1e-5;
        const strip=[[start[0]-dy*epsilon,start[1]+dx*epsilon],[end[0]-dy*epsilon,end[1]+dx*epsilon],[end[0]+dy*epsilon,end[1]-dx*epsilon],[start[0]+dy*epsilon,start[1]-dx*epsilon]];
        if(((isStand(item)&&item.rot%2)||isRamp(item))&&overlaps(shape,strip))return "A wall crosses the section footprint.";
      }
    }
    return null;
  }
  function standPlacement(x,y,rotation) {
    if(isRamp({type:tool})) {
      const item={type:tool,rot:rotation,baseFeet:0},error=footprintError(x,y,item);if(error)return {error};
      const [dx,dy]=directions[rotation],a=tiles[key(x-dx,y-dy)],b=tiles[key(x+dx*6,y+dy*6)];
      const heights=[];if(isDeck(a))heights.push(a.baseFeet);if(isPath(a))heights.push(0);if(isDeck(b))heights.push(b.baseFeet-5);
      if(heights.some(h=>h!==heights[0]))return {error:"Ramp endpoints need a five-foot height difference."};
      const baseFeet=heights[0]??0;return baseFeet<0||baseFeet>295?{error:"Ramp base must be 0–295 ft."}:{baseFeet};
    }
    if(isDeck({type:tool}))return concoursePlacement(x,y);
    const error=footprintError(x,y,{type:tool,rot:rotation});if(error)return {error};
    const {ax,ay,bx,by}=standAxes(rotation),heights=[];
    for(const [da,db] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const next=tiles[key(x+ax*da+bx*db,y+ay*da+by*db)];
      if(isStand(next)&&next.rot===rotation&&isBackstop(next)===isBackstop({type:tool})&&(!isBackstop(next)||db===0))heights.push(next.baseFeet-db*STAND_RISE);
      if(isDeck(next)&&db!==0)heights.push(next.baseFeet-(db===1?5:0));
    }
    if(heights.some(h=>h!==heights[0]))return {error:"These neighbors have conflicting heights. Leave a gap or undo the mismatched section."};
    const baseFeet=heights[0]??0;
    if(baseFeet<0||baseFeet>300)return {error:"Start at ground level and build uphill behind the front row."};
    return {baseFeet};
  }
  function concourseConnection(x,y,item,dx,dy) {
    const next=tiles[key(x+dx,y+dy)];
    if(!deckOpens(item,dx,dy)||wallBlocks(key(x,y),key(x+dx,y+dy)))return null;
    for(const [rk,rv] of Object.entries(tiles))if(isRamp(rv)){const [a,b]=rk.split(",").map(Number),[rx,ry]=directions[rv.rot];if(x===a+rx*6&&y===b+ry*6&&dx===-rx&&dy===-ry&&item.baseFeet===rv.baseFeet+5)return {kind:"rampTop",key:rk};}
    if(!next||!deckOpens(next,-dx,-dy))return null;
    if(Math.abs(dx)+Math.abs(dy)===1&&isDeck(next)&&next.baseFeet===item.baseFeet)return {kind:"deck"};
    if(Math.abs(dx)+Math.abs(dy)===1&&isPath(next)&&pathOpens(next,-dx,-dy)&&item.baseFeet===0)return {kind:"ground"};
    if(isRamp(next)){const [rx,ry]=directions[next.rot];if(dx===rx&&dy===ry&&item.baseFeet===next.baseFeet)return {kind:"rampBottom",key:key(x+dx,y+dy)};}
    if(hasStairs(next)) {
      const {ax,ay,bx,by}=standAxes(next.rot),scale=ax*ax+ay*ay,a=(-dx*ax-dy*ay)/scale,b=(-dx*bx-dy*by)/scale;
      if(a===0&&b===1&&item.baseFeet===next.baseFeet+5)return {kind:"top"};
      if(a===0&&b===-1&&item.baseFeet===next.baseFeet)return {kind:"bottom"};
      if(isEndStair(next)&&b===0&&a===endSide(next)&&item.baseFeet===next.baseFeet)return {kind:"landing"};
    }
    return null;
  }
  function concoursePlacement(x,y) {
    const heights=[];
    for(const [rk,rv] of Object.entries(tiles))if(isRamp(rv)){const [a,b]=rk.split(",").map(Number),[dx,dy]=directions[rv.rot];if(x===a-dx&&y===b-dy)heights.push(rv.baseFeet);if(x===a+dx*6&&y===b+dy*6)heights.push(rv.baseFeet+5);}
    for(const [dx,dy] of neighborOffsets) {
      const next=tiles[key(x+dx,y+dy)];
      if(Math.abs(dx)+Math.abs(dy)===1&&isDeck(next))heights.push(next.baseFeet);
      if(hasStairs(next)) {
        const {ax,ay,bx,by}=standAxes(next.rot),scale=ax*ax+ay*ay,a=(-dx*ax-dy*ay)/scale,b=(-dx*bx-dy*by)/scale;
        if(a===0&&b===1)heights.push(next.baseFeet+5);
        if((a===0&&b===-1)||(isEndStair(next)&&b===0&&a===endSide(next)))heights.push(next.baseFeet);
      }
    }
    if(heights.some(h=>h!==heights[0]))return {error:"Concourse neighbors have different heights. Connect them with stairs."};
    if((heights[0]??0)>300)return {error:"Concourse height exceeds the supported range."};
    return {baseFeet:heights[0]??0};
  }
  function drawConcourse(x,y,item,rails=false,patch=null,railIndex=null) {
    const h=item.baseFeet*FT,p=(a,b,z=h)=>{const q=project(x+a,y+b);q.y-=z*zoom;return q;};
    const corners=patch?[[patch[0],patch[1]],[patch[0]+0.25,patch[1]],[patch[0]+0.25,patch[1]+0.25],[patch[0],patch[1]+0.25]]:[[0,0],[1,0],[1,1],[0,1]];
    if(!rails) {
      for(let i=0;i<4;i++) {
        const a=corners[i],b=corners[(i+1)%4];
        if(patch&&!((a[0]===0&&b[0]===0)||(a[0]===1&&b[0]===1)||(a[1]===0&&b[1]===0)||(a[1]===1&&b[1]===1)))continue;
        polygon([p(...a,h-0.8),p(...b,h-0.8),p(...b),p(...a)],"#9baba9","#7d9293",0.5);
        if(h>0&&a.every(n=>n===0||n===1))line(p(...a,0),p(...a,h),"#839798",2);
      }
      polygon(corners.map(c=>p(...c)),PAVEMENT,patch?null:"#a9b7b1",0.6);
    } else if(h>0) {
      for(const [i,dx,dy] of [[0,0,-1],[1,1,0],[2,0,1],[3,-1,0]]) {
        if(railIndex!==null&&i!==railIndex)continue;
        if(concourseConnection(x,y,item,dx,dy))continue;
        const a=corners[i],b=corners[(i+1)%4];
        line(p(...a),p(...a,h+3*FT),"#607c88",1);
        line(p(...b),p(...b,h+3*FT),"#607c88",1);
        line(p(...a,h+3*FT),p(...b,h+3*FT),"#a9c3c5",1.2);
      }
    }
  }
  // Each row is a separate painter entry, so fans and neighboring sections share depth order.
  function drawRampPatch(x,y,item,n) {
    const [dx,dy]=directions[item.rot],t=n/4,at=(u,a,h=0)=>{const w=rampPoint(x,y,item,u),p=project(w.x-dy*a,w.y+dx*a);p.y-=(w.feet+h)*FT*zoom;return p;};
    polygon([at(t,-0.5),at(t+0.25,-0.5),at(t+0.25,0.5),at(t,0.5)],PAVEMENT,null);
    for(const a of [-0.48,0.48]){line(at(t,a,3),at(t+0.25,a,3),"#a4b5b9",1.2);if(n%4===0)line(at(t,a),at(t,a,3),"#627986",1);if(n===23)line(at(6,a),at(6,a,3),"#627986",1);}
  }
  function drawStandRow(x,y,item,row) {
    const palette=colors(item),base=item.baseFeet||0,b=-0.5+row/4,top=base+(row+1)*1.25;
    const screen=(a,b,feet)=>{const w=standPoint(x,y,item,a,b,feet),p=project(w.x,w.y);p.y-=feet*FT*zoom;return p;};
    const face=(points,fill,stroke=null)=>polygon(points.map(p=>screen(...p)),fill,stroke,0.6*zoom);
    const prism=(a,b,w,depth,bottom,top,side,color,hideSides=[])=>{
      const cs=[[a,b],[a+w,b],[a+w,b+depth],[a,b+depth]],cy=screen(a+w/2,b+depth/2,0).y;
      for(let i=0;i<4;i++) {
        if(hideSides.includes(i))continue;
        const v=cs[i],n=cs[(i+1)%4];
        if((screen(...v,0).y+screen(...n,0).y)/2<cy-0.001)continue;
        face([[...v,bottom],[...n,bottom],[...n,top],[...v,top]],side);
      }
      face(cs.map(c=>[...c,top]),color);
    };
    if(item.type==="stairs") {
      const steps=[0,1].sort((a,c)=>screen(0,b+a*0.125,0).y-screen(0,b+c*0.125,0).y);
      for(const n of steps){const h=base+row*1.25+(n+1)*0.625,sb=b+n*0.125;
        prism(-0.5,sb,1,0.125,h-0.625,h,"#8e9898","#e1e0d4");
        line(screen(-0.5,sb,h+0.01),screen(0.5,sb,h+0.01),"#edc75b",0.8);
      }
      for(const a of [-0.48,0.48]){line(screen(a,b,top-1.25),screen(a,b,top+1.75),"#627986",1);line(screen(a,b,top+1.75),screen(a,b+0.25,top+3),"#a4b5b9",1);}
      return;
    }
    if(isEndStair(item)) {
      const side=endSide(item),inner=-side,sa=side>0?-0.5:0,la=side>0?0:-0.5;
      const along=(a,b1,b2,h)=>line(screen(a,b1,h+3),screen(a,b2,h+3),"#8ca2aa",1);
      // The outer half is a level landing, never a ramp to the elevated rows.
      prism(la,b,0.5,0.25,0,base+0.04,"#8e9898","#dedbc9",[0,2]);
      for(const n of [0,1].sort((a,c)=>screen(0,b+a*0.125,0).y-screen(0,b+c*0.125,0).y)) {
        const h=base+row*1.25+(n+1)*0.625,sb=b+n*0.125;
        prism(sa,sb,0.5,0.125,h-0.625,h,"#8e9898","#e1e0d4",[2]);
        line(screen(sa,sb,h+0.01),screen(sa+0.5,sb,h+0.01),"#edc75b",0.8);
      }
      // Separate the rising stair from the lower side landing with a handrail.
      const railStart=row===0?b+0.125:b;
      along(0,railStart,b+0.25,top);
      line(screen(0,railStart,top),screen(0,railStart,top+3),"#627986",0.8);
      if(!matchingStand(x,y,item,inner,0))along(inner*0.5,b,b+0.25,top);
      // Leave the middle five feet open for the walkway side entrance.
      if(row===0||row===3)along(side*0.5,b,b+0.25,base);
      if(row===0&&!fanActive) {
        line(screen(side*0.78,0,base+0.1),screen(side*0.48,0,base+0.1),"#78d5bd",2);
        polygon([screen(side*0.37,0,base+0.1),screen(side*0.51,-0.09,base+0.1),screen(side*0.51,0.09,base+0.1)],"#78d5bd","#2f705e",0.5);
      }
      return;
    }
    const left=matchingStand(x,y,item,-1,0),right=matchingStand(x,y,item,1,0);
    const front=row>0||matchingStand(x,y,item,0,-1),back=row<3||matchingStand(x,y,item,0,1)|| (hasStairs(item)&&(()=>{const {bx,by}=standAxes(item.rot),n=tiles[key(x+bx,y+by)];return isDeck(n)&&n.baseFeet===base+5&&!wallBlocks(key(x,y),key(x+bx,y+by));})());
    const hidden=[...(front?[0]:[]),...(right?[1]:[]),...(back?[2]:[]),...(left?[3]:[])];
    // Full-width concrete tiers meet exactly at tile edges, without duplicate end rails.
    if(isSeatSection(item))prism(-0.5,b,1,0.25,0,top,"#8e9898","#c9ceca",hidden);
    else {
      prism(-0.5,b,0.2,0.25,0,top,"#8e9898","#c9ceca",[0,1,2,...(left?[3]:[])]);
      prism(0.3,b,0.2,0.25,0,top,"#8e9898","#c9ceca",[0,2,3,...(right?[1]:[])]);
      for(const step of [0,1].sort((a,c)=>screen(0,b+a*0.125,0).y-screen(0,b+c*0.125,0).y)) {
        const h=base+row*1.25+(step+1)*0.625,sb=b+step*0.125;
        prism(-0.3,sb,0.6,0.125,h-0.625,h,"#8e9898","#e1e0d4",[1,2,3,...(step===0&&front?[0]:[])]);
        line(screen(-0.3,sb,h+0.01),screen(0.3,sb,h+0.01),"#edc75b",0.8);
      }
    }
    const seats=isSeatSection(item)?[-0.4,-0.2,0,0.2,0.4]:[-0.4,0.4];
    for(const a of seats) {
      // Five 2-foot seat bays, or one bay on either side of the 6-foot stair aisle.
      prism(a-0.075,b+0.10,0.15,0.11,top,top+1.4,palette.primary,palette.secondary);
      prism(a-0.075,b+0.205,0.15,0.025,top+1.4,top+2.8,palette.primary,palette.primary);
    }
    const rail=(a1,b1,a2,b2,h)=>{
      line(screen(a1,b1,h),screen(a1,b1,h+3),"#627986",0.8);
      line(screen(a1,b1,h+3),screen(a2,b2,h+3),"#a4b5b9",1);
    };
    if(!left)rail(-0.5,b,-0.5,b+0.25,top);
    if(!right)rail(0.5,b,0.5,b+0.25,top);
    if(row===3&&!back) {
      if(isSeatSection(item))rail(-0.5,0.5,0.5,0.5,top);
      else {rail(-0.5,0.5,-0.3,0.5,top);rail(0.3,0.5,0.5,0.5,top);}
    }
    if(!fanActive) {
      line(screen(-0.5,b,top+0.02),screen(0.5,b,top+0.02),"#95a4a3",0.4);
      if(row===0) {
        line(screen(0,-0.5,base+0.1),screen(0,-0.66,base+0.1),"#ffda57",1.5);
        polygon([screen(0,-0.76,base+0.1),screen(-0.09,-0.62,base+0.1),screen(0.09,-0.62,base+0.1)],"#ffda57",null);
      }
    }
    if(row===0&&disconnectedSections.has(key(x,y))) {
      const p=screen(0,0,base+8);ctx.font=`bold ${8*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#a51e2a";ctx.fillText("NO SEAT ROUTE",p.x,p.y);
    }
  }
  function stairEntrance(x,y,item) {
    const {ax,ay,bx,by}=standAxes(item.rot),dx=isEndStair(item)?ax*endSide(item):-bx,dy=isEndStair(item)?ay*endSide(item):-by;
    const k=key(x,y),outside=key(x+dx,y+dy),next=tiles[outside];
    const connected=accessibleNodes.has(`t:${k}:-1`);
    let message="Connected to gate";
    if(!connected) {
      if(wallBlocks(k,outside))message="Entrance blocked by wall";
      else if(item.baseFeet>0)message=`Needs connected landing at ${item.baseFeet} ft or stairs below`;
      else if(!isPath(next)&&!isDeck(next))message="Add walkway on highlighted tile";
      else if(next?.type==="halfPath"&&!pathOpens(next,-dx,-dy))message="Complete the entrance walkway tile";
      else if(isDeck(next)&&next.baseFeet!==item.baseFeet)message="Entrance and landing heights differ";
      else message="Entry walkway needs a continuous route to the main gate";
    }
    if(isEndStair(item))message+=" · 5 ft side landing + highlighted entry tile; connect that walkway to the gate";
    return {dx,dy,outside,connected,message};
  }
  function drawStairEntrance(x,y,item) {
    const info=stairEntrance(x,y,item),color=info.connected?"#2fbd84":"#dc5b42";
    const shape=footprint(x+info.dx,y+info.dy,{type:"path"});
    const screen=([a,b])=>{const p=project(a,b);p.y-=item.baseFeet*FT*zoom;return p;};
    polygon(shape.map(screen),info.connected?"#2fbd8424":"#dc5b422e",color,1.3);
    const from=screen([x+0.5+info.dx*0.92,y+0.5+info.dy*0.92]);
    const to=screen([x+0.5+info.dx*0.45,y+0.5+info.dy*0.45]);
    line(from,to,color,3);
    const vx=to.x-from.x,vy=to.y-from.y,l=Math.hypot(vx,vy),ux=vx/l,uy=vy/l;
    polygon([to,{x:to.x-ux*7-uy*4,y:to.y-uy*7+ux*4},{x:to.x-ux*7+uy*4,y:to.y-uy*7-ux*4}],color,null);
    if(isEndStair(item)){const label=screen([x+0.5+info.dx,y+0.5+info.dy]);ctx.font=`bold ${5.5*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle=color;ctx.fillText("ENTRY → GATE",label.x,label.y-4*zoom);}
    return info;
  }
  // Canonical shared boundaries: neighboring tiles address the same wall.
  const wallSlots = [0,2,4,6,1,5];
  function wallEdge(x, y, rotation = rot) {
    if (rotation === 1) return `${x},${y}:a`;
    if (rotation === 5) return `${x},${y}:d`;
    switch (Math.floor(rotation / 2) % 4) {
      case 1: return `${x + 1},${y}:v`;
      case 2: return `${x},${y + 1}:h`;
      case 3: return `${x},${y}:v`;
      default: return `${x},${y}:h`;
    }
  }
  function edgePanel(k) {
    const [xy, axis] = k.split(":"), [x, y] = xy.split(",").map(Number);
    if (axis === "a") return {a:[x,y+1],b:[x+1,y]};
    if (axis === "d") return {a:[x,y],b:[x+1,y+1]};
    return {a:[x, y], b:axis === "h" ? [x + 1, y] : [x, y + 1]};
  }
  function drawWall(k, color = "#ac744d") {
    const panel = edgePanel(k), a = project(...panel.a), b = project(...panel.b), h = 12 * zoom;
    const item=edges[k],palette=colors(item),material=item?.material||"wood";
    if(material==="chain"&&color==="#ac744d") {
      polygon([a,b,{x:b.x,y:b.y-h},{x:a.x,y:a.y-h}],"#547e7d30",null);
      for(let i=0;i<5;i++){
        const at=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
        const low=at(i/5),high=at((i+1)/5);line(low,{x:high.x,y:high.y-h},"#789b9e",0.6);line({x:low.x,y:low.y-h},high,"#789b9e",0.6);
      }
      line(a,{x:a.x,y:a.y-h},"#546e74",1);line(b,{x:b.x,y:b.y-h},"#546e74",1);
      line({x:a.x,y:a.y-h},{x:b.x,y:b.y-h},palette.secondary,1.6);return;
    }
    polygon([a, b, {x:b.x,y:b.y-h}, {x:a.x,y:a.y-h}], material==="padded"&&color==="#ac744d"?palette.primary:color, "#563b35", 1);
    line({x:a.x,y:a.y-h}, {x:b.x,y:b.y-h}, material==="padded"?palette.secondary:"#e0a15c", 3);
  }
  function sceneryBlocksEdge(edge) {
    const {a,b}=edgePanel(edge);
    return [...neighborhood,{...parkingLot,w:parkingLot.width,d:parkingLot.depth}].some(rect=>[0.1,0.5,0.9].some(t=>{
      const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
      return x>rect.x&&x<rect.x+rect.w&&y>rect.y&&y<rect.y+rect.d;
    }));
  }
  function diagonalWallCollision(edge) {
    const {a,b}=edgePanel(edge),wallOnly={[edge]:{type:"wall"}};
    return Object.entries(tiles).some(([k,v])=>{
      if(!isRamp(v)&&(!isStand(v)||v.rot%2===0))return false;
      const [x,y]=k.split(",").map(Number);
      if(Math.abs(x-(a[0]+b[0])/2)>7||Math.abs(y-(a[1]+b[1])/2)>7)return false;
      return !!footprintError(x,y,v,{},wallOnly);
    });
  }
  function edgeAllowed(k) {
    const {a, b} = edgePanel(k), [x,y] = k.split(":")[0].split(",").map(Number);
    if ([...a,...b].some(v=>v<0) || a[0]>W || b[0]>W || a[1]>H || b[1]>H) return false;
    if (/[ad]$/.test(k)) return !blockedTile(key(x,y));
    // Borders are allowed; walls inside the protected playing field are not.
    const horizontal = b[0] !== x;
    return !(horizontal ? blockedTile(key(x,y)) && blockedTile(key(x,y-1))
      : blockedTile(key(x,y)) && blockedTile(key(x-1,y)));
  }
  function rotationStep() {
    if(isBackstop({type:tool})){toast("Backstop pieces face home plate; place matching pieces beside or behind them.");return;}
    rot = tool === "wall" ? wallSlots[(wallSlots.indexOf(rot) + 1) % wallSlots.length] : (rot + ((isDeck({type:tool})||isRamp({type:tool})||tool==="halfPath")?2:1)) % 8;
    update(); draw();
  }
  function drawObject(x, y, item) {
    const z = zoom,
      p = project(x + 0.5, y + 0.5),
      d = directions[item.rot % 8] || directions[0];
    const length = Math.hypot(...d),
      ux = d[0] / length,
      uy = d[1] / length;
    const local = (a, b, h = 0) => {
      const q = project(x + 0.5 + ux * a - uy * b, y + 0.5 + uy * a + ux * b);
      return { x: q.x, y: q.y - h * z };
    };
    const segment = (a, b, h, color, width) =>
      line(local(a[0], a[1], h), local(b[0], b[1], h), color, width);
    const box = (a, b, w, depth, h, side, top) => {
      const corners = [
        [a, b],
        [a + w, b],
        [a + w, b + depth],
        [a, b + depth],
      ];
      const faces = corners
        .map((v, i) => {
          const next = corners[(i + 1) % 4];
          return { v, next, depth: (local(...v).y + local(...next).y) / 2 };
        })
        .sort((a, b) => a.depth - b.depth);
      for (const f of faces)
        polygon(
          [
            local(...f.v),
            local(...f.next),
            local(...f.next, h),
            local(...f.v, h),
          ],
          side,
          "#45546a",
          0.8,
        );
      polygon(
        corners.map((v) => local(...v, h)),
        top,
        "#45546a",
        0.8,
      );
    };
    if(item.type==="cornerLanding") {
      const cs=footprint(x,y,item),up=([a,b],h=item.baseFeet)=>{const p=project(a,b);p.y-=h*FT*zoom;return p;};
      polygon(cs.map(c=>up(c)),PAVEMENT,"#8c9d99",0.8);
      for(let i=0;i<3;i++){const a=cs[i],b=cs[(i+1)%3],dx=Math.sign((a[0]+b[0])/2-x-0.5),dy=Math.sign((a[1]+b[1])/2-y-0.5);if(concourseConnection(x,y,item,dx,dy))continue;if(item.baseFeet>0){line(up(a),up(a,item.baseFeet+3),"#627986",1);line(up(b),up(b,item.baseFeet+3),"#627986",1);line(up(a,item.baseFeet+3),up(b,item.baseFeet+3),"#a4b5b9",1);}}
      return;
    }
    if(isRamp(item)){for(let n=0;n<24;n++)drawRampPatch(x,y,item,n);return;}
    if(isDeck(item)){drawConcourse(x,y,item);drawConcourse(x,y,item,true);return;}
    if(isStand(item)) {
      const rows=[0,1,2,3].sort((a,b)=>{const p=standPoint(x,y,item,0,-0.375+a/4),q=standPoint(x,y,item,0,-0.375+b/4);return project(p.x,p.y).y-project(q.x,q.y).y;});
      for(const row of rows)drawStandRow(x,y,item,row);return;
    }
    switch (item.type) {
      case "halfPath":
        polygon(halfCorners(item.rot).map(([a,b])=>project(x+a,y+b)),PAVEMENT,PAVEMENT_EDGE,0.8*zoom);
        break;
      case "path":
        diamond(x + 0.5, y + 0.5, PAVEMENT, PAVEMENT_EDGE);
        break;
      case "bleacher": {
        if(disconnectedSections.has(key(x,y))) {
          diamond(x+0.5,y+0.5,"#e45c6480","#ffbd9b");
          ctx.font=`bold ${8*z}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#a51e2a";
          ctx.fillText("NO PATH",p.x,p.y-20*z);
        }
        // Rows rise away from the front (-local b). Preserve saved rotations.
        const rows = [0, 1, 2].sort((a, b) =>
          local(0, -0.28 + a * 0.22).y - local(0, -0.28 + b * 0.22).y);
        for (const i of rows) {
          const b = -0.32 + i * 0.22, h = 4 + i * 3;
          box(-0.38, b, 0.76, 0.18, h - 1, "#526779", "#91a6b6");
          // Thin silver bench planks and individual seat divisions.
          box(-0.39, b, 0.78, 0.11, h, "#8da1af", colors(item).primary);
          for (let seat = 1; seat < 8; seat++)
            segment([-0.39 + seat * 0.0975, b], [-0.39 + seat * 0.0975, b + 0.11], h + 0.1, "#748b9b", 0.6);
        }
        // Rear rail sits behind the highest row; the gold arrow points forward.
        for (const a of [-0.39, 0.39])
          line(local(a, 0.34, 0), local(a, 0.34, 14), "#506575", 1.2);
        segment([-0.39, 0.34], [0.39, 0.34], 14, "#bacbd6", 1.5);
        line(local(0, -0.42, 1), local(0, -0.67, 1), "#ffda57", 2);
        polygon([local(0, -0.83, 1), local(-0.14, -0.61, 1), local(0.14, -0.61, 1)], "#ffda57", "#886a19", 0.7);
        break;
      }
      case "basicScoreboard":
      case "deluxeScoreboard":
      case "videoScoreboard":
      case "vintageScoreboard": {
        const palette=colors(item),video=item.type==="videoScoreboard",vintage=item.type==="vintageScoreboard",deluxe=item.type==="deluxeScoreboard";
        const width=video?0.98:deluxe?0.94:vintage?0.9:0.7,bottom=video?22:18,top=video?48:deluxe?39:35;
          polygon([local(width/2,-0.065,bottom),local(width/2,0.065,bottom),local(width/2,0.065,top),local(width/2,-0.065,top)],palette.primary,"#304757",0.6);
        polygon([local(-width/2,-0.065,top),local(width/2,-0.065,top),local(width/2,0.065,top),local(-width/2,0.065,top)],palette.secondary,null);
        // Cover the lower part of the box so the board stands on open posts.
        const face=[local(-width/2,-0.065,bottom),local(width/2,-0.065,bottom),local(width/2,-0.065,top),local(-width/2,-0.065,top)];
        const frontVisible=local(0,-1).y>local(0,1).y+1e-7;
        polygon(frontVisible?face:[local(-width/2,0.065,bottom),local(width/2,0.065,bottom),local(width/2,0.065,top),local(-width/2,0.065,top)],frontVisible?(vintage?"#244f3f":video?"#102b43":"#20323d"):palette.primary,palette.secondary,1.4);
        for(const a of [-width*0.36,width*0.36])line(local(a,0,0),local(a,0,bottom),"#7c8d92",2);
        if(frontVisible) {
          ctx.save();ctx.beginPath();face.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.clip();
          const tl=local(-width/2,-0.075,top),tr=local(width/2,-0.075,top),bl=local(-width/2,-0.075,bottom);
          ctx.transform((tr.x-tl.x)/1000,(tr.y-tl.y)/1000,(bl.x-tl.x)/600,(bl.y-tl.y)/600,tl.x,tl.y);
          const label=(text,y,color=palette.accent)=>{ctx.font=`bold ${Math.min(115,900/(text.length*0.63))}px monospace`;ctx.textAlign="center";ctx.fillStyle=color;ctx.fillText(text,500,y);};
          label(vintage?"BALLPARK":video?"GAME DAY":deluxe?"LINE SCORE":"SCORE",125);
          if(video){label("WELCOME FANS",315,palette.secondary);label("HOME  ·  VISITORS",510);}
          else if(deluxe||vintage){label("1 2 3 4 5 6 7 8 9 R H E",275);label("HOME  - - - - - - - - -",410);label("AWAY  - - - - - - - - -",540);}
          else {label("HOME   AWAY",300);label("--     --",515,palette.secondary);}
          ctx.restore();
        }
        if(!fanActive){line(local(0,-0.2,1),local(0,-0.7,1),"#ffda57",2);polygon([local(0,-0.88,1),local(-0.12,-0.63,1),local(0.12,-0.63,1)],"#ffda57",null);}
        break;
      }
      case "wall":
        drawWall(wallEdge(x, y, item.rot));
        break;
      case "gate":
        box(-0.34, -0.12, 0.12, 0.24, 17, "#a8aaa5", "#dfddce");
        box(0.22, -0.12, 0.12, 0.24, 17, "#a8aaa5", "#dfddce");
        segment([-0.34, 0], [0.34, 0], 17, "#f9cc51", 5);
        break;
      case "concession":
      case "drinks":
      case "iceCream":
      case "souvenir":
      case "restroom": {
        const food = item.type !== "restroom",palette=colors(item);
        box(
          -0.32,
          -0.32,
          0.64,
          0.64,
          17,
          food ? palette.primary : "#56819b",
          food ? palette.secondary : "#8fb4cb",
        );
        polygon(
          [
            local(-0.23, -0.325, 2),
            local(0.23, -0.325, 2),
            local(0.23, -0.325, 11),
            local(-0.23, -0.325, 11),
          ],
          "#183a55",
          "#fff0c9",
          1,
        );
        if(food) {
          polygon([local(-0.36,-0.55,12),local(0.36,-0.55,12),local(0.36,-0.20,17),local(-0.36,-0.20,17)],palette.primary,palette.accent,0.7);
          for(let stripe=0;stripe<4;stripe++)segment([-0.32+stripe*0.2,-0.5],[-0.32+stripe*0.2,-0.22],15,palette.secondary,2);
          segment([-0.32,-0.35],[0.32,-0.35],12,palette.accent,3);
          // An automatically staffed counter; no individual hiring system.
          const staff=local(0,-0.34,7);ctx.beginPath();ctx.arc(staff.x,staff.y,1.5*z,0,Math.PI*2);ctx.fillStyle="#ecc29a";ctx.fill();
          line({x:staff.x,y:staff.y+2*z},{x:staff.x,y:staff.y+5*z},palette.accent,2);
        }
        ctx.font = `${12 * z}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle=colors(item).accent;ctx.fillText(({concession:"🌭",drinks:"🥤",iceCream:"🍦",souvenir:"🧢",restroom:"🚻"})[item.type],p.x,p.y-20*z);
        break;
      }
    }
  }
  function pitch() {
    for(const k of field) {
      const [x,y]=k.split(",").map(Number);
      diamond(x+0.5,y+0.5,(x+y)%2?"#76ab67":"#7fb571","#70a363");
    }
    polygon(warningTrack.map(p=>project(...p)),"#b58760","#cba078",0.8);
    const [hx,hy]=homeWorld, dirtRadius=15;
    // Rounded grass/dirt cutout; buildings and fences still snap to the grid.
    const dirt=[project(hx,hy)];
    for(let i=0;i<=48;i++) {
      const angle=i/48*Math.PI/2;
      dirt.push(project(hx+Math.cos(angle)*dirtRadius,hy+Math.sin(angle)*dirtRadius));
    }
    polygon(dirt,"#ca9463","#deb183",1);
    const circle=(cx,cy,r,fill)=>{
      const pts=[];
      for(let i=0;i<48;i++) {const a=i/48*Math.PI*2;pts.push(project(cx+Math.cos(a)*r,cy+Math.sin(a)*r));}
      polygon(pts,fill,null);
    };
    circle(hx,hy,1.25,"#ca9463");
    polygon([[hx+0.7,hy+0.7],[hx+8.3,hy+0.7],[hx+8.3,hy+8.3],[hx+0.7,hy+8.3]].map(p=>project(...p)),"#74b166","#8dba72",1);
    const moundOffset=6.05/Math.SQRT2;
    circle(hx+moundOffset,hy+moundOffset,0.9,"#d9ab7b");
    for(const [x,y] of basesWorld) {
      const half=0.12;
      polygon([[x-half,y-half],[x+half,y-half],[x+half,y+half],[x-half,y+half]].map(p=>project(...p)),"#fff7e3",null);
    }
    line(project(hx,hy),project(hx+30,hy),"#ffffff",1.3);
    line(project(hx,hy),project(hx,hy+30),"#ffffff",1.3);
    for(const [x,y,label] of [[46.5,14.7,"300 ft"],[18.7,42.5,"300 ft"],[38.8,34.8,"304 ft"]]) {
      const p=project(x,y);ctx.font=`bold ${10*zoom}px sans-serif`;ctx.textAlign="center";
      ctx.fillStyle="#fff4c4";ctx.fillText(label,p.x,p.y-4*zoom);
    }
  }
  // Grid-aligned outfield: 300 feet down the lines, about 304 at center.
  const fieldFence = [];
  fenceCorners.forEach((a,edge)=>{
    const b=fenceCorners[(edge+1)%fenceCorners.length];
    const count=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(let i=0;i<count;i++) {
      const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const start=at(i/count), end=at((i+1)/count);
      // One 10-foot opening on each foul fence aligns with the dugout steps.
      if ((start[1]===10 && end[1]===10 && Math.min(start[0],end[0])===24) ||
          (start[0]===14 && end[0]===14 && Math.min(start[1],end[1])===20)) continue;
      fieldFence.push({a:at(i/count),b:at((i+1)/count),feet:(a[0]+(b[0]-a[0])*(i+0.5)/count<18 || a[1]+(b[1]-a[1])*(i+0.5)/count<14)?3:8});
    }
  });
  function drawFieldFence(panel) {
    const height = panel.feet * TW / 20 * zoom;
    const a = project(...panel.a), b = project(...panel.b);
    const up = (p, fraction = 1) => ({x:p.x, y:p.y - height * fraction});
    if(panel.feet===8&&team.fenceMaterial==="padded") {
      polygon([a,b,up(b),up(a)],team.primary,"#294a51",0.5);
      line(up(a),up(b),team.secondary,2);line(a,up(a),team.accent,0.45);return;
    }
    polygon([a, b, up(b), up(a)], "#547e7d30", null);
    // Open mesh keeps the playing surface visible through the low foul fence.
    for (let i = 0; i < 4; i++) {
      const mix = t => ({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t});
      line(mix(i/4), up(mix((i+1)/4)), "#66888890", 0.45);
      line(up(mix(i/4)), mix((i+1)/4), "#66888890", 0.45);
    }
    line(a, up(a), "#405d65", 1.1);
    line(b, up(b), "#405d65", 1.1);
    line(up(a), up(b), panel.feet === 8 ? team.secondary : "#b9ccd0", panel.feet === 8 ? 1.8 : 1);
  }
  const dugouts = [
    {side:"First base",x:22,y:9,length:3,width:1,depthFeet:3,roofHeightFeet:5.5,swap:false},
    {side:"Third base",x:13,y:18,length:3,width:1,depthFeet:3,roofHeightFeet:5.5,swap:true}
  ];
  function drawDugout(d) {
    const at=(a,b,h=0)=>{
      const p=d.swap?project(d.x+b,d.y+a):project(d.x+a,d.y+b);
      return {x:p.x,y:p.y-h*zoom};
    };
    const shape=(a,b,c,e,h,color)=>polygon([at(a,b,h),at(c,b,h),at(c,e,h),at(a,e,h)],color,"#59656a",0.7);
    const depth=d.depthFeet*TW/20;
    // The floor is below grade: retaining walls drop from the rim into the pit.
    shape(-0.08,-0.08,d.length+0.08,d.width+0.08,0,"#bbc2bd");
    shape(0,0,d.length,d.width,0,"#263d43");
    shape(0.08,0.08,d.length-0.08,d.width-0.08,-depth,"#77766a");
    for(const [a,b,c,e] of [[0,0,3,0],[0,0,0,d.width],[3,0,3,d.width]])
      polygon([at(a,b),at(c,e),at(c,e,-depth),at(a,b,-depth)],"#465558","#87908c",0.6);
    // Long wooden bench along the back, below the surrounding grass level.
    shape(0.2,0.18,2.8,0.48,-depth+2,"#c79b60");
    line(at(0.15,0,3),at(2.85,0,3),"#9eafb2",2);
    for(const a of [0.15,1.5,2.85]) line(at(a,0),at(a,0,3),"#677c83",1);
    // Three steps at the field-side opening climb from the recessed floor to grade.
    for(let step=0;step<3;step++)
      shape(2.35,d.width-0.85+step*0.35,2.95,d.width-0.5+step*0.35,-depth+(step+1)*depth/3,"#b7b5a4");
    shape(2.35,d.width+0.2,2.95,d.width+0.65,0,"#b7b5a4");
    const roofHeight=d.roofHeightFeet*TW/20;
    for(const [a,b] of [[0.1,0.1],[2.9,0.1],[0.1,d.width-0.2],[2.2,d.width-0.2]])
      line(at(a,b,-depth),at(a,b,roofHeight),"#5f7174",1.6);
    // Roof stops short of the field-side stairs, leaving the player exit visible.
    polygon([[-0.12,-0.12],[3.12,-0.12],[3.12,0.1],[2.25,0.1],[2.25,d.width-0.1],[-0.12,d.width-0.1]].map(([a,b])=>at(a,b,roofHeight)),"#31546a","#59656a",0.7);
    line(at(-0.12,d.width-0.1,roofHeight),at(2.25,d.width-0.1,roofHeight),"#c1b183",2.5);
    const p=at(1.5,0,roofHeight+6);
    ctx.font=`bold ${9*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#f6e8bd";
    ctx.fillText("DUGOUT · 30 ft",p.x,p.y);
  }
  const stadiumBoundary = [[6,7],[11,2],[53,2],[53,29],[33,49],[6,49]];
  const siteTemplates = {
    smallStadium: {
      id:"small-stadium",name:"Small Stadium",roadLayout:"hashtag",
      roads:[{axis:"x",at:3},{axis:"x",at:56},{axis:"y",at:-1},{axis:"y",at:52}],
      roadStart:-8,roadEnd:68,roadWidth:2,sidewalkWidth:1,fadeLength:6,
      arrivalIntersection:[3,-1]
    }
  };
  const siteTemplate = siteTemplates.smallStadium;
  const streetBoundary = [[-9,-12],[66,-12],[66,59],[-9,59]];
  const parkingLot={x:-11,y:-12,width:12,depth:10};
  const parkingSpawn={x:0.5,y:-3.5};
  const neighborhood=[
    {kind:"gas",x:60,y:11,w:4,d:4,height:16,label:"FUEL"},
    {kind:"bar",x:60,y:18,w:4,d:3,height:24,label:"THE DUGOUT"},
    {kind:"apartment",x:60,y:25,w:5,d:4,height:50,label:"PARKSIDE"},
    ...[18,25,32,39].map((y,i)=>({kind:"house",x:-3,y,w:3,d:3,height:18,label:"",variant:i}))
  ];
  const streetLamps=[];
  for(const x of [10,15,20,25,30,35,40,45,50])streetLamps.push({x,y:1.2});
  for(const y of [10,17,24,31,38,45])streetLamps.push({x:5.2,y});
  function drawParking() {
    const {x,y,width:w,depth:d}=parkingLot;
    polygon([[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(p=>project(...p)),"#667274","#b6c0b5",1);
    for(let row=0;row<2;row++)for(let n=0;n<9;n++) {
      const a=x+2+n*1.05,b=y+1+row*4.5;
      line(project(a,b),project(a,b+2.4),"#e8e5d0",0.7);
      if((n+row)%3!==0) {
        const color=["#c4c8c4","#a94b42","#2d536c","#d7c388"][(n+row)%4];
        polygon([[a+0.15,b+0.3],[a+0.85,b+0.3],[a+0.85,b+1.9],[a+0.15,b+1.9]].map(p=>{const q=project(...p);q.y-=2*zoom;return q;}),color,"#364b51",0.5);
      }
    }
    // Dedicated pedestrian aisle connects parking to the fixed gate approach.
    polygon([[0,-4],[1,-4],[1,-2],[0,-2]].map(p=>project(...p)),PAVEMENT,PAVEMENT_EDGE,0.6);
    for(let t=2.05;t<=4.05;t+=0.28)line(project(t-0.5,t-3.5),project(t+0.5,t-4.5),"#f1eddb",2);
    const sign=project(-5,-9);sign.y-=12*zoom;ctx.font=`bold ${8*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#f7f0cd";ctx.fillText("BALLPARK PARKING",sign.x,sign.y);
  }
  function drawNeighborhood(building) {
    const {x,y,w,d,height:h,kind}=building;
    const at=(a,b,z=0)=>{const p=project(x+a,y+b);p.y-=z*zoom;return p;};
    const wall=kind==="house"?["#b78c6e","#b9bdad","#a0b0ba","#d0b98e"][building.variant]:kind==="bar"?"#965e48":kind==="apartment"?"#b6aa91":"#d4d5c8";
    const roof=kind==="house"?"#59636a":kind==="gas"?team.secondary:"#616c70";
    const corners=[[0,0],[w,0],[w,d],[0,d]];
    const center=at(w/2,d/2),faces=corners.map((a,i)=>({a,b:corners[(i+1)%4],i})).filter(f=>(at(...f.a).y+at(...f.b).y)/2>center.y+1e-8).sort((a,b)=>(at(...a.a).y+at(...a.b).y)-(at(...b.a).y+at(...b.b).y));
    for(const face of faces) {
      polygon([at(...face.a),at(...face.b),at(...face.b,h),at(...face.a,h)],wall,"#5a6565",0.8);
      const on=(t,z)=>at(face.a[0]+(face.b[0]-face.a[0])*t,face.a[1]+(face.b[1]-face.a[1])*t,z);
      const floors=kind==="apartment"?4:1;
      for(let floor=0;floor<floors;floor++)for(let n=0;n<3;n++) {
        if(floor===0&&n===1)continue;
        const t=0.1+n*0.3,z=5+floor*10;
        polygon([on(t,z),on(t+0.16,z),on(t+0.16,z+5),on(t,z+5)],"#afd0cf","#657f84",0.5);
      }
      polygon([on(0.43,0),on(0.60,0),on(0.60,9),on(0.43,9)],"#344e59","#d4d2bc",0.6);
      const knob=on(0.56,4);ctx.beginPath();ctx.arc(knob.x,knob.y,0.7*zoom,0,Math.PI*2);ctx.fillStyle="#edc75b";ctx.fill();
    }
    // Opaque roof is always painted after wall details. Hidden walls never emit windows.
    if(kind==="house")for(const face of corners.map((a,i)=>({a,b:corners[(i+1)%4],i})).sort((a,b)=>(at(...a.a).y+at(...a.b).y)-(at(...b.a).y+at(...b.b).y)))polygon([at(...face.a,h),at(...face.b,h),at(w/2,d/2,h+9)],face.i%2?"#59636a":"#74808a","#4c5d65",0.6);
    else polygon(corners.map(c=>at(...c,h)),roof,"#4c5d65",0.8);
    if(kind==="gas")for(let n=0;n<3;n++) {
      const a=0.5+n;
      polygon([at(-0.8,a),at(-0.8,a+0.45),at(-0.8,a+0.45,8),at(-0.8,a,8)],team.primary,team.accent,0.6);
    }
    if(building.label) {const p=at(w/2,-0.08,h-4);ctx.font=`bold ${6*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle=team.accent;ctx.fillText(building.label,p.x,p.y);}
  }
  function drawStreetLamp(lamp) {
    const p=project(lamp.x,lamp.y),h=24*zoom;
    line(p,{x:p.x,y:p.y-h},"#37545c",1.8);
    line({x:p.x,y:p.y-h},{x:p.x+5*zoom,y:p.y-h},"#37545c",1.5);
    ctx.beginPath();ctx.arc(p.x+5*zoom,p.y-h,2*zoom,0,Math.PI*2);ctx.fillStyle="#fff3be";ctx.fill();
    polygon([{x:p.x+1*zoom,y:p.y-h+4*zoom},{x:p.x+8*zoom,y:p.y-h+4*zoom},{x:p.x+8*zoom,y:p.y-h+15*zoom},{x:p.x+4.5*zoom,y:p.y-h+13*zoom},{x:p.x+1*zoom,y:p.y-h+15*zoom}],team.primary,team.secondary,0.8);
    line({x:p.x+2*zoom,y:p.y-h+7*zoom},{x:p.x+7*zoom,y:p.y-h+7*zoom},team.secondary,1.5);
  }
  const mainGate = {a:[11,8],b:[12,7],intersection:siteTemplate.arrivalIntersection};
  const outerFence=[];
  stadiumBoundary.forEach((a,edge)=>{
    const b=stadiumBoundary[(edge+1)%stadiumBoundary.length],n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(let i=0;i<n;i++) {
      if(edge===0&&i===2) continue; // Main entry behind home plate.
      const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      outerFence.push({a:at(i/n),b:at((i+1)/n),feet:6});
    }
  });
  function drawStreets() {
    const t=siteTemplate;
    const strip=(road,start,end,half,color)=>{
      const points=road.axis==="x" ? [[road.at-half,start],[road.at+half,start],[road.at+half,end],[road.at-half,end]]
        : [[start,road.at-half],[end,road.at-half],[end,road.at+half],[start,road.at+half]];
      polygon(points.map(p=>project(...p)),color,null);
    };
    // Four independent roads, with sidewalks. Ends dissolve into the landscape.
    for(const [extra,color] of [[t.sidewalkWidth,"#c5c6bc"],[0,"#525d65"]]) {
      for(const road of t.roads) {
        for(let at=t.roadStart;at<t.roadEnd;at+=0.5) {
          const fraction=Math.max(0,Math.min(1,(at+0.25-t.roadStart)/t.fadeLength,(t.roadEnd-at-0.25)/t.fadeLength));
          ctx.save();ctx.globalAlpha=fraction*fraction*(3-2*fraction);
          strip(road,at,at+0.5,t.roadWidth/2+extra,color);
          ctx.restore();
        }
      }
    }
    // Lane dashes stop at intersections and fade with the road ends.
    for(const road of t.roads) for(let at=t.roadStart;at<t.roadEnd;at+=1.6) {
      if(t.roads.some(other=>other.axis!==road.axis&&Math.abs(at-other.at)<1.8)) continue;
      const opacity=Math.max(0,Math.min(1,(at-t.roadStart)/t.fadeLength,(t.roadEnd-at)/t.fadeLength));
      ctx.save();ctx.globalAlpha=opacity;
      const a=road.axis==="x"?[road.at,at]:[at,road.at];
      const b=road.axis==="x"?[road.at,at+0.65]:[at+0.65,road.at];
      line(project(...a),project(...b),"#d8c778",1);ctx.restore();
    }
    // Diagonal sidewalk links the corner intersection to the gate behind home.
    for(const [x,y] of entrancePaving)if(!(usesBackstop()&&x+y>=20)&&!isPath(tiles[key(x,y)])&&!isStand(tiles[key(x,y)]))diamond(x+0.5,y+0.5,PAVEMENT,PAVEMENT_EDGE);
    // The diagonal parking crosswalk is drawn after roads, in drawParking().
  }
  // Template landscaping stays outside the stadium fence and clear of the entry walk.
  const roadsideTrees = [];
  const addTree=(x,y)=>{
    if(x+y<28 && Math.abs(x-y-4)<3.5) return;
    roadsideTrees.push({x,y,variant:roadsideTrees.length%3});
  };
  for(let x=12;x<=50;x+=3.5) {addTree(x,1.7);addTree(x,49.3);}
  for(let y=8;y<=46;y+=3.5) {addTree(5.7,y);addTree(53.3,y);}
  function drawRoadsideTree(tree) {
    const p=project(tree.x,tree.y),z=zoom;
    const size=[1,0.9,1.1][tree.variant],h=22*size*z;
    ctx.beginPath();ctx.ellipse(p.x+3*z,p.y+2*z,10*size*z,4*size*z,0,0,Math.PI*2);
    ctx.fillStyle="#284b3030";ctx.fill();
    line(p,{x:p.x,y:p.y-h*0.7},"#74513a",3);
    const crown=(dx,dy,rx,ry,color)=>{
      ctx.beginPath();ctx.ellipse(p.x+dx*z,p.y+dy*z,rx*size*z,ry*size*z,0,0,Math.PI*2);
      ctx.fillStyle=color;ctx.fill();
    };
    crown(0,-h/z,10,12,"#356a42");
    crown(-4,-h/z-2,7.5,9,"#4e8850");
    crown(3,-h/z+2,7,8,"#427c46");
    crown(-3,-h/z-7,5.5,5,"#70a05b");
  }
  function drawMainGate() {
    const a=project(...mainGate.a),b=project(...mainGate.b),h=20*zoom;
    for(const p of [a,b]) {
      line(p,{x:p.x,y:p.y-h},"#c0a473",5);
      line({x:p.x,y:p.y-h},{x:p.x,y:p.y-h-3*zoom},"#f2d16d",6);
    }
    line({x:a.x,y:a.y-h},{x:b.x,y:b.y-h},"#203e52",7);
    const p=project(11.5,7.5);ctx.font=`bold ${9*zoom}px sans-serif`;ctx.textAlign="center";
    ctx.fillStyle="#fff0ba";ctx.fillText("MAIN GATE",p.x,p.y-h-5*zoom);
  }
  const entranceTile = "14,10";
  const GAME_SECONDS=120, TICKET_PRICE=5;
  let gateAdmissions=0, gateRevenue=0;
  let fans=[], fanActive=false, fanElapsed=0, fanPlanned=0, fanUnreachable=0, fanFrame=0, reachableCapacity=0, disconnectedSections=new Set(), fanPhase="idle", departureElapsed=0;
  function fanStatus(message) { const e=document.getElementById("fanStatus");if(e.textContent!==message)e.textContent=message; }
  function insideStadium(x,y) {return x>=6&&x<53&&y>=2&&y<49&&x+y>=13&&x+y<=81;}
  function wallBlocks(a,b) {
    const [x,y]=a.split(",").map(Number), [nx,ny]=b.split(",").map(Number);
    if(nx!==x&&ny!==y) {
      const midA=key(nx,y),midB=key(x,ny);
      return wallBlocks(a,midA)||wallBlocks(midA,b)||wallBlocks(a,midB)||wallBlocks(midB,b);
    }
    const edge=nx>x?wallEdge(x,y,2):nx<x?wallEdge(x,y,6):ny>y?wallEdge(x,y,4):wallEdge(x,y,0);
    return !!edges[edge] || !!edges[a+":a"] || !!edges[a+":d"] || !!edges[b+":a"] || !!edges[b+":d"];
  }
  function solidBuildingAt(x,y) {
    // Reserve the whole occupied cell, including a small pedestrian clearance.
    for(const [k,v] of Object.entries(tiles)) {
      if(![...amenityTypes,...scoreboardTypes,"bleacher"].includes(v.type)&&!isPlatform(v))continue;
      if(isRamp(v)){const [a,b]=k.split(",").map(Number),[dx,dy]=directions[v.rot],along=(x-a-0.5)*dx+(y-b-0.5)*dy+0.5,across=-(x-a-0.5)*dy+(y-b-0.5)*dx;if(along>0&&along<6&&Math.abs(across)<0.5)return true;continue;}
      const [bx,by]=k.split(",").map(Number);
      if(isStand(v)&&v.rot%2) {
        const {ax,ay,bx:ux,by:uy}=standAxes(v.rot),dx=x-bx-0.5,dy=y-by-0.5;
        if(Math.abs((dx*ax+dy*ay)/2)<0.53&&Math.abs((dx*ux+dy*uy)/2)<0.53)return true;
      } else if(x>bx-0.06&&x<bx+1.06&&y>by-0.06&&y<by+1.06)return true;
    }
    return false;
  }
  const usesBackstop=()=>Object.values(tiles).some(isBackstop);
  function approachRoute() {
    const gate={x:11.5,y:7.5},start={x:6.5,y:2.5},entry=usesBackstop()?gate:{x:14.5,y:10.5};
    const search=(from,to,beforeGate)=>{
      const keyP=p=>`${p.x},${p.y}`,queue=[from],parents=new Map([[keyP(from),null]]);
      if(solidBuildingAt(from.x,from.y)||solidBuildingAt(to.x,to.y))return null;
      for(let i=0;i<queue.length;i++) {
        const p=queue[i];
        if(p.x===to.x&&p.y===to.y) {
          const route=[];let at=keyP(p);
          while(at!==null){const [x,y]=at.split(",").map(Number);route.unshift({x,y});at=parents.get(at);}
          return route;
        }
        for(const [dx,dy] of [[0.1,0],[-0.1,0],[0,0.1],[0,-0.1],[0.1,0.1],[0.1,-0.1],[-0.1,0.1],[-0.1,-0.1]]) {
          const q={x:Math.round((p.x+dx)*10)/10,y:Math.round((p.y+dy)*10)/10},k=keyP(q);
          if(parents.has(k)||q.x<5.5||q.y<1.5||q.x>15||q.y>11||Math.abs(q.x-q.y-4)>1.4)continue;
          if(beforeGate?q.x+q.y>19+1e-8:q.x+q.y<19-1e-8)continue;
          let blocked=false;
          for(let t=0;t<=8;t++)if(solidBuildingAt(p.x+dx*t/8,p.y+dy*t/8)||!entrancePavedAt(p.x+dx*t/8,p.y+dy*t/8)){blocked=true;break;}
          const a=key(Math.floor(p.x),Math.floor(p.y)),b=key(Math.floor(q.x),Math.floor(q.y));
          if(blocked||(a!==b&&wallBlocks(a,b)))continue;
          // Require clear orthogonal corridors on both sides of a diagonal.
          if(dx&&dy) {
            for(const [ox,oy] of [[dx,0],[0,dy]]) {
              const mid={x:Math.round((p.x+ox)*10)/10,y:Math.round((p.y+oy)*10)/10};
              if(!entrancePavedAt(mid.x,mid.y)||solidBuildingAt(mid.x,mid.y)) {blocked=true;break;}
              const mk=key(Math.floor(mid.x),Math.floor(mid.y));
              if((a!==mk&&wallBlocks(a,mk))||(mk!==b&&wallBlocks(mk,b))) {blocked=true;break;}
            }
          }
          if(blocked)continue;
          parents.set(k,keyP(p));queue.push(q);
        }
      }
      return null;
    };
    const outside=search(start,gate,true),inside=search(gate,entry,false);
    if(!outside||!inside)return null;
    const parkingApproach=[],stops=[parkingSpawn,start];
    for(let n=1;n<stops.length;n++) {
      const a=stops[n-1],b=stops[n],count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/0.1);
      for(let i=n===1?0:1;i<=count;i++) {
        const q={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
        if(solidBuildingAt(q.x,q.y))return null;
        if(parkingApproach.length) {
          const prev=parkingApproach.at(-1),from=key(Math.floor(prev.x),Math.floor(prev.y)),to=key(Math.floor(q.x),Math.floor(q.y));
          if(from!==to&&wallBlocks(from,to))return null;
        }
        parkingApproach.push(q);
      }
    }
    return [...parkingApproach,...outside.slice(1),...inside.slice(1)];
  }
  let accessibleNodes=new Set();
  function reachableSeats() {
    accessibleNodes.clear();
    const entranceTile=usesBackstop()?"11,7":"14,10";
    const [entryX,entryY]=entranceTile.split(",").map(Number);
    if(solidBuildingAt(entryX+0.5,entryY+0.5))return [];
    const nodes=new Map(),links=new Map();
    const add=(id,p)=>{nodes.set(id,p);links.set(id,[]);};
    const join=(a,b)=>{if(nodes.has(a)&&nodes.has(b)){links.get(a).push(b);links.get(b).push(a);}};
    const ground=k=>"g:"+k,step=(k,n)=>`t:${k}:${n}`,rowId=(k,r)=>`r:${k}:${r}`,landing=(k,n)=>`l:${k}:${n}`;
    add(ground(entranceTile),{x:entryX+0.5,y:entryY+0.5,feet:0});
    for(const [k,item] of Object.entries(tiles)) {
      const [x,y]=k.split(",").map(Number);
      if(!insideStadium(x,y))continue;
      if(isPath(item))add(ground(k),pathPoint(x,y,item));
      if(isDeck(item))add("c:"+k,{...pathPoint(x,y,item.type==="cornerLanding"?{type:"halfPath",rot:item.rot}:item),feet:item.baseFeet});
      if(isRamp(item)){for(let n=0;n<=12;n++)add(`ramp:${k}:${n}`,rampPoint(x,y,item,n/2));for(let n=0;n<12;n++)join(`ramp:${k}:${n}`,`ramp:${k}:${n+1}`);}
      if(!isStand(item))continue;
      for(let r=0;r<4;r++)add(rowId(k,r),standPoint(x,y,item,stairCenter(item),-0.2625+r/4,item.baseFeet+(r+1)*1.25));
      if(hasStairs(item)) {
        add(step(k,-1),standPoint(x,y,item,stairCenter(item),-0.5,item.baseFeet));
        for(let n=0;n<8;n++)add(step(k,n),standPoint(x,y,item,stairCenter(item),-0.4375+n/8,item.baseFeet+(n+1)*0.625));
        add(step(k,8),standPoint(x,y,item,stairCenter(item),0.5,item.baseFeet+5));
        for(let n=-1;n<8;n++)join(step(k,n),step(k,n+1));
        for(let r=0;r<4;r++)join(rowId(k,r),step(k,r*2+1));
        if(isEndStair(item)) {
          const a=endSide(item)*0.25;
          add(landing(k,0),standPoint(x,y,item,a,0,item.baseFeet));
          add(landing(k,1),standPoint(x,y,item,a,-0.5,item.baseFeet));
          join(landing(k,0),landing(k,1));join(landing(k,1),step(k,-1));
        }
      }
    }
    for(const [k,item] of Object.entries(tiles)) {
      const [x,y]=k.split(",").map(Number);
      if(!insideStadium(x,y))continue;
      if(isPath(item)||k===entranceTile) {
        const openGround=(fromX,fromY,dx,dy)=>{
          const from=key(fromX,fromY),to=key(fromX+dx,fromY+dy);
          return nodes.has(ground(from))&&nodes.has(ground(to))&&
            pathOpens(tiles[from],dx,dy)&&pathOpens(tiles[to],-dx,-dy)&&!wallBlocks(from,to);
        };
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if(openGround(x,y,dx,dy))join(ground(k),ground(key(x+dx,y+dy)));
        }
        // Both orthogonal routes must be open to prevent corner cutting.
        for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
          if(openGround(x,y,dx,0)&&openGround(x,y,0,dy)&&
             openGround(x+dx,y,0,dy)&&openGround(x,y+dy,dx,0)) {
            join(ground(k),ground(key(x+dx,y+dy)));
          }
        }
      }
      if(isDeck(item)) {
        for(const [dx,dy] of neighborOffsets) {
          const connection=concourseConnection(x,y,item,dx,dy),next=key(x+dx,y+dy);
          if(!connection)continue;
          const port=`c:${k}:${dx}:${dy}`;
          add(port,{x:x+0.5+dx*0.5,y:y+0.5+dy*0.5,feet:item.baseFeet});join("c:"+k,port);
          const id=connection.kind==="deck"?"c:"+next:connection.kind==="ground"?ground(next):connection.kind==="top"?step(next,8):connection.kind==="bottom"?step(next,-1):connection.kind==="rampTop"?`ramp:${connection.key}:12`:connection.kind==="rampBottom"?`ramp:${connection.key}:0`:landing(next,0);
          join(port,id);
        }
      }
      if(isRamp(item)) {
        const [dx,dy]=directions[item.rot];
        for(const [tx,ty,n,height] of [[x-dx,y-dy,0,item.baseFeet],[x+dx*6,y+dy*6,12,item.baseFeet+5]]) {
          const other=tiles[key(tx,ty)];const near=key(n?x+dx*5:x,n?y+dy*5:y);if(wallBlocks(near,key(tx,ty)))continue;
          if(isDeck(other)&&other.baseFeet===height&&deckOpens(other,-dx*(n?1:-1),-dy*(n?1:-1)))join(`ramp:${k}:${n}`,"c:"+key(tx,ty));
          if(isPath(other)&&height===0&&pathOpens(other,dx*(n? -1:1),dy*(n? -1:1)))join(`ramp:${k}:${n}`,ground(key(tx,ty)));
        }
      }
      if(!isStand(item))continue;
      const {ax,ay,bx,by}=standAxes(item.rot);
      for(const side of [-1,1]) {
        const next=key(x+ax*side,y+ay*side);
        if(matchingStand(x,y,item,side,0)&&rowOpens(item,side)&&rowOpens(tiles[next],-side))for(let r=0;r<4;r++)join(rowId(k,r),rowId(next,r));
      }
      if(hasStairs(item)) {
        const front=key(x-bx,y-by),back=key(x+bx,y+by);
        if(item.baseFeet===0) {
          if(isEndStair(item)) {
            const side=endSide(item),outside=key(x+ax*side,y+ay*side);
            if(pathOpens(tiles[outside],-ax*side,-ay*side)&&!wallBlocks(k,outside))join(ground(outside),landing(k,0));
          } else if(pathOpens(tiles[front],bx,by)&&!wallBlocks(k,front))join(ground(front),step(k,-1));
        }
        if(!isBackstop(item)&&matchingStand(x,y,item,0,1)&&hasStairs(tiles[back])&&stairCenter(item)===stairCenter(tiles[back]))join(step(k,8),step(back,-1));
      }
    }
    // The fixed gate landing is traversable even before a path is built on it.
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next=key(entryX+dx,entryY+dy);if(pathOpens(tiles[next],-dx,-dy)&&!wallBlocks(entranceTile,next))join(ground(entranceTile),ground(next));
    }
    // Walking distance matters more than the number of graph nodes. Crossing a
    // seating row is slower than using the concourse; stairs also cost effort.
    const routeCost=(a,b,traffic=new Map())=>{
      const p=nodes.get(a),q=nodes.get(b);
      const distance=Math.hypot(p.x-q.x,p.y-q.y,((p.feet||0)-(q.feet||0))/10);
      const row=a.startsWith("r:")&&b.startsWith("r:");
      const stairs=a.startsWith("t:")||b.startsWith("t:");
      return distance*(row?6:stairs?1.8:1)+(traffic.get(b)||0)*0.025;
    };
    const searchRoutes=(traffic=new Map())=>{
      const root=ground(entranceTile),parents=new Map([[root,null]]),costs=new Map([[root,0]]),open=[[0,root]];
      while(open.length) {
        open.sort((a,b)=>b[0]-a[0]);
        const [cost,id]=open.pop();if(cost!==costs.get(id))continue;
        for(const next of links.get(id)||[]) {
          const value=cost+routeCost(id,next,traffic);
          if(value<(costs.get(next)??Infinity)-1e-9){costs.set(next,value);parents.set(next,id);open.push([value,next]);}
        }
      }
      return parents;
    };
    const parents=searchRoutes();
    accessibleNodes=new Set(parents.keys());
    const routeTo=(id,tree=parents)=>{const ids=[];for(let at=id;at!==null;at=tree.get(at))ids.unshift(at);
      return ids.map(id=>({...nodes.get(id),node:id}));};
    // Keep a consistent direction through shared narrow aisles. Traffic estimates
    // select a weighted routing tree for each arrival group, rather than replan
    // every animation frame (which causes oscillation and wastes work).
    let cachedTraffic=null,cachedTree=parents;
    const routeFor=(id,traffic)=>{
      if(traffic!==cachedTraffic){cachedTraffic=traffic;cachedTree=searchRoutes(traffic);}
      return routeTo(id,cachedTree);
    };
    const result=[];
    for(const [k,item] of Object.entries(tiles)) {
      if(!seatCapacity(item))continue;
      const [x,y]=k.split(",").map(Number),slots=[];
      let route;
      if(item.type==="bleacher") {
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const next=key(x+dx,y+dy),id=ground(next);
          if(insideStadium(x,y)&&parents.has(id)&&pathOpens(tiles[next],-dx,-dy)&&!wallBlocks(k,next)){route=routeTo(id);break;}
        }
        if(route)for(let n=0;n<24;n++)slots.push({seat:n,row:Math.floor(n/8),col:n%8,route,routeFor:traffic=>routeFor(route[route.length-1].node,traffic)});
      } else {
        const cols=isSeatSection(item)?5:2;
        for(let r=0;r<4;r++)if(parents.has(rowId(k,r)))for(let col=0;col<cols;col++)slots.push({seat:r*cols+col,row:r,col,route:routeTo(rowId(k,r)),routeFor:traffic=>routeFor(rowId(k,r),traffic)});
      }
      if(slots.length)result.push({key:k,x,y,rot:item.rot,type:item.type,baseFeet:item.baseFeet||0,route:slots[0].route,capacity:slots.length,slots});
    }
    return result;
  }
  function endFanTest(message) {
    fanActive=false;fanPhase="idle";fans=[];disconnectedSections.clear();fanFrame++;
    fanStatus(message||`Game ended early. ${gateAdmissions} admissions · $${gateRevenue} gate revenue. Adjust your park, then open gates again.`);draw();
  }
  function startFanTest() {
    if(fanActive) {toast("Fans are already arriving");return;}
    const arrival=approachRoute();
    if(!arrival) {fanStatus("Entrance blocked by a building or wall. Clear the sidewalk approach and gate landing before opening.");return;}
    const sections=reachableSeats(),total=Object.values(tiles).reduce((sum,t)=>sum+seatCapacity(t),0);
    reachableCapacity=sections.reduce((sum,section)=>sum+section.capacity,0);
    disconnectedSections=new Set(Object.entries(tiles).filter(([k,v])=>seatCapacity(v)&&!sections.some(s=>s.key===k)).map(([k])=>k));
    fanUnreachable=total-reachableCapacity;
    if(!sections.length) {draw();fanStatus("No gate-to-seat route. Hover a stair to see the cause; highlighted entrance tiles need connected walkways. Raised entrances need matching-height landings.");return;}
    fanPlanned=Math.min(100,reachableCapacity);fanElapsed=0;departureElapsed=0;fanPhase="game";gateAdmissions=0;gateRevenue=0;fans=[];
    const plan=partySeatPlan(sections,fanPlanned),traffic=new Map();let routeTraffic=new Map();
    for(let i=0;i<plan.length;i++) {
      const {section,slot,partyId,start}=plan[i];
      const {seat,row,col}=slot;
      let target;
      if(section.type==="bleacher") {
        const d=directions[section.rot],len=Math.hypot(...d),ux=d[0]/len,uy=d[1]/len;
        const a=-0.34+col*0.097,b=-0.28+row*0.22;
        target={x:section.x+0.5+ux*a-uy*b,y:section.y+0.5+uy*a+ux*b,feet:0};
      } else target=standPoint(section.x,section.y,section,isSeatSection(section)?-0.4+col*0.2:(col?0.4:-0.4),-0.3125+row/4,section.baseFeet+(row+1)*1.25);
      if(section.type!=="bleacher") {
        const {bx,by}=standAxes(section.rot);
        const aisleOffset=isBackstop(section)?0.075:0.05;
        target.aisle={x:target.x+bx*aisleOffset,y:target.y+by*aisleOffset,feet:target.feet};
      }
      if(i===0||partyId!==plan[i-1].partyId)routeTraffic=new Map(traffic);
      const walkingRoute=slot.routeFor(routeTraffic);
      for(const p of walkingRoute)traffic.set(p.node,(traffic.get(p.node)||0)+1);
      const route=seatRoute(arrival,walkingRoute,target);
      fans.push({route,index:0,x:route[0].x,y:route[0].y,feet:0,standSeat:section.type!=="bleacher",start,partyId,partySize:plan.filter(p=>p.partyId===partyId).length,col,spawned:false,exited:false,seated:false,paid:false,gateIndex:arrival.findIndex(p=>p.x===11.5&&p.y===7.5),row,sectionKey:section.key,seat,color:["#df5853","#f4cc5c","#5c90d3","#eee9d4"][partyId%4]});
    }
    fanActive=true;fanStatus("Game on · 2:00 remaining · $5 admission. Fans are walking to their seats.");
    let last=null;const run=++fanFrame;
    const frame=now=>{
      if(!fanActive||run!==fanFrame)return;
      const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;
      advanceFans(dt);draw();
      if(fanActive) requestAnimationFrame(frame);
    };
    if(typeof requestAnimationFrame==="function")requestAnimationFrame(frame);
  }
  function partySeatPlan(sections,count,random=Math.random) {
    const result=[],used=new Set();let time=0,partyId=0;
    const id=(section,slot)=>`${section.key}:${slot.seat}`;
    while(result.length<count) {
      const requested=Math.min(count-result.length,random()<0.15?1:2+Math.floor(random()*3));
      let best=null;
      // Reduce a party only when no contiguous row block of its requested size
      // remains. Central stair seats sit across an aisle and form solo blocks.
      for(let size=requested;size>=1&&!best;size--)for(const section of sections) {
        for(const first of section.slots) {
          const block=section.slots.filter(slot=>slot.row===first.row&&slot.col>=first.col&&slot.col<first.col+size).sort((a,b)=>a.col-b.col);
          if(((section.type==="stairStand"||section.type==="backstopStair")&&size>1)||block.length!==size||block.some(slot=>used.has(id(section,slot))))continue;
          const strangers=section.slots.filter(slot=>slot.row===first.row&&(slot.col===first.col-1||slot.col===first.col+size)&&used.has(id(section,slot))).length;
          const score=Math.hypot(section.x+0.5-homeWorld[0],section.y+0.5-homeWorld[1])+first.row*0.8+section.baseFeet*0.04+strangers*12;
          if(!best||score<best.score)best={section,block,score};
        }
      }
      if(!best)break;
      // Farthest from the row entry sits first, keeping a party's near seats clear.
      best.block.sort((a,b)=>{
        const end=slot=>slot.route.at(-2)||slot.route.at(-1),left=end(a),right=end(b);
        return Math.abs(b.col-2)+Math.hypot(right.x-best.section.x,right.y-best.section.y)-Math.abs(a.col-2)-Math.hypot(left.x-best.section.x,left.y-best.section.y);
      });
      for(const slot of best.block) {
        used.add(id(best.section,slot));result.push({section:best.section,slot,partyId,start:time});time+=0.05+random()*0.05;
      }
      time+=0.15+random()*0.35;partyId++;
    }
    return result;
  }
  function seatRoute(arrival,walking,seat) {
    const target=seat.aisle||seat;
    const route=[...arrival,...walking.slice(1)];
    // A graph row center is a routing anchor, not a point fans must walk past
    // before doubling back to a nearer seat. Trim only the final straight row.
    while(route.length>1) {
      const a=route[route.length-2],b=route[route.length-1];
      if(!b.node?.startsWith("r:")||Math.abs((a.feet||0)-(target.feet||0))>1e-8)break;
      const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
      const t=length?((target.x-a.x)*dx+(target.y-a.y)*dy)/length:2;
      if(t<0||t>1||Math.hypot(target.x-a.x-t*dx,target.y-a.y-t*dy)>1e-8)break;
      route.pop();
    }
    route.push(target);if(target!==seat)route.push(seat);return route;
  }
  function arrivalSchedule(count,random=Math.random) {
    const times=[];let time=0;
    while(times.length<count) {
      const group=1+Math.floor(random()*5);
      for(let n=0;n<group&&times.length<count;n++) {times.push(time);time+=0.08+random()*0.12;}
      time+=0.25+random()*0.65;
    }
    return times;
  }
  const FAN_SPACE=0.16, FAN_SPEED=2.8;
  const fanDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,((a.feet||0)-(b.feet||0))/10);
  function beginDepartures() {
    fanPhase="exiting";departureElapsed=0;
    // Use a common low-resistance exit tree to avoid opposing flows around
    // loops. All edges still use the existing validated access graph.
    const sections=reachableSeats(),arrival=approachRoute();
    for(const fan of fans) {

      const slot=sections.find(s=>s.key===fan.sectionKey)?.slots.find(s=>s.seat===fan.seat);
      const route=slot&&arrival?seatRoute(arrival,slot.route,fan.route[fan.route.length-1]):fan.route;
      fan.route=route.slice().reverse();fan.index=0;
      fan.remaining=fan.route.map(()=>0);
      for(let i=fan.route.length-2;i>=0;i--)fan.remaining[i]=fan.remaining[i+1]+fanDistance(fan.route[i],fan.route[i+1]);
    }
    // Clear the seats nearest the exit before feeding deeper rows into them.
    // Jittered release gaps keep departures natural while preventing a person
    // from standing directly in the way of an already moving neighbor.
    let release=0;
    for(const fan of fans.slice().sort((a,b)=>a.remaining[0]-b.remaining[0])) {
      fan.exitStart=release;release+=0.1+Math.random()*0.12;
    }
  }
  function advanceFans(dt) {
    if(!fanActive||!Number.isFinite(dt)||dt<=0)return;
    // Fixed small integration steps prevent tunneling on slow/hidden tabs and
    // make the result independent of the animation frame rate.
    let collected=0;
    while(dt>1e-8&&fanActive) {
      const step=Math.min(dt,1/60);dt-=step;
      const previousElapsed=fanElapsed;
      fanElapsed=fanElapsed+step>=GAME_SECONDS-1e-8?GAME_SECONDS:fanElapsed+step;
      if(fanPhase==="exiting")departureElapsed+=step;
      // Leaders move first; followers can use the space they just vacated.
      const moving=fans.filter(f=>!f.exited).sort((a,b)=>fanPhase==="exiting"?
        (a.remaining[a.index+1]||0)+fanDistance(a,a.route[a.index+1]||a)-
        (b.remaining[b.index+1]||0)-fanDistance(b,b.route[b.index+1]||b)||a.exitStart-b.exitStart:a.start-b.start);
      const priority=new Map(moving.map((f,i)=>[f,i]));
      const lookAhead=fan=>{
        const points=[fan];let left=0.35,p=fan;
        for(let i=fan.index+1;i<fan.route.length&&left>0;i++) {
          const q=fan.route[i],length=fanDistance(p,q),ratio=Math.min(1,left/(length||1));
          const next={x:p.x+(q.x-p.x)*ratio,y:p.y+(q.y-p.y)*ratio,feet:(p.feet||0)+((q.feet||0)-(p.feet||0))*ratio};
          points.push(next);
          left-=length;p=q;
        }
        return points;
      };
      const corridorDistance=(p,points)=>{
        let best=Infinity;
        for(let i=1;i<points.length;i++) {
          const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,dz=((b.feet||0)-(a.feet||0))/10;
          const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+((p.feet||0)-(a.feet||0))/10*dz)/(dx*dx+dy*dy+dz*dz||1)));
          best=Math.min(best,fanDistance(p,{x:a.x+t*dx,y:a.y+t*dy,feet:(a.feet||0)+t*dz*10}));
        }
        return best;
      };
      const corridors=new Map();
      for(const fan of moving) {
        if(fanPhase==="exiting"?departureElapsed<fan.exitStart:fanElapsed<fan.start||fan.seated)continue;
        const occupied=p=>fans.some(other=>other!==fan&&other.spawned&&!other.exited&&(!other.seated||other.standSeat)&&
          // Fans still sitting during their staggered release occupy seats,
          // not the walking aisle in front of that row.
          !(fanPhase==="exiting"&&departureElapsed<other.exitStart)&&(fanDistance(p,other)<(other.seated?0.03:FAN_SPACE)-1e-8||
            (!other.seated&&priority.get(other)<priority.get(fan)&&fanDistance(p,other)<0.52&&
              corridorDistance(p,corridors.get(other)||lookAhead(other))<FAN_SPACE-1e-8)));
        if(fanPhase==="exiting"&&fan.seated) {
          if(occupied(fan))continue;
          fan.seated=false;
        }
        if(!fan.spawned) {
          if(occupied(fan))continue;
          fan.spawned=true;
        }
        let distance=FAN_SPEED*(fanPhase==="exiting"?step:(fanPhase==="finishing arrivals"?step:Math.max(0,fanElapsed-Math.max(previousElapsed,fan.start))));
        while(distance>1e-8) {
          const next=fan.route[fan.index+1];
          if(!next){if(fanPhase==="exiting")fan.exited=true;else fan.seated=true;break;}
          const length=fanDistance(fan,next),travel=Math.min(distance,length);
          const ratio=length>1e-9?travel/length:1;
          const proposed={x:fan.x+(next.x-fan.x)*ratio,y:fan.y+(next.y-fan.y)*ratio,feet:fan.feet+((next.feet||0)-fan.feet)*ratio};
          if(occupied(proposed))break;
          Object.assign(fan,proposed);distance-=travel;
          if(length<=travel+1e-9) {
            fan.index++;
            if(fanPhase!=="exiting"&&!fan.paid&&fan.index>=fan.gateIndex) {
              fan.paid=true;gateAdmissions++;gateRevenue+=TICKET_PRICE;collected+=TICKET_PRICE;
            }
            if(fan.index===fan.route.length-1){if(fanPhase==="exiting")fan.exited=true;else fan.seated=true;break;}
          } else break;
        }
        corridors.set(fan,lookAhead(fan));
      }
      if(fanElapsed>=GAME_SECONDS&&fanPhase==="game")fanPhase="finishing arrivals";
      // Late/queued arrivals finish before reversing flow on narrow stairs.
      if(fanPhase==="finishing arrivals"&&fans.every(f=>f.seated))beginDepartures();
      if(fanPhase==="exiting"&&fans.every(f=>f.exited)) {
        endFanTest(`Game complete! 2:00 played · ${gateAdmissions} admissions · $${gateRevenue} gate revenue. All fans returned to the spawn point. Ready to build or open gates for another game.`);
      }
    }
    if(collected) {
      money+=collected;
      for(const snapshot of history)snapshot.money+=collected;
      store();update();
    }
    if(!fanActive)return;
    if(fanPhase==="exiting") {
      fanStatus(`Postgame · Fans exiting: ${fans.filter(f=>f.exited).length}/${fanPlanned}. Fans queue at stairs and the gate, then return to the street.`);return;
    }
    if(fanPhase==="finishing arrivals") {
      fanStatus("Postgame · Waiting for queued arrivals to reach their seats before opening the exit flow.");return;
    }
    const remaining=Math.ceil(GAME_SECONDS-fanElapsed-1e-8),clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;
    const seated=fans.filter(f=>f.seated).length,arrived=fans.filter(f=>f.spawned).length;
    const access=fanUnreachable ? `${disconnectedSections.size} disconnected section${disconnectedSections.size===1?"":"s"} (${fanUnreachable} seats), marked red. Connect walkways to use them.` : "All seating sections have a route from the gate.";
    fanStatus(`Game on · ${clock} remaining · ${gateAdmissions} admissions · $${gateRevenue} gate revenue. `+(seated===fanPlanned?`All ${seated} arriving fans are seated. ${reachableCapacity-seated} reachable seats remain empty. ${access}`:
      `Fans arriving: ${arrived}/${fanPlanned} · Fans seated: ${seated}. ${access}`));
  }
  const defensivePlayers = [
    {position:"P",x:18+6.05/Math.SQRT2,y:14+6.05/Math.SQRT2},
    {position:"C",x:17.2,y:13.2},
    {position:"1B",x:28,y:15.5},
    {position:"2B",x:29,y:20.5},
    {position:"SS",x:24,y:25},
    {position:"3B",x:19.5,y:24},
    {position:"LF",x:25,y:36},
    {position:"CF",x:34.5,y:30.5},
    {position:"RF",x:40,y:21}
  ];
  function drawDefender(player) {
    const p=project(player.x,player.y),z=zoom;
    ctx.beginPath();ctx.ellipse(p.x+1*z,p.y,3*z,1.3*z,0,0,Math.PI*2);ctx.fillStyle="#21372d40";ctx.fill();
    line({x:p.x-1.2*z,y:p.y},{x:p.x-1*z,y:p.y-4*z},"#f1efe5",1.7);
    line({x:p.x+1.2*z,y:p.y},{x:p.x+1*z,y:p.y-4*z},"#f1efe5",1.7);
    line({x:p.x,y:p.y-4*z},{x:p.x,y:p.y-8*z},"#bd4245",4);
    line({x:p.x-2*z,y:p.y-7*z},{x:p.x-3.5*z,y:p.y-4.5*z},"#ecc29a",1.5);
    ctx.beginPath();ctx.arc(p.x-3.5*z,p.y-4.5*z,1.7*z,0,Math.PI*2);ctx.fillStyle="#9c703d";ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y-10*z,2*z,0,Math.PI*2);ctx.fillStyle="#ecc29a";ctx.fill();
    line({x:p.x-2*z,y:p.y-11.5*z},{x:p.x+2.7*z,y:p.y-11.5*z},"#203e60",2);
    ctx.font=`bold ${7*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#213c31";
    ctx.fillText(player.position,p.x,p.y+7*z);
  }
  function drawFan(fan) {
    const p=project(fan.x,fan.y),z=zoom,h=fan.standSeat?fan.feet*FT:(fan.seated?4+fan.row*3:0);
    p.y-=h*z;
    ctx.beginPath();ctx.ellipse(p.x,p.y,2.7*z,1.3*z,0,0,Math.PI*2);ctx.fillStyle="#203e5240";ctx.fill();
    line({x:p.x-1*z,y:p.y},{x:p.x-1*z,y:p.y-3*z},"#263c50",1.1);
    line({x:p.x+1*z,y:p.y},{x:p.x+1*z,y:p.y-3*z},"#263c50",1.1);
    line({x:p.x,y:p.y-3*z},{x:p.x,y:p.y-7*z},fan.color,3.5);
    ctx.beginPath();ctx.arc(p.x,p.y-9*z,1.9*z,0,Math.PI*2);ctx.fillStyle="#ecc29a";ctx.fill();
  }
  function buildFanDemo() {
    if(fanActive) {toast("End the fan test before building");return;}
    const pathKeys=["14,10","14,9","15,9","16,9","17,9"],seatKey="17,8";
    const additions=pathKeys.filter(k=>!tiles[k]);
    if(pathKeys.some(k=>tiles[k]&&tiles[k].type!=="path")||(tiles[seatKey]&&tiles[seatKey].type!=="bleacher")||
      [...pathKeys,seatKey].some(k=>edges[k+":a"]||edges[k+":d"])) {fanStatus("Demo area is occupied. Your layout was kept. Clear tiles near the entrance or connect your own route.");return;}
    const pairs=[["14,10","14,9"],["14,9","15,9"],["15,9","16,9"],["16,9","17,9"],["17,9",seatKey]];
    if(pairs.some(([a,b])=>wallBlocks(a,b))) {fanStatus("A wall blocks the demo route. Remove it or build your own connected route.");return;}
    const cost=additions.length*prices.path+(tiles[seatKey]?0:prices.bleacher);
    if(money<cost) {toast("Not enough money for demo route");return;}
    history.push(snapshot());
    for(const k of additions)tiles[k]={type:"path",rot:0};
    if(!tiles[seatKey])tiles[seatKey]={type:"bleacher",rot:4};
    money-=cost;store();update();draw();
    fanStatus(`Demo route ready ($${cost}). Click Open gates to watch 24 fans arrive.`);
  }
  function buildStandDemo() {
    if(fanActive){toast("End the game before building");return;}
    const planned={};
    for(const k of ["14,10","14,9","15,9","16,9","17,9","18,9","19,9"])planned[k]={type:"path",rot:0};
    for(const y of [8,7])for(const x of [18,19,20])planned[key(x,y)]={type:x===19?"stairStand":"stand",rot:4,baseFeet:(8-y)*5};
    const blocked=Object.entries(planned).some(([k,v])=>tiles[k]&&(tiles[k].type!==v.type||(isStand(v)&&(tiles[k].rot!==v.rot||tiles[k].baseFeet!==v.baseFeet)))||edges[k+":a"]||edges[k+":d"]);
    const wall=Object.keys(planned).some(k=>{const [x,y]=k.split(",").map(Number);return [[1,0],[0,1]].some(([dx,dy])=>{const next=key(x+dx,y+dy);return planned[next]&&wallBlocks(k,next);});});
    if(blocked||wall){fanStatus("Stand demo area is occupied. Your layout was kept. Build your own stair sections or clear the entrance-side demo area.");return;}
    const additions=Object.entries(planned).filter(([k])=>!tiles[k]),cost=additions.reduce((n,[,v])=>n+prices[v.type],0);
    if(money<cost){toast("Not enough money for stand demo");return;}
    history.push(snapshot());
    for(const [k,v] of additions)tiles[k]=v;
    money-=cost;store();update();draw();
    fanStatus(`Connected stand demo ready ($${cost.toLocaleString()}). 96 seats with two stair sections, rising from 0 to 10 ft. Open gates to watch fans climb.`);
  }
  function buildSideEntryDemo() {
    if(fanActive){toast("End the game before building");return;}
    const planned={};
    for(const k of ["14,10","14,9","15,9","16,9","16,8"])planned[k]={type:"path",rot:0};
    for(const y of [8,7])for(const x of [17,18,19])planned[key(x,y)]={type:x===17?"endStairRight":"stand",rot:4,baseFeet:(8-y)*5};
    if(Object.entries(planned).some(([k,v])=>tiles[k]&&(tiles[k].type!==v.type||(isStand(v)&&(tiles[k].rot!==v.rot||tiles[k].baseFeet!==v.baseFeet)))||edges[k+":a"]||edges[k+":d"])||Object.keys(planned).some(k=>{const [x,y]=k.split(",").map(Number);return [[1,0],[0,1]].some(([dx,dy])=>planned[key(x+dx,y+dy)]&&wallBlocks(k,key(x+dx,y+dy)));})) {
      fanStatus("Side-entry demo area is occupied. Your layout was kept. Use end stairs with a side walkway in your own layout, or clear the demo area near the entrance.");return;
    }
    const additions=Object.entries(planned).filter(([k])=>!tiles[k]),cost=additions.reduce((n,[,v])=>n+prices[v.type],0);
    if(money<cost){toast("Not enough money for side-entry demo");return;}
    history.push(snapshot());
    for(const [k,v] of additions)tiles[k]=v;
    money-=cost;store();update();draw();
    fanStatus(`Side-entry demo ready ($${cost.toLocaleString()}). 80 seats, two end stairs, no front-row sidewalk. Open gates to watch fans enter from the side.`);
  }
  function buildConcourseDemo() {
    if(fanActive){toast("End the game before building");return;}
    const planned={};
    for(const k of ["14,10","14,9","15,9","16,9","16,8"])planned[k]={type:"path",rot:0};
    planned["17,8"]={type:"endStairRight",rot:4,baseFeet:0};
    for(let x=17;x<=21;x++)planned[key(x,7)]={type:"concourse",rot:0,baseFeet:5};
    for(const x of [19,20,21])planned[key(x,8)]={type:x===20?"stairStand":"stand",rot:4,baseFeet:0};
    if(Object.entries(planned).some(([k,v])=>tiles[k]&&(tiles[k].type!==v.type||(isPlatform(v)&&(tiles[k].baseFeet!==v.baseFeet||tiles[k].rot!==v.rot)))||edges[k+":a"]||edges[k+":d"])||Object.keys(planned).some(k=>{const [x,y]=k.split(",").map(Number);return [[1,0],[0,1]].some(([dx,dy])=>planned[key(x+dx,y+dy)]&&wallBlocks(k,key(x+dx,y+dy)));})) {
      fanStatus("Concourse demo area is occupied. Your layout was kept. Build platforms behind your stair tops or clear the demo area near the entrance.");return;
    }
    const additions=Object.entries(planned).filter(([k])=>!tiles[k]),cost=additions.reduce((n,[,v])=>n+prices[v.type],0);
    if(money<cost){toast("Not enough money for concourse demo");return;}
    history.push(snapshot());
    for(const [k,v] of additions)tiles[k]=v;
    money-=cost;store();update();draw();
    fanStatus(`Concourse demo ready ($${cost.toLocaleString()}). 48 seats: side stairs → 5 ft rear concourse → seating aisle. No front-row sidewalk.`);
  }
  function buildDiagonalDemo() {
    if(fanActive){toast("End the game before building");return;}
    const planned={};
    // A diagonal outfield stand parallel to the stadium's northeast boundary.
    for(let n=0;n<7;n++)planned[key(42+n,36-n)]={type:n===0?"stairStand":"stand",rot:1,baseFeet:0};
    const walk=[[14,10],[14,9],[13,9],[13,10],[13,11],[12,11]];
    for(let y=12;y<=45;y++)walk.push([12,y]);
    for(let x=13;x<=31;x++)walk.push([x,45]);
    for(let n=0;n<10;n++){walk.push([31+n,44-n]);walk.push([32+n,44-n]);}
    for(const [x,y] of walk)planned[key(x,y)]={type:"path",rot:0};
    const merged={...tiles,...planned};
    const conflict=Object.entries(planned).some(([k,v])=>{
      const [x,y]=k.split(",").map(Number),existing=tiles[k];
      return existing&&(existing.type!==v.type||existing.rot!==v.rot||existing.baseFeet!==v.baseFeet)||footprintError(x,y,v,merged)||edges[k+":a"]||edges[k+":d"];
    });
    if(conflict||Object.keys(planned).some(k=>{const [x,y]=k.split(",").map(Number);return neighborOffsets.some(([dx,dy])=>planned[key(x+dx,y+dy)]&&wallBlocks(k,key(x+dx,y+dy)));})){fanStatus("Diagonal demo area is occupied or blocked. Your park was kept. Clear the outfield strip near tiles 42,36–48,30 and its left-field approach, or build your own diagonal sections.");return;}
    const additions=Object.entries(planned).filter(([k])=>!tiles[k]),cost=additions.reduce((n,[,v])=>n+prices[v.type],0);
    if(money<cost){toast("Not enough money for diagonal demo");return;}
    history.push(snapshot());
    for(const [k,v] of additions)tiles[k]=v;
    money-=cost;store();update();draw();
    fanStatus(`Diagonal demo ready ($${cost.toLocaleString()}). 128 seats beyond the outfield; 100 fans can use the central stairs. R rotates sections 45°.`);
  }
  function buildBackstopDemo() {
    if(fanActive){toast("End the game before building");return;}
    const planned={"13,12":{type:"backstopStair",rot:5,baseFeet:0},"14,11":{type:"backstopStand",rot:5,baseFeet:0},"10,14":{type:"stairs",rot:0,baseFeet:0}};
    for(const k of ["11,7","11,8","11,9","10,9","10,10","10,11","10,12","10,13"])planned[k]={type:"path",rot:0};
    for(const k of ["10,15","11,15","11,14","11,13","11,12","11,11","12,11"])planned[k]={type:"concourse",rot:0,baseFeet:5};
    for(const [k,v] of Object.entries(planned))if(tiles[k]&&JSON.stringify(tiles[k])!==JSON.stringify(v)){fanStatus("Backstop demo area occupied. Your layout was kept; try it in a clear park or build the pieces yourself.");return;}
    try{validatePark({version:2,fieldRevision:6,money,team,tiles:{...tiles,...planned},edges});}catch(e){fanStatus("Backstop demo cannot fit: "+e.message);return;}
    if(Object.keys(planned).some(k=>{const [x,y]=k.split(",").map(Number);return neighborOffsets.some(([dx,dy])=>planned[key(x+dx,y+dy)]&&wallBlocks(k,key(x+dx,y+dy)));})){fanStatus("A wall blocks the demo. Your park was kept.");return;}
    const additions=Object.entries(planned).filter(([k])=>!tiles[k]),cost=additions.reduce((n,[,v])=>n+prices[v.type],0);
    if(money<cost){toast("Not enough money for demo");return;}
    history.push(snapshot());for(const [k,v] of additions)tiles[k]=v;money-=cost;store();update();draw();
    fanStatus(`Backstop demo ready ($${cost.toLocaleString()}). 28 seats flush to the fence, standalone stairs and a 5 ft rear concourse. Access starts at the main gate tile 11,7.`);
  }
  document.getElementById("demoBackstop").onclick=buildBackstopDemo;
  document.getElementById("demoDiagonal").onclick=buildDiagonalDemo;
  document.getElementById("demoConcourse").onclick=buildConcourseDemo;
  document.getElementById("demoSideEntry").onclick=buildSideEntryDemo;
  document.getElementById("demoStands").onclick=buildStandDemo;
  document.getElementById("demoFans").onclick=buildFanDemo;
  document.getElementById("openGates").onclick=startFanTest;
  document.getElementById("stopFans").onclick=()=>endFanTest();
  function draw() {
    if (pointer) hover = inverse(pointer.x, pointer.y);
    const cw = canvas.clientWidth,
      ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#91b981";
    ctx.fillRect(0, 0, cw, ch);
    for (let sum = 0; sum < W + H - 1; sum++) {
      for (let x = Math.max(0, sum - (H - 1)); x <= Math.min(W - 1, sum); x++) {
        let y = sum - x;
        const p = project(x + 0.5, y + 0.5);
        if (
          p.x < -TW * zoom ||
          p.x > cw + TW * zoom ||
          p.y < -TH * zoom ||
          p.y > ch + TH * zoom
        )
          continue;
        let isField = field.has(key(x, y));
        diamond(
          x + 0.5,
          y + 0.5,
          isField
            ? (x + y) % 2
              ? "#78ae69"
              : "#80b775"
            : (x + y) % 2
              ? "#8eb97c"
              : "#94bf83",
          isField ? "#73a56a" : "#7da972",
        );
      }
    }
    drawStreets();
    drawParking();
    pitch();
    if(!usesBackstop())diamond(14.5,10.5,PAVEMENT,PAVEMENT_EDGE);
    // Pavement belongs to the ground pass, below every person and structure.
    for(const [k,v] of Object.entries(tiles)) if(isPath(v)) {
      const [x,y]=k.split(",").map(Number);drawObject(x,y,v);
    }
    let all = Object.entries(tiles)
      .filter(([,v])=>!isPath(v))
      .flatMap(([k, v]) => {
        const [x,y]=k.split(",").map(Number);
        if(isRamp(v))return Array.from({length:24},(_,n)=>{const p=rampPoint(x,y,v,(n+0.5)/4);return {x:p.x-0.5,y:p.y-0.5,v,rampPatch:n,originX:x,originY:y};});
        if(v.type==="concourse") {
          const parts=[];
          for(let a=0;a<4;a++)for(let b=0;b<4;b++)parts.push({x:x+a/4-0.375,y:y+b/4-0.375,v,deckPatch:[a/4,b/4],originX:x,originY:y});
          for(const [i,a,b] of [[0,0.5,0],[1,1,0.5],[2,0.5,1],[3,0,0.5]])parts.push({x:x+a-0.5,y:y+b-0.5,v,deckRail:i,originX:x,originY:y});
          return parts;
        }
        return isStand(v)?[0,1,2,3].map(row=>{const p=standPoint(x,y,v,0,-0.3125+row/4);return {x:p.x-0.5,y:p.y-0.5,v,standRow:row,originX:x,originY:y};}):[{x,y,v}];
      })
      .concat(Object.keys(edges).map(edge => {
        const p = edgePanel(edge);
        return {x:(p.a[0]+p.b[0])/2-0.5, y:(p.a[1]+p.b[1])/2-0.5, edge};
      }))
      .concat(defensivePlayers.map(player=>({x:player.x-0.5,y:player.y-0.5,player})))
      .concat(dugouts.map(dugout=>({x:dugout.x+(dugout.swap?dugout.width:dugout.length)/2-0.5,y:dugout.y+(dugout.swap?dugout.length:dugout.width)/2-0.5,dugout})))
      .concat(fans.filter(f=>f.spawned&&!f.exited).map(fan=>({x:fan.x-0.5,y:fan.y-0.5,fan})))
      .concat(neighborhood.map(building=>({x:building.x+building.w/2-0.5,y:building.y+building.d/2-0.5,building})))
      .concat(streetLamps.map(lamp=>({x:lamp.x-0.5,y:lamp.y-0.5,lamp})))
      .concat(roadsideTrees.map(tree=>({x:tree.x-0.5,y:tree.y-0.5,tree})))
      .concat(outerFence.map(panel=>({x:(panel.a[0]+panel.b[0])/2-0.5,y:(panel.a[1]+panel.b[1])/2-0.5,panel})))
      .concat([{x:11,y:7,mainEntry:true}])
      .concat(fieldFence.map(panel => ({x:(panel.a[0]+panel.b[0])/2-0.5, y:(panel.a[1]+panel.b[1])/2-0.5, panel})))
      .sort((a, b) => {
        let aa = rotated(a.x, a.y),
          bb = rotated(b.x, b.y);
        const depth=aa.x+aa.y-(bb.x+bb.y);
        return Math.abs(depth)>1e-8?depth:(a.fan?1:0)-(b.fan?1:0);
      });
    for (let e of all) {
      if(e.rampPatch!==undefined)drawRampPatch(e.originX,e.originY,e.v,e.rampPatch);
      else if(e.deckPatch)drawConcourse(e.originX,e.originY,e.v,false,e.deckPatch);
      else if(e.deckRail!==undefined)drawConcourse(e.originX,e.originY,e.v,true,null,e.deckRail);
      else if(e.standRow!==undefined)drawStandRow(e.originX,e.originY,e.v,e.standRow);
      else if(e.player)drawDefender(e.player);
      else if(e.fan)drawFan(e.fan);
      else if(e.building)drawNeighborhood(e.building);
      else if(e.lamp)drawStreetLamp(e.lamp);
      else if (e.tree) drawRoadsideTree(e.tree);
      else if (e.mainEntry) drawMainGate();
      else if (e.dugout) drawDugout(e.dugout);
      else if (e.edge) drawWall(e.edge);
      else if (e.panel) drawFieldFence(e.panel);
      else drawObject(e.x, e.y, e.v);
    }
    if(!fanActive)for(const [k,v] of Object.entries(tiles))if(hasStairs(v)&&(isPlatform({type:tool})||isPath({type:tool})||hover&&k===key(hover.x,hover.y))) {
      const [x,y]=k.split(",").map(Number);drawStairEntrance(x,y,v);
    }
    const help=document.getElementById("standHelp");
    const hovered=hover&&tiles[key(hover.x,hover.y)];
    help.hidden=!isPlatform({type:tool})&&!hasStairs(hovered);
    if(!help.hidden) {
      const snap=hover?standPlacement(hover.x,hover.y,rot):{baseFeet:0};
      help.textContent=tool==="ramp"?`Ramp · 10 × 60 ft · six cells · 1:12 slope · ${snap.baseFeet}–${snap.baseFeet+5} ft. Connect only at its low and high ends.`:tool==="cornerLanding"?`Triangular corner landing · ${snap.baseFeet} ft · R turns 90°. Connect separate seating banks through stairs and concourses; seats do not join across the corner.`:tool==="stairs"?`Standalone stairs · no seats · ${snap.baseFeet}–${snap.baseFeet+5} ft. Path at bottom; matching-height concourse at top. R rotates 45°.`:isBackstop({type:tool})?`Backstop section · field-facing · front edge aligns with the diagonal fence. Place at 15,10 / 14,11 / 13,12 / 12,13. Use a rear concourse and backstop stair section for access; these deeper front sections do not stack uphill.`:hasStairs(hovered)?stairEntrance(hover.x,hover.y,hovered).message:snap.error||(tool==="concourse"?`Level concourse · 10 × 10 ft · ${snap.baseFeet} ft high. Snaps to stair tops and adjoining platforms. Only matching walking heights connect.`:(isEndStair({type:tool})?`End stairs · no seats · ${rot%2?"14.1 ft diagonal footprint; stairs + side landing":"5 ft stairs + 5 ft level landing"} · +5 ft rise. Base: ${snap.baseFeet} ft. Green arrow marks the side walkway entrance. Connect the highlighted entry walkway continuously to the gate. R rotates 45°; choose the other end piece to mirror.`:`${tool==="stand"?"20 seats · 5 per row":"8 seats · 6 ft central stairs"} · 4 rows · ${rot%2?"14.1 × 14.1 ft diagonal":"10 × 10 ft"} · +5 ft rise. Base: ${snap.baseFeet} ft. Match facing; build behind to rise. Connect a path to the front of a stair section.`));
      if(snap.error&&!hasStairs(hovered))help.textContent=snap.error;
    }
    if (hover && hover.x >= 0 && hover.x < W && hover.y >= 0 && hover.y < H) {
      const edge = wallEdge(hover.x, hover.y);
      const standSnap=isPlatform({type:tool})?standPlacement(hover.x,hover.y,rot):null;
      const occupied = tool === "wall" ? edges[edge] || !edgeAllowed(edge) || diagonalWallCollision(edge) || sceneryBlocksEdge(edge) || (/[ad]$/.test(edge) && tiles[key(hover.x,hover.y)])
        : standSnap?.error || footprintError(hover.x,hover.y,{type:tool,rot}) || blockedTile(key(hover.x, hover.y)) || (tiles[key(hover.x, hover.y)]&&!(tiles[key(hover.x,hover.y)].type==="halfPath"&&(tool==="path"||(tool==="halfPath"&&(rot+4)%8===tiles[key(hover.x,hover.y)].rot)))) || edges[key(hover.x,hover.y)+":a"] || edges[key(hover.x,hover.y)+":d"];
      if (tool === "wall") {
        drawWall(edge, occupied ? "#d35b65aa" : "#f5d554bb");
        const panel = edgePanel(edge);
        line(project(...panel.a), project(...panel.b), occupied ? "#ba3030" : "#ffe66d", 3);
        return;
      }
      diamond(
        hover.x + 0.5,
        hover.y + 0.5,
        tool === "erase" ? "#f0717299" : occupied ? "#f0717299" : "#f8e78c99",
        occupied ? "#a93131" : "#f6e284",
      );
      if (tool !== "erase" && tool!=="paint" && !occupied) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        const preview={type:tool,rot,baseFeet:standSnap?.baseFeet||0};
        if(isStand(preview)||isRamp(preview)||isDeck(preview))polygon(footprint(hover.x,hover.y,preview).map(([x,y])=>project(x,y)),"#f8e78c44","#f6e284");
        drawObject(hover.x,hover.y,preview);
        if(hasStairs(preview))drawStairEntrance(hover.x,hover.y,preview);
        ctx.restore();
      }
    }
  }
  function update() {
    for(const role of ["primary","secondary","accent"])document.getElementById("team"+role).value=team[role];
    document.getElementById("fieldMaterial").value=team.fenceMaterial;
    if(!fanActive) {
      const reached=new Set(reachableSeats().map(s=>s.key));
      disconnectedSections=new Set(Object.entries(tiles).filter(([k,v])=>seatCapacity(v)&&!reached.has(k)).map(([k])=>k));
    }
    document.getElementById("money").textContent = "$" + money.toLocaleString();
    document.getElementById("seats").textContent =
      Object.values(tiles).reduce((sum,item)=>sum+seatCapacity(item),0);
    document.getElementById("placed").textContent = Object.keys(tiles).length + Object.keys(edges).length;
    document.getElementById("rotation").textContent = tool === "wall" ? ({0:"Top edge",2:"Right edge",4:"Bottom edge",6:"Left edge",1:"Diagonal /",5:"Diagonal \\"})[rot] : rot * 45 + "°";
    document.getElementById("rotate").textContent = tool === "wall" ? "↻ Wall edge (R)" : (isDeck({type:tool})||isRamp({type:tool})||tool==="halfPath")?"↻ Section 90° (R)":"↻ Item 45° (R)";
    document.getElementById("mobileRotate").textContent = tool === "wall" ? "↻ Wall edge" : (isDeck({type:tool})||isRamp({type:tool})||tool==="halfPath")?"↻ Section 90°":"↻ Item 45°";
  }
  function toast(s) {
    const t = document.getElementById("toast");
    t.textContent = s;
    t.classList.add("on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("on"), 1800);
  }
  function store() {
    try {
      localStorage.setItem(
        "svs01",
        JSON.stringify({ version: 2, fieldRevision: 6, tiles, edges, money, team }),
      );
      return true;
    } catch (e) {
      toast("Browser storage unavailable. Export a park backup.");
      return false;
    }
  }
  function action() {
    if(fanActive) {toast("End the fan test before building");return;}
    disconnectedSections.clear();
    if (!hover) return;
    let k = key(hover.x, hover.y);
    if((tool==="erase"||tool==="paint")&&!tiles[k])for(const [rk,rv] of Object.entries(tiles))if(isRamp(rv)){const [rx,ry]=rk.split(",").map(Number);if(overlaps(footprint(hover.x,hover.y,{type:"path"}),footprint(rx,ry,rv))){k=rk;break;}}
    if (hover.x < 0 || hover.x >= W || hover.y < 0 || hover.y >= H) return;
    const edge = wallEdge(hover.x, hover.y);
    if(tool==="paint") {
      const candidates=wallSlots.map(r=>wallEdge(hover.x,hover.y,r)).filter(k=>edges[k]);
      const distance=edge=>{const {a,b}=edgePanel(edge),p=pointer||project(hover.x+0.5,hover.y+0.5),u=project(...a),v=project(...b),dx=v.x-u.x,dy=v.y-u.y,t=Math.max(0,Math.min(1,((p.x-u.x)*dx+(p.y-u.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-u.x-t*dx,p.y-u.y-t*dy);};
      candidates.sort((a,b)=>distance(a)-distance(b));const edgeKey=candidates[0];
      const item=tiles[k]&&(!edgeKey||distance(edgeKey)>7*zoom)?tiles[k]:null;
      if(item&&(isPath(item)||isDeck(item))){toast("Choose seats, a shop, a scoreboard or a wall");return;}
      if(!item&&!edgeKey){toast("Choose an existing section, building or wall");return;}
      const custom=document.getElementById("paintLinked").checked?null:{primary:document.getElementById("customPrimary").value||team.primary,secondary:team.secondary,accent:team.accent};
      if(custom&&!validColor(custom.primary)){toast("Choose a valid color");return;}
      history.push(snapshot());
      const apply=old=>{const next={...old};if(custom)next.customColors=custom;else delete next.customColors;return next;};
      if(item)tiles[k]=apply(item);
      else edges[edgeKey]={...apply(edges[edgeKey]),material:document.getElementById("wallMaterial").value||"chain"};
      store();update();draw();toast(custom?"Custom colors applied; this item keeps its colors":"Item now follows team colors");return;
    }
    if (tool === "wall") {
      if (edges[edge]) { toast("This edge already has a wall"); return; }
      if (!edgeAllowed(edge)) { toast("Keep the playing field clear!"); return; }
      if(diagonalWallCollision(edge)){toast("Wall crosses a diagonal section");return;}
      if(sceneryBlocksEdge(edge)){toast("Neighborhood scenery is outside the construction area");return;}
      if (/[ad]$/.test(edge) && tiles[k]) { toast("Diagonal crosses an occupied tile"); return; }
      if (money < prices.wall) { toast("Not enough money"); return; }
      history.push(snapshot());
      edges[edge] = {type:"wall",material:document.getElementById("wallMaterial").value||"chain"};
      money -= prices.wall;
    } else if (tool === "erase") {
      // Pick the nearest visible boundary; a center click removes the tile object.
      const candidates = wallSlots.map(r => wallEdge(hover.x,hover.y,r)).filter(k => edges[k]);
      const distance = k => {
        const panel = edgePanel(k), a = project(...panel.a), b = project(...panel.b);
        const p = pointer || project(hover.x+0.5,hover.y+0.5);
        const dx=b.x-a.x, dy=b.y-a.y, t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
      };
      candidates.sort((a,b)=>distance(a)-distance(b));
      const chosen = candidates[0];
      const removeEdge = chosen && (!tiles[k] || distance(chosen) < 7 * zoom);
      if (!removeEdge && !tiles[k]) return;
      history.push(snapshot());
      if (removeEdge) { delete edges[chosen]; money += Math.round(prices.wall*0.7); }
      else { money += Math.round(prices[tiles[k].type]*0.7); delete tiles[k]; }
    } else {
      if (blockedTile(k)) { toast("Keep the playing field clear!"); return; }
      const complete=tiles[k]?.type==="halfPath"&&(tool==="path"||(tool==="halfPath"&&(rot+4)%8===tiles[k].rot));
      if(complete) {
        if(money<prices.halfPath){toast("Not enough money");return;}
        history.push(snapshot());money-=prices.halfPath;tiles[k]={type:"path",rot:0};update();store();draw();return;
      }
      if (tiles[k] || edges[k+":a"] || edges[k+":d"]) { toast("Tile is already occupied"); return; }
      if (money < prices[tool]) { toast("Not enough money"); return; }
      const shapeError=footprintError(hover.x,hover.y,{type:tool,rot});
      if(shapeError){toast(shapeError);return;}
      const snap=isPlatform({type:tool})?standPlacement(hover.x,hover.y,rot):null;
      if(snap?.error) {toast(snap.error);return;}
      history.push(snapshot());
      money -= prices[tool];
      tiles[k] = {type:tool, rot,...(snap?{baseFeet:snap.baseFeet}:{})};
      if(snap)toast(`Section placed · ${snap.baseFeet}–${snap.baseFeet+5} ft · ${seatCapacity(tiles[k])} seats. Connect stair sections for access.`);
    }
    if (history.length > 70) history.shift();
    update();
    store();
    draw();
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = wrap.clientWidth,
      h = wrap.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!cameraInit) {
      const bounds=streetBoundary.map(([x,y])=>{const r=rotated(x,y);return point(r.x,r.y);});
      const width=Math.max(...bounds.map(p=>p.x))-Math.min(...bounds.map(p=>p.x));
      const height=Math.max(...bounds.map(p=>p.y))-Math.min(...bounds.map(p=>p.y));
      zoom=Math.min(1.14,(w-80)/width,(h-160)/height);
      zoom=Math.max(0.45,zoom);
      cameraInit = true;
      centerField();
    }
    draw();
  }
  new ResizeObserver(resize).observe(wrap);
  function select(t) {
    tool = t;
    if(t==="halfPath"){rot-=rot%2;toast("Half-tile paving · R turns the corner 90°. Place its opposite half to complete the square.");}
    if(isDeck({type:t})||isRamp({type:t})) {rot=rot-rot%2;toast(t==="ramp"?"Six-cell ramp: 5 ft rise over 60 ft. Join paths or matching-height concourses at its ends.":"Landings snap to stair and ramp heights. Matching elevations connect; exposed edges get rails.");}
    if(isBackstop({type:t}))rot=5;
    if(isStand({type:t})) {toast(isEndStair({type:t})?"Green arrow = side walkway entrance. Match the stand facing; use the other end piece to mirror.":"Sections rotate 45°; matching diagonal pieces snap together. Place stairs in the same direction; connect a path at their front.");}
    if (t === "wall") { if (!wallSlots.includes(rot)) rot = 0; toast("R cycles 4 tile edges and 2 corner-to-corner diagonals."); }
    update(); draw();
    if (t === "bleacher") toast("Gold arrow = fans face this way. R rotates before placement.");
    document
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("sel", b.dataset.tool === t));
  }
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => (b.onclick = () => select(b.dataset.tool)));
  for(const role of ["primary","secondary","accent"])document.getElementById("team"+role).onchange=e=>{
    if(!validColor(e.target.value))return;
    history.push(snapshot());team={...team,[role]:e.target.value};store();update();draw();
  };
  document.getElementById("fieldMaterial").onchange=e=>{
    if(!["chain","padded"].includes(e.target.value))return;
    history.push(snapshot());team={...team,fenceMaterial:e.target.value};store();update();draw();
  };
  document.getElementById("paintTool").onclick=()=>select("paint");
  document.getElementById("rotate").onclick = rotationStep;
  document.getElementById("undo").onclick = () => {
    if(fanActive)endFanTest("Layout changed; fan test ended.");
    let h = history.pop();
    if (h) {
      tiles = h.tiles;
      edges = h.edges;
      money = h.money;
      team=h.team||team;
      update();
      store();
      draw();
    }
  };
  document.getElementById("zoomIn").onclick = () => {
    zoom = Math.min(3, zoom * 1.18);
    draw();
  };
  document.getElementById("zoomOut").onclick = () => {
    zoom = Math.max(0.45, zoom / 1.18);
    draw();
  };
  document.getElementById("save").onclick = () => {
    if (store()) toast("Park saved in this browser");
  };
  document.getElementById("reset").onclick = () => {
    if(fanActive)endFanTest("Layout changed; fan test ended.");
    if (confirm("Reset the ballpark and restore the starting budget?")) {
      tiles = {};
      edges = {};
      money = 500000;
      history = [];
      store();
      update();
      draw();
    }
  };
  document.getElementById("cameraRotate").onclick = rotateCamera;
  document.getElementById("centerField").onclick = centerField;
  document.getElementById("mobileCamera").onclick = rotateCamera;
  document.getElementById("mobileRotate").onclick = () =>
    document.getElementById("rotate").click();
  document.getElementById("mobileUndo").onclick = () =>
    document.getElementById("undo").click();
  document.getElementById("mobileCenter").onclick = centerField;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    down = { ...p, panX, panY, button: e.button, id: e.pointerId };
    dragged = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = local(e);
    pointer = p;
    if (down && Math.hypot(p.x - down.x, p.y - down.y) > 7) {
      dragged = true;
      panX = down.panX + p.x - down.x;
      panY = down.panY + p.y - down.y;
    }
    hover = inverse(p.x, p.y);
    document.getElementById("coords").textContent = `${hover.x}, ${hover.y}`;
    draw();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    if (!dragged && e.button !== 2) {
      const p = local(e);
      pointer = p;
      hover = inverse(p.x, p.y);
      action();
    }
    down = null;
  });
  canvas.addEventListener("pointercancel", () => (down = null));
  canvas.addEventListener("pointerleave", () => {
    if (!down) {
      pointer = null;
      hover = null;
      draw();
    }
  });
  canvas.oncontextmenu = (e) => e.preventDefault();
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = local(e),
        before = inverse(p.x, p.y),
        factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const old = zoom;
      zoom = Math.max(0.45, Math.min(3, zoom * factor));
      panX = p.x - ((p.x - panX) * zoom) / old;
      panY = p.y - ((p.y - panY) * zoom) / old;
      draw();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    )
      return;
    if (e.key.toLowerCase() === "r") {
      rotationStep();
    }
    if (e.key.toLowerCase() === "q") {
      rotateCamera();
    }
    if (e.key.toLowerCase() === "z") {
      document.getElementById("undo").click();
    }
    if(e.key.toLowerCase()==="w")select("path");
    if(e.key.toLowerCase()==="g")select("erase");
    if (e.key === "Escape") select("erase");
  });
  function validatePark(saved) {
    if (
      !saved ||
      !saved.tiles ||
      typeof saved.tiles !== "object" ||
      Array.isArray(saved.tiles) ||
      !Number.isFinite(saved.money) ||
      saved.money < 0 ||
      saved.money > Number.MAX_SAFE_INTEGER
    )
      throw Error("Invalid park file");
    const clean = {}, cleanEdges = {};
    let cash = saved.money;
    const cleanTeam=saved.team?{...cleanColors(saved.team),fenceMaterial:saved.team.fenceMaterial||"chain"}:{...defaultTeam};
    if(!["chain","padded"].includes(cleanTeam.fenceMaterial))throw Error("Invalid field fence material");
    const metadata=v=>{
      const out={};if(v.customColors!==undefined)out.customColors=cleanColors(v.customColors);
      if(v.material!==undefined){if(!["wood","chain","padded"].includes(v.material))throw Error("Invalid fence material");out.material=v.material;}
      return out;
    };
    const migrateField = (saved.version === 1 || saved.version === 2) && (!saved.fieldRevision || saved.fieldRevision < 6);
    if (saved.edges !== undefined && (!saved.edges || typeof saved.edges !== "object" || Array.isArray(saved.edges))) throw Error("Invalid walls");
    for (const [edge,v] of Object.entries(saved.edges || {})) {
      if (!/^\d+,\d+:[hvad]$/.test(edge) || !v || v.type !== "wall") throw Error("Invalid wall edge");
      if (!edgeAllowed(edge)) {
        const panel=edgePanel(edge);
        if(migrateField && [...panel.a,...panel.b].every(v=>v>=0&&v<=60)) {cash+=prices.wall;continue;}
        throw Error("Invalid wall edge");
      }
      cleanEdges[edge] = {type:"wall",...metadata(v)};
    }
    for (const [k, v] of Object.entries(saved.tiles)) {
      if (!/^\d+,\d+$/.test(k)) throw Error("Invalid tile");
      const [x, y] = k.split(",").map(Number);
      if (
        x >= W ||
        y >= H ||
        (blockedTile(k) && !migrateField) ||
        !v ||
        !Object.hasOwn(prices, v.type) ||
        !Number.isInteger(v.rot) ||
        v.rot < 0 ||
        v.rot > 7
      )
        throw Error("Invalid construction");
      if (blockedTile(k) && migrateField) { cash+=prices[v.type];continue; }
      if (v.type === "wall") {
        const edge = wallEdge(x, y, v.rot);
        if (cleanEdges[edge]) cash += prices.wall;
        else cleanEdges[edge] = {type:"wall",...metadata(v)};
      } else {
        if(v.type==="halfPath"&&v.rot%2!==0)throw Error("Invalid paving corner");
        if(isBackstop(v)&&v.rot!==5)throw Error("Backstop pieces must face the field");
        if(isPlatform(v)&&(!Number.isInteger(v.baseFeet)||v.baseFeet<0||v.baseFeet>300||v.baseFeet%5!==0||((isDeck(v)||isRamp(v))&&v.rot%2!==0)||(isRamp(v)&&v.baseFeet>295)))throw Error("Invalid stand height or facing");
        clean[k]={type:v.type,rot:v.rot,...(isPlatform(v)?{baseFeet:v.baseFeet}:{}),...metadata(v)};
      }
    }
    for (const k of Object.keys(clean))
      if (cleanEdges[k+":a"] || cleanEdges[k+":d"]) throw Error("Diagonal crosses an occupied tile");
    for(const [k,v] of Object.entries(clean))if((isStand(v)&&v.rot%2)||isRamp(v)||v.type==="cornerLanding") {
      const [x,y]=k.split(",").map(Number),error=footprintError(x,y,v,clean,cleanEdges);
      if(error)throw Error(error);
    }
    return { tiles: clean, edges: cleanEdges, money: cash, team:cleanTeam };
  }
  document.getElementById("export").onclick = () => {
    const blob = new Blob(
        [JSON.stringify({ version: 2, fieldRevision: 6, tiles, edges, money, team }, null, 2)],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "sports-venue-park.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.getElementById("import").onclick = () =>
    document.getElementById("importFile").click();
  document.getElementById("importFile").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error("Park file is too large");
      const park = validatePark(JSON.parse(await file.text()));
      if (confirm("Replace the current layout with this park?")) {
        history.push(snapshot());
        if(fanActive)endFanTest("Park imported; fan test ended.");
        tiles = park.tiles;
        edges = park.edges;
        money = park.money;
        team=park.team;
        store();
        update();
        draw();
        toast("Park imported");
      }
    } catch (error) {
      toast(error.message || "Unable to import park");
    } finally {
      e.target.value = "";
    }
  };
  try {
    const raw = localStorage.getItem("svs01");
    if (raw) {
      const saved = validatePark(JSON.parse(raw));
      tiles = saved.tiles;
      edges = saved.edges;
      money = saved.money;
      team=saved.team;
      store();
    }
  } catch (e) {
    toast("Saved park could not be loaded. Import a backup if available.");
  }
  update();
  resize();
})();
