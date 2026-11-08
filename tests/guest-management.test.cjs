const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {game}=require("./helpers/game.cjs");
test("guest manager includes four management tabs and filters",()=>{
 const html=fs.readFileSync(new URL("../public/index.html",`file://${__filename}`),"utf8");
 for(const id of ["openGuestList","guestManager","guestViewActions","guestViewThoughts","guestViewNeeds","guestViewSpending","guestFilter","guestManagerRows"])assert.match(html,new RegExp('id="'+id+'"'));
 const g=game();g.element("openGuestList").click();
 assert.equal(g.element("guestManager").hidden,false);
 g.element("guestViewThoughts").click();
 assert.equal(g.element("guestViewThoughts")["aria-pressed"],"true");
 g.element("closeGuestList").click();
 assert.equal(g.element("guestManager").hidden,true);
});
test("guest status displays actual activity, needs, and spending",()=>{
 const g=game();
 const guest={paid:true,foodPurchases:2,hunger:80,bathroomNeed:25,activity:"arriving",seated:false};
 assert.equal(g.api.guestAction(guest),"Walking to seat");
 assert.equal(g.api.guestSpending(guest).food,10);
 assert.equal(g.api.guestSpending(guest).admission,5);
 assert.ok(g.api.guestFilterMatch({...guest,activity:"to concession"},"amenity"));
 assert.ok(g.api.guestFilterMatch({...guest,seated:true},"seated"));
 assert.equal(g.api.guestFilterMatch(guest,"seated"),false);
});
