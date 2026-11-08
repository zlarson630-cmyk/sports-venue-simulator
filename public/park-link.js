/* Read-only adapter for existing Sports Venue Simulator park saves. Never mutates park records. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VenueParkLink=api;})(typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
// Match the builder's seatCapacity() for ordinary bleachers and stand segments.
const SEATS=Object.freeze({bleacher:24,stand:20,stairStand:8,backstopStand:20,backstopStair:8});
const CORNERS=new Set(["cornerStandLeft","cornerStandRight","backstopCornerFirst","backstopCornerThird"]);
const SHOPS=new Set(["concession","drinks","iceCream"]);
function capacityFor(item){
 if(!item||typeof item!=="object")return 0;
 if(CORNERS.has(item.type))return 0; // Curved corner geometry requires the builder's own seat model; don't invent seats.
 if(item.type==="stand"||item.type==="backstopStand"){
  const diagonal=(item.rot||0)%2!==0;
  return diagonal?28:20;
 }
 if(item.type==="stairStand"||item.type==="backstopStair"){
  const diagonal=(item.rot||0)%2!==0;
  return diagonal?16:8;
 }
 return SEATS[item.type]||0;
}
function analyze(park){
 if(!park||typeof park!=="object"||!park.tiles||typeof park.tiles!=="object")throw Error("Invalid ballpark save");
 const items=Object.values(park.tiles).filter(x=>x&&typeof x==="object");
 let capacity=0,shops=0,restrooms=0;
 for(const item of items){capacity+=capacityFor(item);if(SHOPS.has(item.type))shops++;if(item.type==="restroom")restrooms++;}
 return {capacity,shops,restrooms,objects:items.length};
}
function list(storage){
 const raw=storage.getItem("svs.parks.v1");const records=raw?JSON.parse(raw):[];
 if(!Array.isArray(records))throw Error("Invalid park records");
 return records.filter(x=>x&&x.id&&x.data&&x.data.tiles).map(x=>({id:x.id,name:String(x.name||"Untitled park"),...analyze(x.data)}));
}
function apply(state,park){
 const p=analyze(park);
 return {...state,linkedPark:{capacity:p.capacity,shops:p.shops,restrooms:p.restrooms},linkedParkBaselineCapacity:p.capacity,linkedParkBaselineShops:p.shops,linkedParkBaselineRestrooms:p.restrooms,linkedParkSnapshot:true};
}
function sync(state,storage){
 if(!state.linkedParkId)return state;
 const raw=storage.getItem("svs.parks.v1");
 const records=raw?JSON.parse(raw):[];
 if(!Array.isArray(records))throw Error("Invalid park records");
 const record=records.find(x=>x&&x.id===state.linkedParkId);
 if(!record||!record.data)return {...state,linkedParkMissing:true};
 const info=analyze(record.data);
 return {...state,linkedPark:{capacity:info.capacity,shops:info.shops,restrooms:info.restrooms},linkedParkMissing:false,linkedParkSnapshot:false};
}
function link(state,id,storage){
 if(typeof id!=="string"||!id)throw Error("Select a saved ballpark");
 const next=sync({...state,linkedParkId:id,linkedParkBaselineCapacity:undefined,linkedParkBaselineShops:undefined,linkedParkBaselineRestrooms:undefined},storage);
 if(next.linkedParkMissing)throw Error("Saved ballpark no longer exists");
 return {...next,linkedParkBaselineCapacity:next.linkedPark.capacity,linkedParkBaselineShops:next.linkedPark.shops,linkedParkBaselineRestrooms:next.linkedPark.restrooms};
}
function unlink(state){const next={...state};delete next.linkedPark;delete next.linkedParkId;delete next.linkedParkMissing;delete next.linkedParkSnapshot;delete next.linkedParkBaselineCapacity;delete next.linkedParkBaselineShops;delete next.linkedParkBaselineRestrooms;return next;}
return {SEATS,capacityFor,analyze,list,apply,sync,link,unlink};
});
