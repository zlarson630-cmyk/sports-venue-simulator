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
const WEEK_DAYS=["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function makeSeason(){return Array.from({length:SEASON_GAMES},(_,i)=>{const week=Math.floor(i/6),day=i%6;const home=week%2===0;return {number:i+1,week:week+1,weekday:WEEK_DAYS[day],home,opponent:home?"River City Rivals":"Association Opponent"};});}
function currentSeries(state){validate(state);if(state.gameIndex>=SEASON_GAMES)return null;const first=state.season[state.gameIndex],week=first.week??Math.floor(state.gameIndex/6)+1;const games=state.season.slice(state.gameIndex).filter((g,i)=>i<6&&((g.week??Math.floor((state.gameIndex+i)/6)+1)===week));return {week,home:first.home,games,remaining:games.length};}
function playSeries(state,watchGame=null,random=Math.random){
 state=normalize(validate(state));const series=currentSeries(state);
 if(!series)throw Error("Season complete");
 if(watchGame!==null&&(!series.home||!series.games.some(g=>g.number===watchGame)))throw Error("Select a game in this homestand");
 let next=state,watched=null,entries=[];
 // Freeze prices, staff, and scheduled atmosphere for the whole series.
 const plan={ticketPrice:state.ticketPrice,concessionPrice:state.concessionPrice,staffCount:state.staffCount,gameTime:state.gameTime};
 for(const fixture of series.games){
  next=game({...next,...plan},random());
  const entry=next.history.at(-1);entries.push(entry);
  if(fixture.number===watchGame)watched=entry;
 }
 return {state:next,series:{week:series.week,home:series.home,games:entries},watched};
}

function newCampaign(){
 return {schema:1,id:"marinelli-sock-monkeys",name:"Screw City Sock Monkeys",venue:"Marinelli Field",league:"American Association",cash:STARTING_CASH,year:1,gameIndex:0,wins:0,losses:0,fanRating:45,baseCapacity:900,upgrades:[],ticketPrice:9,staffPerHomeGame:2100,otherPerHomeGame:1150,roadExpense:1850,baseAttendance:460,concessionPrice:5.5,gameTime:"day",staffCount:7,staffDailyWage:300,day:0,projects:[],ledger:[],history:[],seasonRecords:[],season:makeSeason(),status:"active"};
}
function validate(state){
 if(!state||state.id!=="marinelli-sock-monkeys"||!Array.isArray(state.season)||state.season.length!==SEASON_GAMES||!Number.isFinite(state.cash)||!Number.isInteger(state.gameIndex)||state.gameIndex<0||state.gameIndex>SEASON_GAMES) throw Error("Invalid campaign");
 return state;
}
function normalize(state){return {...state,day:state.day??state.gameIndex??0,projects:state.projects||[],staffCount:state.staffCount??7,staffDailyWage:state.staffDailyWage??300,concessionPrice:state.concessionPrice??5.5,gameTime:state.gameTime??"day"};}
function finishProjects(state,day){
 let upgrades=[...state.upgrades],rating=state.fanRating;
 const projects=state.projects.map(p=>{
  if(p.status==="complete")return p;
  if(p.finishDay>day)return {...p,status:p.startDay<=day?"building":"queued"};
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
 // One construction crew: approved projects queue behind previously funded work.
 const lastFinish=state.projects.reduce((max,p)=>p.status==="building"||p.status==="queued"?Math.max(max,p.finishDay):max,state.day);
 const startDay=Math.max(state.day,lastFinish);
 const project={key,cost:u.cost,startDay,finishDay:startDay+u.days,status:startDay>state.day?"queued":"building"};
 return {...state,cash:money(state.cash-u.cost),projects:[...state.projects,project],ledger:[...(state.ledger||[]),{year:state.year,day:state.day,type:"construction",description:u.name,amount:-u.cost}]};
}
function cancelProject(state,key){
 state=normalize(validate(state));
 const project=state.projects.find(p=>p.key===key);
 if(!project)throw Error("Project not found");
 if(project.status!=="queued")throw Error("Only queued projects can be canceled");
 // No work has started; refund the full reserved budget and close the schedule gap.
 const remaining=state.projects.filter(p=>p!==project);
 let cursor=state.day;
 const projects=remaining.map(p=>{
  if(p.status==="complete")return p;
  if(p.status==="building"){cursor=Math.max(cursor,p.finishDay);return p;}
  const duration=UPGRADES[p.key].days;
  const next={...p,startDay:cursor,finishDay:cursor+duration,status:cursor>state.day?"queued":"building"};
  cursor=next.finishDay;
  return next;
 });
 return {...state,cash:money(state.cash+project.cost),projects,ledger:[...(state.ledger||[]),{year:state.year,day:state.day,type:"refund",description:"Canceled "+UPGRADES[key].name,amount:project.cost}]};
}
function setConcessionPrice(state,price){
 state=normalize(validate(state));if(!Number.isFinite(price)||price<1||price>50)throw Error("Concession price must be between $1 and $50");
 return {...state,concessionPrice:money(price)};
}
function setGameTime(state,mode){
 state=normalize(validate(state));
 if(!["day","sunset","night"].includes(mode))throw Error("Unknown game time");
 if(mode==="night"&&!state.upgrades.includes("lighting"))throw Error("Restore stadium lighting before scheduling night games");
 return {...state,gameTime:mode};
}
function setStaffCount(state,count){
 state=normalize(validate(state));if(!Number.isInteger(count)||count<2||count>60)throw Error("Staff count must be between 2 and 60");
 return {...state,staffCount:count};
}
function advanceDays(state,days){
 state=normalize(validate(state));if(!Number.isInteger(days)||days<1||days>365)throw Error("Days must be between 1 and 365");
 if(state.status==="active")throw Error("During the season, the calendar advances when games are played");
 return finishProjects(state,state.day+days);
}
// Complete the offseason construction calendar without skipping any funded project.
// All queued projects run serially under the existing single-crew scheduling rules.
function advanceToOpeningDay(state){
 state=normalize(validate(state));
 if(state.status!=="offseason")throw Error("Opening Day preparation requires the offseason");
 const remaining=state.projects.filter(p=>p.status!=="complete");
 if(!remaining.length)return nextSeason(state);
 const finishDay=Math.max(state.day,...remaining.map(p=>p.finishDay));
 const ready=finishProjects(state,finishDay);
 return nextSeason(ready);
}
function nextSeason(state){
 state=normalize(validate(state));if(state.status!=="offseason")throw Error("Finish current season first");
 if(state.projects.some(p=>p.status!=="complete"&&UPGRADES[p.key].major))throw Error("Finish major construction before Opening Day");
 const report=summary(state);
 const seasonRecord={year:state.year||1,wins:state.wins,losses:state.losses,homeGames:report.homeGames,attendance:report.attendance,gate:report.gate,concessions:report.concessions,expenses:report.expenses,operatingProfit:report.operatingProfit,endingCash:state.cash,fanRating:Math.round(state.fanRating),capitalSpending:money(-(state.ledger||[]).filter(x=>x.year===state.year&&["construction","refund"].includes(x.type)).reduce((n,x)=>n+x.amount,0))};
 return {...state,year:(state.year||1)+1,gameIndex:0,wins:0,losses:0,history:[],seasonRecords:[...(state.seasonRecords||[]),seasonRecord],season:makeSeason(),status:"active"};
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
 const gameTime=fixture.home?state.gameTime:"away";
 if(gameTime==="night"&&!state.upgrades.includes("lighting"))throw Error("Night games require functioning stadium lights");
 const atmosphere=gameTime==="sunset"?1.05:gameTime==="night"?1.12:1;
 const linked=state.linkedPark;
 // When a linked park already contains the constructed seating, do not count the
 // same renovation twice. Unrepresented completed upgrades still add capacity.
 const completedSeats=state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].capacity,0);
 const representedSeats=linked?Math.min(Math.max(0,linked.capacity-(state.linkedParkBaselineCapacity??linked.capacity)),Math.max(0,completedSeats)):0;
 const capacity=linked?Math.max(0,linked.capacity+completedSeats-representedSeats):Math.max(100,state.baseCapacity+completedSeats);
 const win=random<(0.38+Math.min(0.15,state.wins*0.002));
 const ticketDemand=clamp(1-(state.ticketPrice-9)*0.035,0.45,1.3);
 const momentum=1+clamp((state.wins-state.losses)*0.008,-0.2,0.3);
 const staffingFactor=clamp(state.staffCount/7,0.55,1.12);
 const dayFactor=fixture.weekday==="Saturday"?1.38:fixture.weekday==="Friday"?1.17:fixture.weekday==="Sunday"?1.23:fixture.weekday==="Tuesday"?0.78:fixture.weekday==="Wednesday"?0.88:1;
 const turnout=fixture.home?clamp(Math.round(dayFactor*state.baseAttendance*(0.65+state.fanRating/100*0.65)*ticketDemand*momentum*staffingFactor*atmosphere*(0.8+random*0.4)),0,capacity):0;
 const salesBoost=state.upgrades.reduce((sum,key)=>sum+UPGRADES[key].concession,0);
 const effectiveShops=linked?linked.shops+(state.upgrades.includes("concession")&&linked.shops<=(state.linkedParkBaselineShops??linked.shops)?1:0):2;
 const amenityFactor=clamp(effectiveShops/2,0,1.25);
 const restroomPenalty=linked&&linked.restrooms===0&&!state.upgrades.includes("restroom")?-2:0;
 const gate=money(turnout*state.ticketPrice);
 const concessionDemand=clamp(Math.pow(5.5/state.concessionPrice,1.55),0.06,1.5);
 const concessionAvailability=amenityFactor*(linked&&Number.isFinite(linked.accessScore)?clamp(linked.accessScore,0.5,1.12):1);
 const concessions=money(turnout*state.concessionPrice*concessionDemand*(1+salesBoost)*concessionAvailability);
 const lightingCost=gameTime==="night"?650:gameTime==="sunset"?150:0;
 const expense=fixture.home?state.staffCount*state.staffDailyWage+state.otherPerHomeGame+lightingCost:state.roadExpense;
 const profit=money(gate+concessions-expense);
 const servicePenalty=fixture.home&&state.staffCount<Math.ceil(turnout/85)?-1.5:0;
 const rating=clamp(state.fanRating+(fixture.home?(capacity>0&&turnout>capacity*0.9?-1:1):0)+servicePenalty+(fixture.home?restroomPenalty:0)+(win?0.2:-0.2),0,100);
 const entry={game:fixture.number,home:fixture.home,opponent:fixture.opponent,weekday:fixture.weekday||WEEK_DAYS[(fixture.number-1)%6],week:fixture.week||Math.floor((fixture.number-1)/6)+1,gameTime,win,attendance:turnout,capacity,gate,concessions,expense,lightingCost,profit,cashAfter:money(state.cash+profit)};
 return finishProjects({...state,cash:entry.cashAfter,gameIndex:state.gameIndex+1,wins:state.wins+Number(win),losses:state.losses+Number(!win),fanRating:rating,history:[...state.history,entry],ledger:[...(state.ledger||[]),{year:state.year,day:state.day,type:fixture.home?"home-game":"away-game",description:"Game "+fixture.number+" vs "+fixture.opponent,amount:profit}],status:state.gameIndex+1===SEASON_GAMES?"offseason":"active"},state.day+1);
}
function advance(state,count=1,random=Math.random){
 if(!Number.isInteger(count)||count<1) throw Error("Count must be a positive integer");
 let next=state;
 for(let i=0;i<count&&next.gameIndex<SEASON_GAMES;i++) next=game(next,random());
 return next;
}
function forecast(state,count=7){
 state=normalize(validate(state));
 if(!Number.isInteger(count)||count<1||count>100)throw Error("Forecast must cover 1 to 100 games");
 if(state.status!=="active")return {games:0,homeGames:0,projectedProfit:0,projectedCash:state.cash,lowestCash:state.cash,atRisk:state.cash<0};
 let projected=state,lowestCash=state.cash,homeGames=0;
 const remaining=Math.min(count,SEASON_GAMES-state.gameIndex);
 for(let i=0;i<remaining;i++){
  const next=game(projected,0.5);
  if(next.history.at(-1).home)homeGames++;
  lowestCash=Math.min(lowestCash,next.cash);
  projected=next;
 }
 return {games:remaining,homeGames,projectedProfit:money(projected.cash-state.cash),projectedCash:projected.cash,lowestCash,atRisk:lowestCash<0};
}
// Apply a complete operating plan atomically. Invalid input never partially changes a save.
function applyOperatingPlan(state,plan){
 state=normalize(validate(state));
 if(!plan||typeof plan!=="object"||Array.isArray(plan))throw Error("Invalid operating plan");
 let next=state;
 if(Object.hasOwn(plan,"ticketPrice"))next=setTicketPrice(next,plan.ticketPrice);
 if(Object.hasOwn(plan,"concessionPrice"))next=setConcessionPrice(next,plan.concessionPrice);
 if(Object.hasOwn(plan,"staffCount"))next=setStaffCount(next,plan.staffCount);
 if(Object.hasOwn(plan,"gameTime"))next=setGameTime(next,plan.gameTime);
 return next;
}
// Compare operating decisions against the next home date without advancing the save.
// Away games before that date are simulated so the preview includes momentum and cash.
function previewHomeGame(state,options={}){
 state=normalize(validate(state));
 if(state.status!=="active")return null;
 const index=state.season.findIndex((fixture,i)=>i>=state.gameIndex&&fixture.home);
 if(index<0)return null;
 let proposed=applyOperatingPlan(state,options);
 // Projected outcomes use the same deterministic midpoint as the seven-game forecast.
 for(let i=state.gameIndex;i<=index;i++)proposed=game(proposed,0.5);
 const result=proposed.history.at(-1);
 return {...result,gamesUntil:index-state.gameIndex,projectedCash:proposed.cash};
}
function summary(state){
 validate(state);
 const h=state.history;
 const total=k=>money(h.reduce((n,x)=>n+x[k],0));
 return {gamesPlayed:state.gameIndex,homeGames:h.filter(x=>x.home).length,wins:state.wins,losses:state.losses,cash:state.cash,gate:total("gate"),concessions:total("concessions"),expenses:total("expense"),operatingProfit:total("profit"),attendance:h.reduce((n,x)=>n+x.attendance,0),fanRating:Math.round(state.fanRating),status:state.status};
}
return {SEASON_GAMES,STARTING_CASH,UPGRADES,WEEK_DAYS,newCampaign,makeSeason,currentSeries,playSeries,validate,normalize,upgrade,cancelProject,setTicketPrice,setConcessionPrice,setGameTime,setStaffCount,advanceDays,nextSeason,advanceToOpeningDay,game,advance,forecast,applyOperatingPlan,previewHomeGame,summary};
});
