/* Read-only adapter for existing Sports Venue Simulator park saves. Never mutates park records. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VenueParkLink=api;})(typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const SEATS=Object.freeze({bleacher:15,stand:20,stairStand:8,backstopStand:20,backstopStair:8,cornerStandLeft:20,cornerStandRight:20,backstopCornerFirst:20,backstopCornerThird:20});
const SHOPS=new Set(["concession","drinks","iceCream"]);
function analyze(park){
 if(!park||typeof park!=="object"||!park.tiles||typeof park.tiles!=="object")throw Error("Invalid ballpark save");
 const items=Object.values(park.tiles).filter(x=>x&&typeof x==="object");
 let capacity=0,shops=0,restrooms=0;
 for(const item of items){capacity+=SEATS[item.type]||0;if(SHOPS.has(item.type))shops++;if(item.type==="restroom")restrooms++;}
 return {capacity,shops,restrooms,objects:items.length};
}
function list(storage){
 const raw=storage.getItem("svs.parks.v1");const records=raw?JSON.parse(raw):[];
 if(!Array.isArray(records))throw Error("Invalid park records");
 return records.filter(x=>x&&x.id&&x.data&&x.data.tiles).map(x=>({id:x.id,name:String(x.name||"Untitled park"),...analyze(x.data)}));
}
function apply(state,park){
 const p=analyze(park);
 return {...state,linkedPark:{capacity:p.capacity,shops:p.shops,restrooms:p.restrooms}};
}
return {SEATS,analyze,list,apply};
});
