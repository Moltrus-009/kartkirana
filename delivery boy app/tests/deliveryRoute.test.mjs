import assert from 'node:assert/strict';
import { coordinates, navigationUrl, remainingStops } from '../src/lib/deliveryRoute.ts';
const stops = [
 {id:'p',type:'pickup',coords:{lat:26.76,lng:83.37},status:'pending',shopAddress:'Store'},
 {id:'a',type:'delivery',coords:{lat:26.77,lng:83.38},status:'pending',address:'Customer A'},
 {id:'b',type:'delivery',coords:{lat:26.78,lng:83.39},status:'pending',address:'Customer B'},
 {id:'c',type:'delivery',coords:{lat:26.79,lng:83.40},status:'pending',address:'Customer C'}
];
for(const value of [null,{}, {lat:null,lng:null},{lat:'',lng:''},{lat:0,lng:0},{lat:91,lng:20}]) assert.equal(coordinates(value),null);
assert.deepEqual(coordinates({lat:'26.76',lng:'83.37'}),{lat:26.76,lng:83.37});
const next=new URL(navigationUrl(stops,0));
assert.equal(next.searchParams.get('destination'),'26.76,83.37');
assert.equal(next.searchParams.get('dir_action'),'navigate');
const full=new URL(navigationUrl(stops,0,true));
assert.equal(full.searchParams.get('waypoints'),'26.76,83.37|26.77,83.38|26.78,83.39');
assert.equal(full.searchParams.get('destination'),'26.79,83.4');
assert.equal(new URL(navigationUrl(stops,2,true)).searchParams.get('waypoints'),'26.78,83.39');
assert.equal(remainingStops(stops.map(s=>({...s,status:'completed'})),0).length,0);
assert.equal(navigationUrl([],0),null);
assert.equal(navigationUrl([{...stops[1],coords:null,address:''}],0),null);
assert.equal(new URL(navigationUrl([{...stops[1],coords:null}],0)).searchParams.get('destination'),'Customer A');
assert.equal(new URL(navigationUrl(stops.slice(0,2),1,true)).searchParams.get('waypoints'),null);
console.log('PASS: single and three-order routes, next stop, completed stops, missing pins, address fallback, and waypoint order.');
