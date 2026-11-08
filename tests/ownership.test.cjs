const test=require("node:test");
const assert=require("node:assert/strict");
const o=require("../public/ownership.js");
test("scenario starts after startup expenses with 250k",()=>{const s=o.newCampaign();assert.equal(s.cash,250000);assert.equal(s.season.length,100);assert.equal(s.season.filter(g=>g.home).length,50);});
test("upgrades charge once and affect stadium",()=>{let s=o.newCampaign();s=o.upgrade(s,"bleachers");assert.equal(s.cash,228000);assert.ok(s.fanRating>45);assert.throws(()=>o.upgrade(s,"bleachers"));});
test("home gate and concessions accrue, road game costs money",()=>{let s=o.newCampaign();s=o.game(s,0.5);assert.ok(s.history[0].gate>0);assert.ok(s.history[0].attendance<=900);s=o.game(s,0.5);assert.equal(s.history[1].gate,0);assert.equal(s.history[1].profit,-1850);});
test("100 games finish without changing input",()=>{const original=o.newCampaign();const end=o.advance(original,100,()=>0.5);assert.equal(original.gameIndex,0);assert.equal(end.gameIndex,100);assert.equal(end.history.length,100);assert.equal(end.status,"complete");assert.throws(()=>o.game(end));});
test("ticket controls reject unrealistic values",()=>{assert.throws(()=>o.setTicketPrice(o.newCampaign(),0));assert.equal(o.setTicketPrice(o.newCampaign(),12).ticketPrice,12);});
