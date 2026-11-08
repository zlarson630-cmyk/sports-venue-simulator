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
 const baseline=permit==="bleachers"?campaign.linkedParkBaselineCapacity:
  permit==="concession"?campaign.linkedParkBaselineShops:campaign.linkedParkBaselineRestrooms;
 if(!Number.isFinite(baseline))return {allowed:false,reason:"Re-link the park to establish its construction baseline."};
 const items=Object.values(tiles||{}).filter(Boolean);
 const seats=x=>SEATING.has(x.type)?Math.max(0,Number(seatCapacity(x))||0):0;
 const current=permit==="bleachers"?items.reduce((n,x)=>n+seats(x),0):
  items.filter(x=>permit==="concession"?FOOD.has(x.type):x.type==="restroom").length;
 const added=permit==="bleachers"?seats(item):1;
 // Rebuilding existing capacity is maintenance, not a new expansion.
 // This permits replacing demolished seating or facilities without buying the same project twice.
 if(current+added<=baseline)return {allowed:true,maintenance:true,remaining:baseline-current-added};
 if(!campaign.upgrades?.includes(permit)){
  const p=campaign.projects?.find(p=>p.key===permit);
  const status=p?.status==="building"?"Construction underway":p?.status==="queued"?"Construction queued":"Approve and complete the project in the owner's office";
  return {allowed:false,reason:"Campaign construction locked: "+status+" ("+permit+")."};
 }
 const allowance=permit==="bleachers"?250:1;
 const used=Math.max(0,current-baseline);
 const remaining=allowance-used;
 if(added>remaining){
  return {allowed:false,reason:permit==="bleachers"?
   "Campaign seating allowance exhausted: "+Math.max(0,remaining)+" of 250 seats remain.":
   "Campaign construction allowance exhausted: this project authorizes one new "+permit+" facility."};
 }
 return {allowed:true,maintenance:false,remaining:remaining-added};
}
return {permitFor,evaluate};
});
