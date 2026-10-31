(() => {
  "use strict";
  const PAVEMENT = "#dedbc9", PAVEMENT_EDGE = "#aaa99c";
  const W = 60,
    H = 60,
    TW = 38,
    TH = 19,
    prices = {
      path: 100,
      bleacher: 1500,
      stand: 1800,
      stairStand: 1600,
      endStairLeft: 1200,
      endStairRight: 1200,
      wall: 200,
      gate: 800,
      concession: 2500,
      restroom: 2000,
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
    money = 100000,
    tiles = {},
    edges = {},
    history = [];
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
  const isEndStair = item => item?.type === "endStairLeft" || item?.type === "endStairRight";
  const endSide = item => item.type === "endStairLeft" ? -1 : 1;
  const isStand = item => item?.type === "stand" || item?.type === "stairStand" || isEndStair(item);
  const hasStairs = item => item?.type === "stairStand" || isEndStair(item);
  const rowOpens = (item,side) => !isEndStair(item) || side === -endSide(item);
  const stairCenter = item => isEndStair(item) ? -endSide(item)*0.25 : 0;
  const seatCapacity = item => item?.type === "bleacher" ? 24 : item?.type === "stand" ? 20 : item?.type === "stairStand" ? 8 : 0;
  const FT = TW / 20, STAND_RISE = 5;
  function standAxes(rotation) {
    const [ax,ay]=directions[rotation];
    return {ax,ay,bx:-ay,by:ax}; // a = across the row; b = uphill, away from the field.
  }
  function standPoint(x,y,item,a,b,feet=item.baseFeet||0) {
    const {ax,ay,bx,by}=standAxes(item.rot);
    return {x:x+0.5+ax*a+bx*b,y:y+0.5+ay*a+by*b,feet};
  }
  function matchingStand(x,y,item,da,db) {
    const {ax,ay,bx,by}=standAxes(item.rot),nx=x+ax*da+bx*db,ny=y+ay*da+by*db;
    const next=tiles[key(nx,ny)];
    return isStand(next)&&next.rot===item.rot&&next.baseFeet===(item.baseFeet||0)+db*STAND_RISE&&!wallBlocks(key(x,y),key(nx,ny));
  }
  function standPlacement(x,y,rotation) {
    const {ax,ay,bx,by}=standAxes(rotation),heights=[];
    for(const [da,db] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const next=tiles[key(x+ax*da+bx*db,y+ay*da+by*db)];
      if(isStand(next)&&next.rot===rotation)heights.push(next.baseFeet-db*STAND_RISE);
    }
    if(heights.some(h=>h!==heights[0]))return {error:"These neighbors have conflicting heights. Leave a gap or undo the mismatched section."};
    const baseFeet=heights[0]??0;
    if(baseFeet<0||baseFeet>300)return {error:"Start at ground level and build uphill behind the front row."};
    return {baseFeet};
  }
  // Each row is a separate painter entry, so fans and neighboring sections share depth order.
  function drawStandRow(x,y,item,row) {
    const base=item.baseFeet||0,b=-0.5+row/4,top=base+(row+1)*1.25;
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
    if(isEndStair(item)) {
      const side=endSide(item),inner=-side,sa=side>0?-0.5:0,la=side>0?0:-0.5;
      const along=(a,b1,b2,h)=>line(screen(a,b1,h+3),screen(a,b2,h+3),"#8ca2aa",1);
      // The outer half is a level landing, never a ramp to the elevated rows.
      prism(la,b,0.5,0.25,0,base+0.04,"#8e9898","#dedbc9",[0,2]);
      for(let n=0;n<2;n++) {
        const h=base+row*1.25+(n+1)*0.625,sb=b+n*0.125;
        prism(sa,sb,0.5,0.125,0,h,"#8e9898","#e1e0d4",[2]);
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
    const front=row>0||matchingStand(x,y,item,0,-1),back=row<3||matchingStand(x,y,item,0,1);
    const hidden=[...(front?[0]:[]),...(right?[1]:[]),...(back?[2]:[]),...(left?[3]:[])];
    // Full-width concrete tiers meet exactly at tile edges, without duplicate end rails.
    if(item.type==="stand")prism(-0.5,b,1,0.25,0,top,"#8e9898","#c9ceca",hidden);
    else {
      prism(-0.5,b,0.2,0.25,0,top,"#8e9898","#c9ceca",[0,1,2,...(left?[3]:[])]);
      prism(0.3,b,0.2,0.25,0,top,"#8e9898","#c9ceca",[0,2,3,...(right?[1]:[])]);
      for(let step=0;step<2;step++) {
        const h=base+row*1.25+(step+1)*0.625,sb=b+step*0.125;
        prism(-0.3,sb,0.6,0.125,0,h,"#8e9898","#e1e0d4",[1,2,3,...(step===0&&front?[0]:[])]);
        line(screen(-0.3,sb,h+0.01),screen(0.3,sb,h+0.01),"#edc75b",0.8);
      }
    }
    const seats=item.type==="stand"?[-0.4,-0.2,0,0.2,0.4]:[-0.4,0.4];
    for(const a of seats) {
      // Five 2-foot seat bays, or one bay on either side of the 6-foot stair aisle.
      prism(a-0.075,b+0.10,0.15,0.11,top,top+1.4,"#344f65","#e3b84d");
      prism(a-0.075,b+0.205,0.15,0.025,top+1.4,top+2.8,"#25465e","#54738a");
    }
    const rail=(a1,b1,a2,b2,h)=>{
      line(screen(a1,b1,h),screen(a1,b1,h+3),"#627986",0.8);
      line(screen(a1,b1,h+3),screen(a2,b2,h+3),"#a4b5b9",1);
    };
    if(!left)rail(-0.5,b,-0.5,b+0.25,top);
    if(!right)rail(0.5,b,0.5,b+0.25,top);
    if(row===3&&!back) {
      if(item.type==="stand")rail(-0.5,0.5,0.5,0.5,top);
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
      const p=screen(0,0,base+8);ctx.font=`bold ${8*zoom}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#a51e2a";ctx.fillText("NO STAIRS",p.x,p.y);
    }
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
    polygon([a, b, {x:b.x,y:b.y-h}, {x:a.x,y:a.y-h}], color, "#563b35", 1);
    line({x:a.x,y:a.y-h}, {x:b.x,y:b.y-h}, "#e0a15c", 3);
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
    rot = tool === "wall" ? wallSlots[(wallSlots.indexOf(rot) + 1) % wallSlots.length] : (rot + (isStand({type:tool})?2:1)) % 8;
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
    if(isStand(item)) {
      const rows=[0,1,2,3].sort((a,b)=>{const p=standPoint(x,y,item,0,-0.375+a/4),q=standPoint(x,y,item,0,-0.375+b/4);return project(p.x,p.y).y-project(q.x,q.y).y;});
      for(const row of rows)drawStandRow(x,y,item,row);return;
    }
    switch (item.type) {
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
          box(-0.39, b, 0.78, 0.11, h, "#8da1af", "#edf4f7");
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
      case "wall":
        drawWall(wallEdge(x, y, item.rot));
        break;
      case "gate":
        box(-0.34, -0.12, 0.12, 0.24, 17, "#a8aaa5", "#dfddce");
        box(0.22, -0.12, 0.12, 0.24, 17, "#a8aaa5", "#dfddce");
        segment([-0.34, 0], [0.34, 0], 17, "#f9cc51", 5);
        break;
      case "concession":
      case "restroom": {
        const food = item.type === "concession";
        box(
          -0.32,
          -0.32,
          0.64,
          0.64,
          17,
          food ? "#c87a43" : "#56819b",
          food ? "#e8a957" : "#8fb4cb",
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
        if (food) segment([-0.32, -0.35], [0.32, -0.35], 12, "#fff0c9", 4);
        ctx.font = `${12 * z}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(food ? "🌭" : "🚻", p.x, p.y - 20 * z);
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
    polygon([a, b, up(b), up(a)], "#547e7d30", null);
    // Open mesh keeps the playing surface visible through the low foul fence.
    for (let i = 0; i < 4; i++) {
      const mix = t => ({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t});
      line(mix(i/4), up(mix((i+1)/4)), "#66888890", 0.45);
      line(up(mix(i/4)), mix((i+1)/4), "#66888890", 0.45);
    }
    line(a, up(a), "#405d65", 1.1);
    line(b, up(b), "#405d65", 1.1);
    line(up(a), up(b), panel.feet === 8 ? "#edc754" : "#b9ccd0", panel.feet === 8 ? 1.8 : 1);
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
  const stadiumBoundary = [[9,14],[18,5],[53,5],[53,29],[33,49],[9,49]];
  const siteTemplates = {
    smallStadium: {
      id:"small-stadium",name:"Small Stadium",roadLayout:"hashtag",
      roads:[{axis:"x",at:6},{axis:"x",at:56},{axis:"y",at:2},{axis:"y",at:52}],
      roadStart:-8,roadEnd:68,roadWidth:2,sidewalkWidth:1,fadeLength:6,
      arrivalIntersection:[6,2]
    }
  };
  const siteTemplate = siteTemplates.smallStadium;
  const streetBoundary = [[2,-2],[60,-2],[60,56],[2,56]];
  const mainGate = {a:[13,10],b:[14,9],intersection:siteTemplate.arrivalIntersection};
  const outerFence=[];
  stadiumBoundary.forEach((a,edge)=>{
    const b=stadiumBoundary[(edge+1)%stadiumBoundary.length],n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(let i=0;i<n;i++) {
      if(edge===0&&i===4) continue; // Main entry behind home plate.
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
    polygon([[7.3,4.7],[8.7,3.3],[15,9],[13,11]].map(p=>project(...p)),PAVEMENT,PAVEMENT_EDGE,0.8);
    for(let i=0;i<5;i++) {
      const x=6.7+i*0.24;
      line(project(x,2.9),project(x,3.9),"#f1eddb",2);
      const y=2.7+i*0.24;
      line(project(6.9,y),project(7.9,y),"#f1eddb",2);
    }
  }
  // Template landscaping stays outside the stadium fence and clear of the entry walk.
  const roadsideTrees = [];
  const addTree=(x,y)=>{
    if(x+y<28 && Math.abs(x-y-4)<3.5) return;
    roadsideTrees.push({x,y,variant:roadsideTrees.length%3});
  };
  for(let x=12;x<=50;x+=3.5) {addTree(x,4.7);addTree(x,49.3);}
  for(let y=8;y<=46;y+=3.5) {addTree(8.7,y);addTree(53.3,y);}
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
    const p=project(13.5,9.5);ctx.font=`bold ${9*zoom}px sans-serif`;ctx.textAlign="center";
    ctx.fillStyle="#fff0ba";ctx.fillText("MAIN GATE",p.x,p.y-h-5*zoom);
  }
  const entranceTile = "14,10";
  const GAME_SECONDS=120, TICKET_PRICE=5;
  let gateAdmissions=0, gateRevenue=0;
  let fans=[], fanActive=false, fanElapsed=0, fanPlanned=0, fanUnreachable=0, fanFrame=0, reachableCapacity=0, disconnectedSections=new Set();
  function fanStatus(message) { const e=document.getElementById("fanStatus");if(e.textContent!==message)e.textContent=message; }
  function insideStadium(x,y) {return x>=9&&x<53&&y>=5&&y<49&&x+y>=23&&x+y<=81;}
  function wallBlocks(a,b) {
    const [x,y]=a.split(",").map(Number), [nx,ny]=b.split(",").map(Number);
    const edge=nx>x?wallEdge(x,y,2):nx<x?wallEdge(x,y,6):ny>y?wallEdge(x,y,4):wallEdge(x,y,0);
    return !!edges[edge] || !!edges[a+":a"] || !!edges[a+":d"] || !!edges[b+":a"] || !!edges[b+":d"];
  }
  function solidBuildingAt(x,y) {
    // Reserve the whole occupied cell, including a small pedestrian clearance.
    for(const [k,v] of Object.entries(tiles)) {
      if(!["concession","restroom","bleacher"].includes(v.type)&&!isStand(v))continue;
      const [bx,by]=k.split(",").map(Number);
      if(x>bx-0.06&&x<bx+1.06&&y>by-0.06&&y<by+1.06)return true;
    }
    return false;
  }
  function approachRoute() {
    const gate={x:13.5,y:9.5},start={x:6.5,y:2.5},entry={x:14.5,y:10.5};
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
        for(const [dx,dy] of [[0.1,0],[-0.1,0],[0,0.1],[0,-0.1]]) {
          const q={x:Math.round((p.x+dx)*10)/10,y:Math.round((p.y+dy)*10)/10},k=keyP(q);
          if(parents.has(k)||q.x<5.5||q.y<1.5||q.x>15||q.y>11||Math.abs(q.x-q.y-4)>1.4)continue;
          if(beforeGate?q.x+q.y>23+1e-8:q.x+q.y<23-1e-8)continue;
          let blocked=false;
          for(let t=0;t<=8;t++)if(solidBuildingAt(p.x+dx*t/8,p.y+dy*t/8)){blocked=true;break;}
          const a=key(Math.floor(p.x),Math.floor(p.y)),b=key(Math.floor(q.x),Math.floor(q.y));
          if(blocked||(a!==b&&wallBlocks(a,b)))continue;
          parents.set(k,keyP(p));queue.push(q);
        }
      }
      return null;
    };
    const outside=search(start,gate,true),inside=search(gate,entry,false);
    return outside&&inside?[...outside,...inside.slice(1)]:null;
  }
  function reachableSeats() {
    if(solidBuildingAt(14.5,10.5))return [];
    const nodes=new Map(),links=new Map();
    const add=(id,p)=>{nodes.set(id,p);links.set(id,[]);};
    const join=(a,b)=>{if(nodes.has(a)&&nodes.has(b)){links.get(a).push(b);links.get(b).push(a);}};
    const ground=k=>"g:"+k,step=(k,n)=>`t:${k}:${n}`,rowId=(k,r)=>`r:${k}:${r}`,landing=(k,n)=>`l:${k}:${n}`;
    add(ground(entranceTile),{x:14.5,y:10.5,feet:0});
    for(const [k,item] of Object.entries(tiles)) {
      const [x,y]=k.split(",").map(Number);
      if(!insideStadium(x,y))continue;
      if(item.type==="path")add(ground(k),{x:x+0.5,y:y+0.5,feet:0});
      if(!isStand(item))continue;
      for(let r=0;r<4;r++)add(rowId(k,r),standPoint(x,y,item,stairCenter(item),-0.3125+r/4,item.baseFeet+(r+1)*1.25));
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
      if(item.type==="path"||k===entranceTile)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next=key(x+dx,y+dy);if(!wallBlocks(k,next))join(ground(k),ground(next));
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
            if(!wallBlocks(k,outside))join(ground(outside),landing(k,0));
          } else if(!wallBlocks(k,front))join(ground(front),step(k,-1));
        }
        if(matchingStand(x,y,item,0,1)&&hasStairs(tiles[back])&&stairCenter(item)===stairCenter(tiles[back]))join(step(k,8),step(back,-1));
      }
    }
    // The fixed gate landing is traversable even before a path is built on it.
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next=key(14+dx,10+dy);if(!wallBlocks(entranceTile,next))join(ground(entranceTile),ground(next));
    }
    const queue=[ground(entranceTile)],parents=new Map([[queue[0],null]]);
    for(let i=0;i<queue.length;i++)for(const next of links.get(queue[i])||[])if(!parents.has(next)){parents.set(next,queue[i]);queue.push(next);}
    const routeTo=id=>{const route=[];for(let at=id;at!==null;at=parents.get(at))route.unshift(nodes.get(at));return route;};
    const result=[];
    for(const [k,item] of Object.entries(tiles)) {
      if(!seatCapacity(item))continue;
      const [x,y]=k.split(",").map(Number),slots=[];
      let route;
      if(item.type==="bleacher") {
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const next=key(x+dx,y+dy),id=ground(next);
          if(insideStadium(x,y)&&parents.has(id)&&!wallBlocks(k,next)){route=routeTo(id);break;}
        }
        if(route)for(let n=0;n<24;n++)slots.push({seat:n,row:Math.floor(n/8),col:n%8,route});
      } else {
        const cols=item.type==="stand"?5:2;
        for(let r=0;r<4;r++)if(parents.has(rowId(k,r)))for(let col=0;col<cols;col++)slots.push({seat:r*cols+col,row:r,col,route:routeTo(rowId(k,r))});
      }
      if(slots.length)result.push({key:k,x,y,rot:item.rot,type:item.type,baseFeet:item.baseFeet||0,route:slots[0].route,capacity:slots.length,slots});
    }
    return result;
  }
  function endFanTest(message) {
    fanActive=false;fans=[];disconnectedSections.clear();fanFrame++;
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
    if(!sections.length) {draw();fanStatus("No reachable seats. Build walkways from the marked entrance to bleachers, or use Build demo route.");return;}
    fanPlanned=Math.min(25,reachableCapacity);fanElapsed=0;gateAdmissions=0;gateRevenue=0;fans=[];
    const assigned=new Map(sections.map(section=>[section.key,0]));
    for(let i=0;i<fanPlanned;i++) {
      const available=sections.filter(section=>assigned.get(section.key)<section.capacity);
      const section=available[i%available.length],ordinal=assigned.get(section.key);
      assigned.set(section.key,ordinal+1);
      const order=section.type==="bleacher"?[0,23,7,16,3,20,11,12,5,18,9,14,1,22,6,17,4,19,10,13,2,21,8,15]:section.type==="stand"?[0,19,4,15,7,12,2,17,9,10,5,14,1,18,6,13,3,16,8,11]:[0,7,1,6,2,5,3,4];
      const slot=order.map(n=>section.slots.find(s=>s.seat===n)).filter(Boolean)[ordinal];
      const {seat,row,col}=slot;
      let target;
      if(section.type==="bleacher") {
        const d=directions[section.rot],len=Math.hypot(...d),ux=d[0]/len,uy=d[1]/len;
        const a=-0.34+col*0.097,b=-0.28+row*0.22;
        target={x:section.x+0.5+ux*a-uy*b,y:section.y+0.5+uy*a+ux*b,feet:0};
      } else target=standPoint(section.x,section.y,section,section.type==="stand"?-0.4+col*0.2:(col?0.4:-0.4),-0.3125+row/4,section.baseFeet+(row+1)*1.25);
      const route=[...arrival,...slot.route.slice(1),target];
      fans.push({route,index:0,x:route[0].x,y:route[0].y,feet:0,standSeat:section.type!=="bleacher",start:i*0.35,seated:false,paid:false,gateIndex:arrival.findIndex(p=>p.x===13.5&&p.y===9.5),row,sectionKey:section.key,seat,color:["#df5853","#f4cc5c","#5c90d3","#eee9d4"][i%4]});
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
  function advanceFans(dt) {
    if(!fanActive||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,GAME_SECONDS-fanElapsed);
    const previousElapsed=fanElapsed;fanElapsed+=dt;
    let collected=0;
    for(const fan of fans) {
      if(fanElapsed<fan.start||fan.seated)continue;
      let distance=Math.max(0,fanElapsed-Math.max(previousElapsed,fan.start))*2.8;
      while(distance>0&&!fan.seated) {
        const next=fan.route[fan.index+1];
        if(!next) {fan.seated=true;break;}
        const dx=next.x-fan.x,dy=next.y-fan.y,dh=(next.feet||0)-fan.feet,length=Math.hypot(dx,dy,dh/10);
        if(length<=distance) {fan.x=next.x;fan.y=next.y;fan.feet=next.feet||0;fan.index++;distance-=length;
          if(!fan.paid&&fan.index>=fan.gateIndex) {fan.paid=true;gateAdmissions++;gateRevenue+=TICKET_PRICE;collected+=TICKET_PRICE;}}
        else {fan.x+=dx/length*distance;fan.y+=dy/length*distance;fan.feet+=dh/length*distance;distance=0;}
      }
    }
    if(collected) {
      money+=collected;
      // Construction undo must preserve admission income earned afterward.
      for(const snapshot of history)snapshot.money+=collected;
      store();update();
    }
    if(fanElapsed>=GAME_SECONDS) {
      endFanTest(`Game complete! 2:00 played · ${gateAdmissions} admissions · $${gateRevenue} gate revenue. Ready to build or open gates for another game.`);return;
    }
    const remaining=Math.ceil(GAME_SECONDS-fanElapsed),clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;
    const seated=fans.filter(f=>f.seated).length,arrived=fans.filter(f=>fanElapsed>=f.start).length;
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
    history.push({tiles:{...tiles},edges:{...edges},money});
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
    history.push({tiles:{...tiles},edges:{...edges},money});
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
    history.push({tiles:{...tiles},edges:{...edges},money});
    for(const [k,v] of additions)tiles[k]=v;
    money-=cost;store();update();draw();
    fanStatus(`Side-entry demo ready ($${cost.toLocaleString()}). 80 seats, two end stairs, no front-row sidewalk. Open gates to watch fans enter from the side.`);
  }
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
    pitch();
    diamond(14.5,10.5,PAVEMENT,PAVEMENT_EDGE);
    // Pavement belongs to the ground pass, below every person and structure.
    for(const [k,v] of Object.entries(tiles)) if(v.type==="path") {
      const [x,y]=k.split(",").map(Number);drawObject(x,y,v);
    }
    let all = Object.entries(tiles)
      .filter(([,v])=>v.type!=="path")
      .flatMap(([k, v]) => {
        const [x,y]=k.split(",").map(Number);
        return isStand(v)?[0,1,2,3].map(row=>{const p=standPoint(x,y,v,0,-0.3125+row/4);return {x:p.x-0.5,y:p.y-0.5,v,standRow:row,originX:x,originY:y};}):[{x,y,v}];
      })
      .concat(Object.keys(edges).map(edge => {
        const p = edgePanel(edge);
        return {x:(p.a[0]+p.b[0])/2-0.5, y:(p.a[1]+p.b[1])/2-0.5, edge};
      }))
      .concat(defensivePlayers.map(player=>({x:player.x-0.5,y:player.y-0.5,player})))
      .concat(dugouts.map(dugout=>({x:dugout.x+(dugout.swap?dugout.width:dugout.length)/2-0.5,y:dugout.y+(dugout.swap?dugout.length:dugout.width)/2-0.5,dugout})))
      .concat(fans.filter(f=>fanElapsed>=f.start).map(fan=>({x:fan.x-0.5,y:fan.y-0.5,fan})))
      .concat(roadsideTrees.map(tree=>({x:tree.x-0.5,y:tree.y-0.5,tree})))
      .concat(outerFence.map(panel=>({x:(panel.a[0]+panel.b[0])/2-0.5,y:(panel.a[1]+panel.b[1])/2-0.5,panel})))
      .concat([{x:13,y:9,mainEntry:true}])
      .concat(fieldFence.map(panel => ({x:(panel.a[0]+panel.b[0])/2-0.5, y:(panel.a[1]+panel.b[1])/2-0.5, panel})))
      .sort((a, b) => {
        let aa = rotated(a.x, a.y),
          bb = rotated(b.x, b.y);
        const depth=aa.x+aa.y-(bb.x+bb.y);
        return Math.abs(depth)>1e-8?depth:(a.fan?1:0)-(b.fan?1:0);
      });
    for (let e of all) {
      if(e.standRow!==undefined)drawStandRow(e.originX,e.originY,e.v,e.standRow);
      else if(e.player)drawDefender(e.player);
      else if(e.fan)drawFan(e.fan);
      else if (e.tree) drawRoadsideTree(e.tree);
      else if (e.mainEntry) drawMainGate();
      else if (e.dugout) drawDugout(e.dugout);
      else if (e.edge) drawWall(e.edge);
      else if (e.panel) drawFieldFence(e.panel);
      else drawObject(e.x, e.y, e.v);
    }
    const help=document.getElementById("standHelp");
    help.hidden=!isStand({type:tool});
    if(!help.hidden) {
      const snap=hover?standPlacement(hover.x,hover.y,rot):{baseFeet:0};
      help.textContent=snap.error||(isEndStair({type:tool})?`End stairs · no seats · 5 ft stairs + 5 ft level landing · +5 ft rise. Base: ${snap.baseFeet} ft. Green arrow marks the side walkway entrance. R rotates 90°; choose the other end piece to mirror.`:`${tool==="stand"?"20 seats · 5 per row":"8 seats · 6 ft central stairs"} · 4 rows · 10 × 10 ft · +5 ft rise. Base: ${snap.baseFeet} ft. Match facing; build behind to rise. Connect a path to the front of a stair section.`);
    }
    if (hover && hover.x >= 0 && hover.x < W && hover.y >= 0 && hover.y < H) {
      const edge = wallEdge(hover.x, hover.y);
      const standSnap=isStand({type:tool})?standPlacement(hover.x,hover.y,rot):null;
      const occupied = tool === "wall" ? edges[edge] || !edgeAllowed(edge) || (/[ad]$/.test(edge) && tiles[key(hover.x,hover.y)])
        : standSnap?.error || blockedTile(key(hover.x, hover.y)) || tiles[key(hover.x, hover.y)] || edges[key(hover.x,hover.y)+":a"] || edges[key(hover.x,hover.y)+":d"];
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
      if (tool !== "erase" && !occupied) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        drawObject(hover.x, hover.y, { type: tool, rot,baseFeet:standSnap?.baseFeet||0 });
        ctx.restore();
      }
    }
  }
  function update() {
    document.getElementById("money").textContent = "$" + money.toLocaleString();
    document.getElementById("seats").textContent =
      Object.values(tiles).reduce((sum,item)=>sum+seatCapacity(item),0);
    document.getElementById("placed").textContent = Object.keys(tiles).length + Object.keys(edges).length;
    document.getElementById("rotation").textContent = tool === "wall" ? ({0:"Top edge",2:"Right edge",4:"Bottom edge",6:"Left edge",1:"Diagonal /",5:"Diagonal \\"})[rot] : rot * 45 + "°";
    document.getElementById("rotate").textContent = tool === "wall" ? "↻ Wall edge (R)" : isStand({type:tool})?"↻ Section 90° (R)":"↻ Item 45° (R)";
    document.getElementById("mobileRotate").textContent = tool === "wall" ? "↻ Wall edge" : isStand({type:tool})?"↻ Section 90°":"↻ Item 45°";
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
        JSON.stringify({ version: 2, fieldRevision: 6, tiles, edges, money }),
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
    const k = key(hover.x, hover.y);
    if (hover.x < 0 || hover.x >= W || hover.y < 0 || hover.y >= H) return;
    const edge = wallEdge(hover.x, hover.y);
    if (tool === "wall") {
      if (edges[edge]) { toast("This edge already has a wall"); return; }
      if (!edgeAllowed(edge)) { toast("Keep the playing field clear!"); return; }
      if (/[ad]$/.test(edge) && tiles[k]) { toast("Diagonal crosses an occupied tile"); return; }
      if (money < prices.wall) { toast("Not enough money"); return; }
      history.push({tiles:{...tiles}, edges:{...edges}, money});
      edges[edge] = {type:"wall"};
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
      history.push({tiles:{...tiles}, edges:{...edges}, money});
      if (removeEdge) { delete edges[chosen]; money += Math.round(prices.wall*0.7); }
      else { money += Math.round(prices[tiles[k].type]*0.7); delete tiles[k]; }
    } else {
      if (blockedTile(k)) { toast("Keep the playing field clear!"); return; }
      if (tiles[k] || edges[k+":a"] || edges[k+":d"]) { toast("Tile is already occupied"); return; }
      if (money < prices[tool]) { toast("Not enough money"); return; }
      const snap=isStand({type:tool})?standPlacement(hover.x,hover.y,rot):null;
      if(snap?.error) {toast(snap.error);return;}
      history.push({tiles:{...tiles}, edges:{...edges}, money});
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
    if(isStand({type:t})) {rot=rot-rot%2;toast(isEndStair({type:t})?"Green arrow = side walkway entrance. Match the stand facing; use the other end piece to mirror.":"Sections snap at 90°. Place stairs in the same direction; connect a path at their front.");}
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
  document.getElementById("rotate").onclick = rotationStep;
  document.getElementById("undo").onclick = () => {
    if(fanActive)endFanTest("Layout changed; fan test ended.");
    let h = history.pop();
    if (h) {
      tiles = h.tiles;
      edges = h.edges;
      money = h.money;
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
      money = 100000;
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
    const migrateField = (saved.version === 1 || saved.version === 2) && (!saved.fieldRevision || saved.fieldRevision < 6);
    if (saved.edges !== undefined && (!saved.edges || typeof saved.edges !== "object" || Array.isArray(saved.edges))) throw Error("Invalid walls");
    for (const [edge,v] of Object.entries(saved.edges || {})) {
      if (!/^\d+,\d+:[hvad]$/.test(edge) || !v || v.type !== "wall") throw Error("Invalid wall edge");
      if (!edgeAllowed(edge)) {
        const panel=edgePanel(edge);
        if(migrateField && [...panel.a,...panel.b].every(v=>v>=0&&v<=60)) {cash+=prices.wall;continue;}
        throw Error("Invalid wall edge");
      }
      cleanEdges[edge] = {type:"wall"};
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
        else cleanEdges[edge] = {type:"wall"};
      } else {
        if(isStand(v)&&(!Number.isInteger(v.baseFeet)||v.baseFeet<0||v.baseFeet>300||v.baseFeet%5!==0||v.rot%2!==0))throw Error("Invalid stand height or facing");
        clean[k]={type:v.type,rot:v.rot,...(isStand(v)?{baseFeet:v.baseFeet}:{})};
      }
    }
    for (const k of Object.keys(clean))
      if (cleanEdges[k+":a"] || cleanEdges[k+":d"]) throw Error("Diagonal crosses an occupied tile");
    return { tiles: clean, edges: cleanEdges, money: cash };
  }
  document.getElementById("export").onclick = () => {
    const blob = new Blob(
        [JSON.stringify({ version: 2, fieldRevision: 6, tiles, edges, money }, null, 2)],
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
        history.push({ tiles: { ...tiles }, edges: { ...edges }, money });
        if(fanActive)endFanTest("Park imported; fan test ended.");
        tiles = park.tiles;
        edges = park.edges;
        money = park.money;
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
      store();
    }
  } catch (e) {
    toast("Saved park could not be loaded. Import a backup if available.");
  }
  update();
  resize();
})();
