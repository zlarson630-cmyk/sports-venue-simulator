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
    history = [];
  const field = new Set();
  function mark(x, y) {
    if (x >= 0 && y >= 0 && x < W && y < H) field.add(x + "," + y);
  } // Playable field core, visually oriented on the isometric lattice: foul-lines follow grid axes.
  for (let x = 18; x <= 38; x++)
    for (let y = 14; y <= 34; y++) {
      let a = x - 18,
        b = y - 14;
      if (a + b <= 24 && x >= 18 && y >= 14) mark(x, y);
    }
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
    const c = project(24, 20);
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
      case "wall": {
        const a = project(x + 0.5 - d[0] * 0.5, y + 0.5 - d[1] * 0.5),
          b = project(x + 0.5 + d[0] * 0.5, y + 0.5 + d[1] * 0.5);
        polygon(
          [a, b, { x: b.x, y: b.y - 12 * z }, { x: a.x, y: a.y - 12 * z }],
          "#ac744d",
          "#563b35",
          1,
        );
        line(
          { x: a.x, y: a.y - 12 * z },
          { x: b.x, y: b.y - 12 * z },
          "#e0a15c",
          3,
        );
        break;
      }
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
    // diamond shaped baseball surface located in the fixed no-build area
    for (let x = 18; x <= 38; x++)
      for (let y = 14; y <= 34; y++)
        if (field.has(key(x, y)))
          diamond(
            x + 0.5,
            y + 0.5,
            (x + y) % 2 ? "#76ab67" : "#7fb571",
            "#70a363",
          );
    const home = project(18.7, 14.7),
      first = project(29.5, 14.7),
      second = project(29.5, 25.5),
      third = project(18.7, 25.5);
    polygon([home, first, second, third], "#ca9463", "#e8bc8d", 2);
    const inner = [
      project(20.5, 16.5),
      project(27.5, 16.5),
      project(27.5, 23.5),
      project(20.5, 23.5),
    ];
    polygon(inner, "#74b166", "#8dba72", 1);
    [home, first, second, third].forEach((p) =>
      polygon(
        [
          { x: p.x, y: p.y - 3 * zoom },
          { x: p.x + 3 * zoom, y: p.y },
          { x: p.x, y: p.y + 3 * zoom },
          { x: p.x - 3 * zoom, y: p.y },
        ],
        "#fff7e3",
        null,
      ),
    );
    const mound = project(24, 20);
    ctx.beginPath();
    ctx.ellipse(mound.x, mound.y, 8 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#d9ab7b";
    ctx.fill();
    line(home, project(40, 14.7), "#ffffff", 1.5);
    line(home, project(18.7, 37), "#ffffff", 1.5);
  }
  const fenceCorners = [[18, 14], [39, 14], [39, 18], [22, 35], [18, 35]];
  const fieldFence = [];
  fenceCorners.forEach((a, edge) => {
    const b = fenceCorners[(edge + 1) % fenceCorners.length];
    const count = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let i = 0; i < count; i++) {
      const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      fieldFence.push({ a: at(i / count), b: at((i + 1) / count), feet: edge === 0 || edge === 4 ? 3 : 8 });
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
    pitch();
    let all = Object.entries(tiles)
      .map(([k, v]) => {
        const [x, y] = k.split(",").map(Number);
        return { x, y, v };
      })
      .concat(fieldFence.map(panel => ({x:(panel.a[0]+panel.b[0])/2-0.5, y:(panel.a[1]+panel.b[1])/2-0.5, panel})))
      .sort((a, b) => {
        let aa = rotated(a.x, a.y),
          bb = rotated(b.x, b.y);
        return aa.x + aa.y - (bb.x + bb.y);
      });
    for (let e of all) {
      if (e.panel) drawFieldFence(e.panel);
      else drawObject(e.x, e.y, e.v);
    }
    if (hover && hover.x >= 0 && hover.x < W && hover.y >= 0 && hover.y < H) {
      const occupied =
        field.has(key(hover.x, hover.y)) || tiles[key(hover.x, hover.y)];
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
    document.getElementById("placed").textContent = Object.keys(tiles).length;
    document.getElementById("rotation").textContent = rot * 45 + "°";
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
        JSON.stringify({ version: 1, tiles, money }),
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
    if (tool === "erase") {
      if (!tiles[k]) return;
      history.push({ tiles: { ...tiles }, money });
      money += Math.round(prices[tiles[k].type] * 0.7);
      delete tiles[k];
    } else {
      if (field.has(k)) {
        toast("Keep the playing field clear!");
        return;
      }
      if (tiles[k]) {
        toast("Tile is already occupied");
        return;
      }
      if (money < prices[tool]) {
        toast("Not enough money");
        return;
      }
      history.push({ tiles: { ...tiles }, money });
      money -= prices[tool];
      tiles[k] = { type: tool, rot };
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
      panX = w * 0.5 - (((24 - 20) * TW) / 2) * zoom;
      panY = h * 0.47 - (((24 + 20) * TH) / 2) * zoom;
      cameraInit = true;
    }
    draw();
  }
  new ResizeObserver(resize).observe(wrap);
  function select(t) {
    tool = t;
    if (t === "bleacher") toast("Gold arrow = fans face this way. R rotates before placement.");
    document
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("sel", b.dataset.tool === t));
  }
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => (b.onclick = () => select(b.dataset.tool)));
  document.getElementById("rotate").onclick = () => {
    rot = (rot + 1) % 8;
    update();
    draw();
  };
  document.getElementById("undo").onclick = () => {
    let h = history.pop();
    if (h) {
      tiles = h.tiles;
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
      rot = (rot + 1) % 8;
      update();
      draw();
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
    const clean = {};
    for (const [k, v] of Object.entries(saved.tiles)) {
      if (!/^\d+,\d+$/.test(k)) throw Error("Invalid tile");
      const [x, y] = k.split(",").map(Number);
      if (
        x >= W ||
        y >= H ||
        field.has(k) ||
        !v ||
        !Object.hasOwn(prices, v.type) ||
        !Number.isInteger(v.rot) ||
        v.rot < 0 ||
        v.rot > 7
      )
        throw Error("Invalid construction");
      clean[k] = { type: v.type, rot: v.rot };
    }
    return { tiles: clean, money: saved.money };
  }
  document.getElementById("export").onclick = () => {
    const blob = new Blob(
        [JSON.stringify({ version: 1, tiles, money }, null, 2)],
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
        history.push({ tiles: { ...tiles }, money });
        tiles = park.tiles;
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
      money = saved.money;
    }
  } catch (e) {
    toast("Saved park could not be loaded. Import a backup if available.");
  }
  update();
  resize();
})();
