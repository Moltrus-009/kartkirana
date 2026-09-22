const assert=require('node:assert/strict');
const config=require.resolve('../config/firebase');require.cache[config]={id:config,filename:config,loaded:true,exports:{db:null}};
const service=require('../services/financialService');
const now=new Date().toISOString();
const base={riderId:'r',status:'COMPLETED',createdAt:'2020-01-01',timeline:[{status:'COMPLETED',timestamp:now}],deliveryFee:99};
const result=service.calculateRiderMetrics('r',[base,{...base,batchId:'b'},{...base,batchId:'b'},{...base,status:'CANCELLED'}]);
assert.equal(result.totalEarnings,26);assert.equal(result.earningsToday,26);assert.equal(result.todayDeliveries,3);console.log('PASS: server rider payout ignores customer fee, credits batch orders, excludes cancellations, uses completion date');

const yesterday=new Date(Date.now()-86400000).toISOString();
const crossDay=service.calculateRiderMetrics('r',[{...base,id:'b',batchId:'batch'},{...base,id:'a',batchId:'batch',timeline:[{status:'COMPLETED',timestamp:yesterday}]},{...base,id:'c',batchId:'batch'}]);
assert.equal(crossDay.totalEarnings,22);assert.equal(crossDay.earningsToday,12);
