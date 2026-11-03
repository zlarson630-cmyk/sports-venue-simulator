const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {game}=require('./helpers/game.cjs');
const park=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/two-level-wedge-v038.json',`file://${__filename}`),'utf8'));

test('cached world preserves occlusion and refreshes after camera, paint, construction, undo and resize',()=>{
 const g=game(park(),()=>0.5,{cacheCanvas:true});g.select('inspectFan');g.api.draw();
 const before=g.api.renderStats(),fan={x:18,y:14,feet:0,standSeat:true},cuts=JSON.stringify(g.api.occlusionCuts(fan));
 g.api.draw();assert.equal(g.api.renderStats().worldBuilds,before.worldBuilds);assert.ok(g.api.renderStats().worldReuses>before.worldReuses);
 assert.ok(g.commands.some(c=>c[0]==='drawImage'));assert.equal(JSON.stringify(g.api.occlusionCuts(fan)),cuts);
 let builds=g.api.renderStats().worldBuilds;
 for(let i=0;i<4;i++){g.key('q');assert.ok(g.api.renderStats().worldBuilds>builds);builds=g.api.renderStats().worldBuilds;g.api.draw();assert.equal(g.api.renderStats().worldBuilds,builds);}
 g.element('teamprimary').onchange({target:{value:'#112233'}});assert.ok(g.api.renderStats().worldBuilds>builds);builds=g.api.renderStats().worldBuilds;
 g.select('path');g.clickTile(11,4);assert.equal(g.api.state().tiles['11,4'].type,'path');assert.ok(g.api.renderStats().worldBuilds>builds);builds=g.api.renderStats().worldBuilds;
 g.element('undo').click();assert.ok(!g.api.state().tiles['11,4']);assert.ok(g.api.renderStats().worldBuilds>builds);builds=g.api.renderStats().worldBuilds;
 g.element('game').width+=20;g.api.draw();assert.ok(g.api.renderStats().worldBuilds>builds);
});

test('money collection and fan motion reuse the world; game end refreshes build markings',()=>{
 const g=game(park(),()=>0.5,{cacheCanvas:true});g.select('inspectFan');g.api.startFanTest();g.api.draw();
 const before=g.api.renderStats().worldBuilds,money=g.api.state().money;
 for(let i=0;i<10;i++){g.api.advanceFans(3);g.api.draw();}
 assert.ok(g.api.state().money>money);assert.equal(g.api.renderStats().worldBuilds,before);
 assert.ok(g.api.renderStats().worldReuses>=10);
 g.element('stopFans').click();assert.ok(g.api.renderStats().worldBuilds>before);
});

test('rendering still works when an offscreen canvas is unavailable',()=>{
 const g=game(park());g.select('inspectFan');const before=g.api.renderStats().worldBuilds;
 g.api.draw();assert.equal(g.api.renderStats().worldBuilds,before+1);assert.ok(g.commands.some(c=>c[0]==='fillRect'));
});

test('pointer bursts draw once per frame and share the active game animation loop',()=>{
 const g=game(park(),()=>0.5,{cacheCanvas:true,animationFrames:true});g.select('inspectFan');
 const before=g.api.renderStats(),move=g.element('game').listeners.pointermove;
 for(let i=0;i<20;i++)move({clientX:500+i,clientY:300});
 assert.equal(g.frames.length,1);assert.equal(g.api.renderStats().worldReuses,before.worldReuses);
 g.flushFrame();assert.equal(g.api.renderStats().worldReuses,before.worldReuses+1);
 g.api.startFanTest();assert.equal(g.frames.length,1);
 for(let i=0;i<20;i++)move({clientX:500+i,clientY:300});
 assert.equal(g.frames.length,1);g.flushFrame(1000);assert.equal(g.frames.length,1);
 g.element('stopFans').click();g.flushFrame(1017);assert.equal(g.frames.length,0);
});
