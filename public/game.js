(() => {
  "use strict";
  const W = 60,
    H = 60,
    TW = 38,
    TH = 19,
    prices = {
      path: 100,
      bleacher: 1500,
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
  for(let x=22;x<25;x++) for(let y=8;y<10;y++) dugoutTiles.add(`${x},${y}`);
  for(let x=12;x<14;x++) for(let y=18;y<21;y++) dugoutTiles.add(`${x},${y}`);
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
    rot = tool === "wall" ? wallSlots[(wallSlots.indexOf(rot) + 1) % wallSlots.length] : (rot + 1) % 8;
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
    switch (item.type) {
      case "path":
        diamond(x + 0.5, y + 0.5, "#c8c6b9", "#e5e3d6");
        break;
      case "bleacher": {
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
    {side:"First base",x:22,y:8,length:3,width:1.5,depthFeet:3,swap:false},
    {side:"Third base",x:12,y:18,length:3,width:1.5,depthFeet:3,swap:true}
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
    for(const [a,b,c,e] of [[0,0,3,0],[0,0,0,1.5],[3,0,3,1.5]])
      polygon([at(a,b),at(c,e),at(c,e,-depth),at(a,b,-depth)],"#465558","#87908c",0.6);
    // Long wooden bench along the back, below the surrounding grass level.
    shape(0.2,0.18,2.8,0.48,-depth+2,"#c79b60");
    line(at(0.15,0,3),at(2.85,0,3),"#9eafb2",2);
    for(const a of [0.15,1.5,2.85]) line(at(a,0),at(a,0,3),"#677c83",1);
    // Three steps at the field-side opening climb from the recessed floor to grade.
    for(let step=0;step<3;step++)
      shape(2.35,0.65+step*0.35,2.95,1+step*0.35,-depth+(step+1)*depth/3,"#b7b5a4");
    shape(2.35,1.7,2.95,2.15,0,"#b7b5a4");
    const p=at(1.5,0,7);
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
    polygon([[7.3,4.7],[8.7,3.3],[15,9],[13,11]].map(p=>project(...p)),"#dedbc9","#aaa99c",0.8);
    for(let i=0;i<5;i++) {
      const x=6.7+i*0.24;
      line(project(x,2.9),project(x,3.9),"#f1eddb",2);
      const y=2.7+i*0.24;
      line(project(6.9,y),project(7.9,y),"#f1eddb",2);
    }
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
    let all = Object.entries(tiles)
      .map(([k, v]) => {
        const [x, y] = k.split(",").map(Number);
        return { x, y, v };
      })
      .concat(Object.keys(edges).map(edge => {
        const p = edgePanel(edge);
        return {x:(p.a[0]+p.b[0])/2-0.5, y:(p.a[1]+p.b[1])/2-0.5, edge};
      }))
      .concat(dugouts.map(dugout=>({x:dugout.x+(dugout.swap?dugout.width:dugout.length)/2-0.5,y:dugout.y+(dugout.swap?dugout.length:dugout.width)/2-0.5,dugout})))
      .concat(outerFence.map(panel=>({x:(panel.a[0]+panel.b[0])/2-0.5,y:(panel.a[1]+panel.b[1])/2-0.5,panel})))
      .concat([{x:13,y:9,mainEntry:true}])
      .concat(fieldFence.map(panel => ({x:(panel.a[0]+panel.b[0])/2-0.5, y:(panel.a[1]+panel.b[1])/2-0.5, panel})))
      .sort((a, b) => {
        let aa = rotated(a.x, a.y),
          bb = rotated(b.x, b.y);
        return aa.x + aa.y - (bb.x + bb.y);
      });
    for (let e of all) {
      if (e.mainEntry) drawMainGate();
      else if (e.dugout) drawDugout(e.dugout);
      else if (e.edge) drawWall(e.edge);
      else if (e.panel) drawFieldFence(e.panel);
      else drawObject(e.x, e.y, e.v);
    }
    if (hover && hover.x >= 0 && hover.x < W && hover.y >= 0 && hover.y < H) {
      const edge = wallEdge(hover.x, hover.y);
      const occupied = tool === "wall" ? edges[edge] || !edgeAllowed(edge) || (/[ad]$/.test(edge) && tiles[key(hover.x,hover.y)])
        : blockedTile(key(hover.x, hover.y)) || tiles[key(hover.x, hover.y)] || edges[key(hover.x,hover.y)+":a"] || edges[key(hover.x,hover.y)+":d"];
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
        drawObject(hover.x, hover.y, { type: tool, rot });
        ctx.restore();
      }
    }
  }
  function update() {
    document.getElementById("money").textContent = "$" + money.toLocaleString();
    document.getElementById("seats").textContent =
      Object.values(tiles).filter((x) => x.type === "bleacher").length * 24;
    document.getElementById("placed").textContent = Object.keys(tiles).length + Object.keys(edges).length;
    document.getElementById("rotation").textContent = tool === "wall" ? ({0:"Top edge",2:"Right edge",4:"Bottom edge",6:"Left edge",1:"Diagonal /",5:"Diagonal \\"})[rot] : rot * 45 + "°";
    document.getElementById("rotate").textContent = tool === "wall" ? "↻ Wall edge (R)" : "↻ Item 45° (R)";
    document.getElementById("mobileRotate").textContent = tool === "wall" ? "↻ Wall edge" : "↻ Item 45°";
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
        JSON.stringify({ version: 2, fieldRevision: 4, tiles, edges, money }),
      );
      return true;
    } catch (e) {
      toast("Browser storage unavailable. Export a park backup.");
      return false;
    }
  }
  function action() {
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
      history.push({tiles:{...tiles}, edges:{...edges}, money});
      money -= prices[tool];
      tiles[k] = {type:tool, rot};
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
      saved.money > 100000
    )
      throw Error("Invalid park file");
    const clean = {}, cleanEdges = {};
    let cash = saved.money;
    const migrateField = (saved.version === 1 || saved.version === 2) && (!saved.fieldRevision || saved.fieldRevision < 4);
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
      } else clean[k] = { type: v.type, rot: v.rot };
    }
    for (const k of Object.keys(clean))
      if (cleanEdges[k+":a"] || cleanEdges[k+":d"]) throw Error("Diagonal crosses an occupied tile");
    return { tiles: clean, edges: cleanEdges, money: Math.min(100000,cash) };
  }
  document.getElementById("export").onclick = () => {
    const blob = new Blob(
        [JSON.stringify({ version: 2, fieldRevision: 4, tiles, edges, money }, null, 2)],
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
