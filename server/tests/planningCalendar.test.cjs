const {test}=require('node:test');
const assert=require('node:assert/strict');
const {indiaDate,windowFor,validateSchedule,nextOccurrence,dispatchDue}=require('../services/planningCalendar');
const {exact,portable,validateItems,serviceable,matchShop}=require('../services/cartMatching');

test('India date and delivery windows do not depend on host timezone',()=>{
  assert.equal(indiaDate(Date.parse('2026-09-22T19:00:00Z')),'2026-09-23');
  assert.equal(windowFor('2026-09-23','09-11').scheduledDeliveryStart,'2026-09-23T03:30:00.000Z');
  assert.throws(()=>windowFor('2026-02-30','09-11'));
  assert.throws(()=>validateSchedule({date:'2026-09-23',slotId:'09-11'},Date.parse('2026-09-23T03:00:00Z')));
});
test('recurrence respects selected weekdays and end date',()=>{
  const routine={startDate:'2026-09-22',slotId:'09-11',recurrenceType:'WEEKENDS'};
  assert.equal(nextOccurrence(routine,Date.parse('2026-09-22T00:00:00Z')),'2026-09-26T03:30:00.000Z');
  assert.equal(nextOccurrence({...routine,endDate:'2026-09-25'},Date.parse('2026-09-22T00:00:00Z')),null);
  assert.equal(nextOccurrence({...routine,recurrenceType:'ONCE'},Date.parse('2026-09-22T04:00:00Z')),null);
});
test('ordinary orders dispatch immediately, scheduled orders only near window; malformed dates fail closed',()=>{
  const now=Date.parse('2026-09-23T03:00:00Z');
  assert.equal(dispatchDue({},now),true);
  const order={preorderDate:'2026-09-23',preorderSlot:'09:00 AM - 11:00 AM'};
  assert.equal(dispatchDue(order,now),false);
  assert.equal(dispatchDue(order,now+10*60000),true);
  assert.equal(dispatchDue({preorderDate:'bad',preorderSlot:'bad'},now),false);
  assert.equal(dispatchDue({scheduledDeliveryStart:'invalid'},now),false);
});
test('matching does not treat same name with unknown pack or merchant SKU as exact',()=>{
  assert.equal(exact({name:'Milk',sku:'1'},{name:'Milk',sku:'1'}),false);
  assert.equal(exact({name:'Milk',packSize:'500 ml'},{name:'Milk',packSize:'1 L'}),false);
  assert.equal(exact({name:'Milk',packSize:'500 ml',brand:'A'},{name:'milk',packSize:'500 ml',brand:'A'}),true);
});
test('shared product projection drops private and executable fields',()=>{
  const p=portable({name:'Rice',phone:'private',userId:'private',image:'javascript:alert(1)'},'p1',2);
  assert.equal(p.image,'');assert.equal(p.phone,undefined);assert.equal(p.userId,undefined);
  assert.throws(()=>validateItems([{productId:'p',quantity:1},{productId:'p',quantity:2}]));
  assert.throws(()=>validateItems([{productId:'p',quantity:0}]));
});
test('matching respects reserved inventory and service radius',()=>{
  const shop={id:'s',name:'Shop',lat:20,lng:70,deliveryRadius:2};
  const product={id:'p',shopId:'s',name:'Rice',price:40,totalStock:3,reservedStock:2};
  assert.equal(matchShop([portable(product,'p',2)],[product],shop).availableCount,0);
  assert.equal(serviceable(shop,{lat:21,lng:70}),false);
  assert.equal(serviceable(shop,{lat:20,lng:70}),true);
});
