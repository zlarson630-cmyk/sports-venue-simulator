// Headless JS cost, not browser FPS: native canvas rasterization is excluded.
const {game}=require('../tests/helpers/game.cjs');
const fs=require('node:fs');
const path=require('node:path');
const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../tests/fixtures/two-level-wedge-v038.json'),'utf8'));
saved.gameMinutes=2;saved.requestedFans=100;
let seed=41;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const g=game(saved,random,{cacheCanvas:true,record:false,sourceText:process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):undefined});
g.select('inspectFan');g.api.startFanTest();
const measure=(fn,n)=>{const samples=[];for(let i=0;i<n;i++){const t=performance.now();fn();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);return Number(samples[Math.floor(n/2)].toFixed(3));};
const movingMs=measure(()=>g.api.advanceFans(0.1),10);
const drawMovingMs=measure(()=>g.api.draw(),20);
g.api.advanceFans(40);
const seatedMs=measure(()=>g.api.advanceFans(0.1),10);
const drawSeatedMs=measure(()=>g.api.draw(),20);
const zoomMs=measure(()=>g.api.benchmarkZoom(),5);
console.log(JSON.stringify({fans:g.api.fanState().fans.length,movingSimulationMsPer100ms:movingMs,seatedSimulationMsPer100ms:seatedMs,movingDrawMedianMs:drawMovingMs,seatedDrawMedianMs:drawSeatedMs,zoomDrawMedianMs:zoomMs,renderCache:g.api.renderStats()},null,2));
