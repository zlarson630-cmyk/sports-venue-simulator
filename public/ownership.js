/* Scenario 1 ownership economy: deterministic, framework-independent and safe to integrate with existing sandbox. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.VenueOwnership=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const SEASON_GAMES=100;
const STARTING_CASH=250000;
const UPGRADES=Object.freeze({
  restroom:{name:"Reopen restrooms",cost:18000,comfort:7,capacity:0,concession:0},
  concession:{name:"Restore concession stand",cost:28000,comfort:3,capacity:0,concession:0.14},
  bleachers:{name:"Repair aluminum bleachers",cost:22000,comfort:2,capacity:250,concession:0},
  seats:{name:"Install reserved chairback seats",cost:55000,comfort:9,capacity:-50,concession:0},
  lighting:{name:"Refurbish stadium lighting",cost:40000,comfort:5,capacity:0,concession:0},
  signage:{name:"Refresh ballpark signage",cost:12000,comfort:4,capacity:0,concession:0}
});
function clamp(x,min,max){return Math.max(min,Math.min(max,x));}
function money(n){return Math.round(n*100)/100;}
function makeSeason(){return Array.from({length:SEASON_GAMES},(_,i)=>({number:i+1,home:i%2===0,opponent:i%2===0?"River City Rivals":"Association Opponent"}));}
function newCampaign(){
 return {schema:1,id:"marinelli-sock-monkeys",name:"Screw City Sock Monkeys",venue:"Marinelli Field",league:"American Association",cash:STARTING_CASH,gameIndex:0,wins:0,losses:0,fanRating:45,baseCapacity:900,upgrades:[],ticketPrice:9,staffPerHomeGame:2100,otherPerHomeGame:1150,roadExpense:1850,baseAttendance:460,history:[],season:makeSeason(),status:"active"};
}
function validate(state){
 if(!state||state.id!=="marinelli-sock-monkeys"||!Array.isArray(state.season)||state.season.length!==SEASON_GAMES||!Number.isFinite(state.cash)||!Number.isInteger(state.gameIndex)||state.gameIndex<0||state.gameIndex>SEASON_GAMES) throw Error("Invalid campaign");
 return state;
}
function upgrade(state,key){
 validate(state); const u=UPGRADES[key];
 if(!u) throw Error("Unknown improvement");
 if(state.status!=="active") throw Error("Season complete");
 if(state.upgrades.includes(key)) throw Error("Already purchased");
 if(state.cash<u.cost) throw Error("Insufficient funds");
 return {...state,cash:money(state.cash-u.cost),fanRating:clamp(state.fanRating+u.comfort,0,100),upgrades:[...state.upgrades,key]};
}
function setTicketPrice(state,price){
 validate(state);
 if(!Number.isFinite(price)||price<1||price>100) throw Error("Ticket price must be between $1 and $100");
 return {...state,ticketPrice:money(price)};
}
function game(state,random=0.5){
 validate(state);
 if(state.status!=="active"||state.gameIndex>=SEASON_GAMES) throw Error("Season complete");
 if(!Number.isFinite(random)||random<0||random>=1) throw Error("Random must be in [0,1)");
 const fixture=state.season[state.gameIndex];
 const capacity=Math.max(100,state.baseCapacity+state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].capacity,0));
 const win=random<(0.38+Math.min(0.15,state.wins*0.002));
 const ticketDemand=clamp(1-(state.ticketPrice-9)*0.035,0.45,1.3);
 const momentum=1+clamp((state.wins-state.losses)*0.008,-0.2,0.3);
 const turnout=fixture.home?clamp(Math.round(state.baseAttendance*(0.65+state.fanRating/100*0.65)*ticketDemand*momentum*(0.8+random*0.4)),0,capacity):0;
 const salesBoost=state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].concession,0);
 const gate=money(turnout*state.ticketPrice);
 const concessions=money(turnout*5.5*(1+salesBoost));
 const expense=fixture.home?state.staffPerHomeGame+state.otherPerHomeGame:state.roadExpense;
 const profit=money(gate+concessions-expense);
 const rating=clamp(state.fanRating+(fixture.home?(turnout>capacity*0.9?-1:1):0)+(win?0.2:-0.2),0,100);
 const entry={game:fixture.number,home:fixture.home,opponent:fixture.opponent,win,attendance:turnout,capacity,gate,concessions,expense,profit,cashAfter:money(state.cash+profit)};
 return {...state,cash:entry.cashAfter,gameIndex:state.gameIndex+1,wins:state.wins+Number(win),losses:state.losses+Number(!win),fanRating:rating,history:[...state.history,entry],status:state.gameIndex+1===SEASON_GAMES?"complete":"active"};
}
function advance(state,count=1,random=Math.random){
 if(!Number.isInteger(count)||count<1) throw Error("Count must be a positive integer");
 let next=state;
 for(let i=0;i<count&&next.gameIndex<SEASON_GAMES;i++) next=game(next,random());
 return next;
}
function summary(state){
 validate(state);
 const h=state.history;
 const total=k=>money(h.reduce((n,x)=>n+x[k],0));
 return {gamesPlayed:state.gameIndex,homeGames:h.filter(x=>x.home).length,wins:state.wins,losses:state.losses,cash:state.cash,gate:total("gate"),concessions:total("concessions"),expenses:total("expense"),operatingProfit:total("profit"),attendance:h.reduce((n,x)=>n+x.attendance,0),fanRating:Math.round(state.fanRating),status:state.status};
}
return {SEASON_GAMES,STARTING_CASH,UPGRADES,newCampaign,validate,upgrade,setTicketPrice,game,advance,summary};
});
