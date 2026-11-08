const test=require("node:test");
const assert=require("node:assert/strict");
const o=require("../public/ownership.js");
test("scenario starts after startup expenses with 250k",()=>{const s=o.newCampaign();assert.equal(s.cash,250000);assert.equal(s.season.length,100);assert.equal(s.season.filter(g=>g.home).length,50);});
test("upgrades charge once and affect stadium",()=>{let s=o.newCampaign();s=o.upgrade(s,"restroom");assert.equal(s.cash,232000);assert.equal(s.fanRating,45);assert.equal(s.projects[0].status,"building");assert.throws(()=>o.upgrade(s,"restroom"));});
test("home gate and concessions accrue, road game costs money",()=>{let s=o.newCampaign();s=o.game(s,0.5);assert.ok(s.history[0].gate>0);assert.ok(s.history[0].attendance<=900);s=o.game(s,0.5);assert.equal(s.history[1].gate,0);assert.equal(s.history[1].profit,-1850);});
test("100 games finish without changing input",()=>{const original=o.newCampaign();const end=o.advance(original,100,()=>0.5);assert.equal(original.gameIndex,0);assert.equal(end.gameIndex,100);assert.equal(end.history.length,100);assert.equal(end.status,"offseason");assert.throws(()=>o.game(end));});
test("ticket controls reject unrealistic values",()=>{assert.throws(()=>o.setTicketPrice(o.newCampaign(),0));assert.equal(o.setTicketPrice(o.newCampaign(),12).ticketPrice,12);});

test("minor construction is delayed and finishes after days pass",()=>{let s=o.upgrade(o.newCampaign(),"restroom");assert.equal(s.upgrades.length,0);s=o.advanceDays(s,2);assert.equal(s.upgrades.length,0);s=o.advanceDays(s,1);assert.deepEqual(s.upgrades,["restroom"]);assert.equal(s.fanRating,52);});
test("major construction requires offseason",()=>{let s=o.newCampaign();assert.throws(()=>o.upgrade(s,"bleachers"),/offseason/);s=o.advance(s,100,()=>0.5);assert.equal(s.status,"offseason");s=o.upgrade(s,"bleachers");assert.equal(s.upgrades.length,0);s=o.advanceDays(s,35);assert.deepEqual(s.upgrades,["bleachers"]);s=o.nextSeason(s);assert.equal(s.gameIndex,0);assert.equal(s.upgrades.length,1);});
test("prices and staffing can change at any time",()=>{let s=o.newCampaign();s=o.setConcessionPrice(s,8);s=o.setStaffCount(s,10);s=o.game(s,0.5);assert.equal(s.history[0].expense,4150);assert.ok(s.history[0].concessions>0);assert.equal(s.concessionPrice,8);assert.throws(()=>o.setStaffCount(s,1));});

test("multi-season projects persist without double-applying",()=>{let s=o.advance(o.newCampaign(),100,()=>0.5);s=o.upgrade(s,"lighting");s=o.advanceDays(s,45);assert.equal(s.upgrades.filter(x=>x==="lighting").length,1);const rating=s.fanRating;s=o.advanceDays(s,20);assert.equal(s.fanRating,rating);s=o.nextSeason(s);assert.equal(s.upgrades.filter(x=>x==="lighting").length,1);});
