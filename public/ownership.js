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
  restroom:{name:"Reopen restrooms",cost:18000,comfort:7,capacity:0,concession:0,days:3,major:false},
  concession:{name:"Restore concession stand",cost:28000,comfort:3,capacity:0,concession:0.14,days:12,major:false},
  bleachers:{name:"Repair aluminum bleachers",cost:22000,comfort:2,capacity:250,concession:0,days:35,major:true},
  seats:{name:"Install reserved chairback seats",cost:55000,comfort:9,capacity:-50,concession:0,days:65,major:true},
  lighting:{name:"Refurbish stadium lighting",cost:40000,comfort:5,capacity:0,concession:0,days:45,major:true},
  signage:{name:"Refresh ballpark signage",cost:12000,comfort:4,capacity:0,concession:0,days:5,major:false}
});
function clamp(x,min,max){return Math.max(min,Math.min(max,x));}
function money(n){return Math.round(n*100)/100;}
function makeSeason(){return Array.from({length:SEASON_GAMES},(_,i)=>({number:i+1,home:i%2===0,opponent:i%2===0?"River City Rivals":"Association Opponent"}));}
function newCampaign(){
 return {schema:1,id:"marinelli-sock-monkeys",name:"Screw City Sock Monkeys",venue:"Marinelli Field",league:"American Association",cash:STARTING_CASH,gameIndex:0,wins:0,losses:0,fanRating:45,baseCapacity:900,upgrades:[],ticketPrice:9,staffPerHomeGame:2100,otherPerHomeGame:1150,roadExpense:1850,baseAttendance:460,concessionPrice:5.5,staffCount:7,staffDailyWage:300,day:0,projects:[],history:[],season:makeSeason(),status:"active"};
}
function validate(state){
 if(!state||state.id!=="marinelli-sock-monkeys"||!Array.isArray(state.season)||state.season.length!==SEASON_GAMES||!Number.isFinite(state.cash)||!Number.isInteger(state.gameIndex)||state.gameIndex<0||state.gameIndex>SEASON_GAMES) throw Error("Invalid campaign");
 return state;
}
function normalize(state){return {...state,day:state.day??state.gameIndex??0,projects:state.projects||[],staffCount:state.staffCount??7,staffDailyWage:state.staffDailyWage??300,concessionPrice:state.concessionPrice??5.5};}
function finishProjects(state,day){
 let upgrades=[...state.upgrades],rating=state.fanRating;
 const projects=state.projects.map(p=>{
  if(p.status!=="building"||p.finishDay>day)return p;
  const u=UPGRADES[p.key];upgrades.push(p.key);rating=clamp(rating+u.comfort,0,100);
  return {...p,status:"complete"};
 });
 return {...state,day,projects,upgrades,fanRating:rating};
}
function upgrade(state,key){
 state=normalize(validate(state));const u=UPGRADES[key];
 if(!u)throw Error("Unknown improvement");
 if(state.upgrades.includes(key)||state.projects.some(p=>p.key===key))throw Error("Already purchased or scheduled");
 if(state.cash<u.cost)throw Error("Insufficient funds");
 if(u.major&&state.status!=="offseason")throw Error("Major construction requires the offseason");
 if(!["active","offseason"].includes(state.status))throw Error("Invalid season status");
 const project={key,cost:u.cost,startDay:state.day,finishDay:state.day+u.days,status:"building"};
 return {...state,cash:money(state.cash-u.cost),projects:[...state.projects,project]};
}
function setConcessionPrice(state,price){
 state=normalize(validate(state));if(!Number.isFinite(price)||price<1||price>50)throw Error("Concession price must be between $1 and $50");
 return {...state,concessionPrice:money(price)};
}
function setStaffCount(state,count){
 state=normalize(validate(state));if(!Number.isInteger(count)||count<2||count>60)throw Error("Staff count must be between 2 and 60");
 return {...state,staffCount:count};
}
function advanceDays(state,days){
 state=normalize(validate(state));if(!Number.isInteger(days)||days<1||days>365)throw Error("Days must be between 1 and 365");
 return finishProjects(state,state.day+days);
}
function nextSeason(state){
 state=normalize(validate(state));if(state.status!=="offseason")throw Error("Finish current season first");
 return {...state,gameIndex:0,wins:0,losses:0,history:[],season:makeSeason(),status:"active"};
}
function setTicketPrice(state,price){
 validate(state);
 if(!Number.isFinite(price)||price<1||price>100) throw Error("Ticket price must be between $1 and $100");
 return {...state,ticketPrice:money(price)};
}
function game(state,random=0.5){
 state=normalize(validate(state));
 if(state.status!=="active"||state.gameIndex>=SEASON_GAMES) throw Error("Season complete");
 if(!Number.isFinite(random)||random<0||random>=1) throw Error("Random must be in [0,1)");
 const fixture=state.season[state.gameIndex];
 const linked=state.linkedPark;
 const capacity=linked?Math.max(0,linked.capacity+state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].capacity,0)):Math.max(100,state.baseCapacity+state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].capacity,0));
 const win=random<(0.38+Math.min(0.15,state.wins*0.002));
 const ticketDemand=clamp(1-(state.ticketPrice-9)*0.035,0.45,1.3);
 const momentum=1+clamp((state.wins-state.losses)*0.008,-0.2,0.3);
 const staffingFactor=clamp(state.staffCount/7,0.55,1.12);
 const turnout=fixture.home?clamp(Math.round(state.baseAttendance*(0.65+state.fanRating/100*0.65)*ticketDemand*momentum*staffingFactor*(0.8+random*0.4)),0,capacity):0;
 const salesBoost=state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].concession,0);
 const amenityFactor=linked?clamp(linked.shops/2,0,1.25):1;
 const restroomPenalty=linked&&linked.restrooms===0?-2:0;
 const gate=money(turnout*state.ticketPrice);
 const concessionDemand=clamp(1-(state.concessionPrice-5.5)*0.065,0.25,1.35);
 const concessions=money(turnout*state.concessionPrice*concessionDemand*(1+salesBoost)*amenityFactor);
 const expense=fixture.home?state.staffCount*state.staffDailyWage+state.otherPerHomeGame:state.roadExpense;
 const profit=money(gate+concessions-expense);
 const servicePenalty=fixture.home&&state.staffCount<Math.ceil(turnout/85)?-1.5:0;
 const rating=clamp(state.fanRating+(fixture.home?(capacity>0&&turnout>capacity*0.9?-1:1):0)+servicePenalty+(fixture.home?restroomPenalty:0)+(win?0.2:-0.2),0,100);
 const entry={game:fixture.number,home:fixture.home,opponent:fixture.opponent,win,attendance:turnout,capacity,gate,concessions,expense,profit,cashAfter:money(state.cash+profit)};
 return finishProjects({...state,cash:entry.cashAfter,gameIndex:state.gameIndex+1,wins:state.wins+Number(win),losses:state.losses+Number(!win),fanRating:rating,history:[...state.history,entry],status:state.gameIndex+1===SEASON_GAMES?"offseason":"active"},state.day+1);
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
return {SEASON_GAMES,STARTING_CASH,UPGRADES,newCampaign,validate,normalize,upgrade,setTicketPrice,setConcessionPrice,setStaffCount,advanceDays,nextSeason,game,advance,summary};
});
