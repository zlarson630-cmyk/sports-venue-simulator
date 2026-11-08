/* Pure construction permit rules shared by builder and tests. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VenuePermits=api;})(typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const SEATING=new Set(["bleacher","stand","stairStand","backstopStand","backstopStair","cornerStandLeft","cornerStandRight","backstopCornerFirst","backstopCornerThird"]);
const FOOD=new Set(["concession","drinks","iceCream"]);
function permitFor(type){return SEATING.has(type)?"bleachers":FOOD.has(type)?"concession":type==="restroom"?"restroom":null;}
function evaluate({campaign,parkId,tiles,item,seatCapacity}){
 if(!campaign||!parkId||campaign.linkedParkId!==parkId)return {allowed:true};
 const permit=permitFor(item.type);
 if(!permit)return {allowed:true};
 if(!campaign.upgrades?.includes(permit)){
  const p=campaign.projects?.find(p=>p.key===permit);
  const status=p?.status==="building"?"Construction underway":p?.status==="queued"?"Construction queued":"Approve and complete the project in the owner's office";
  return {allowed:false,reason:"Campaign construction locked: "+status+" ("+permit+")."};
 }
 const items=Object.values(tiles||{}).filter(Boolean);
 if(permit==="bleachers"){
  const baseline=campaign.linkedParkBaselineCapacity;
  if(!Number.isFinite(baseline))return {allowed:false,reason:"Re-link the park to establish its construction baseline."};
  const seats=x=>SEATING.has(x.type)?seatCapacity(x):0;
  const existing=items.reduce((n,x)=>n+seats(x),0);
  const added=seats(item);
  if(existing+added-baseline>250)return {allowed:false,reason:"Campaign seating allowance exhausted: this renovation covers 250 additional seats."};
 }else{
  const baseline=permit==="concession"?campaign.linkedParkBaselineShops:campaign.linkedParkBaselineRestrooms;
  if(!Number.isFinite(baseline))return {allowed:false,reason:"Re-link the park to establish its construction baseline."};
  const count=items.filter(x=>permit==="concession"?FOOD.has(x.type):x.type==="restroom").length;
  if(count+1-baseline>1)return {allowed:false,reason:"Campaign construction allowance exhausted: this project authorizes one new "+permit+" facility."};
 }
 return {allowed:true};
}
return {permitFor,evaluate};
});
