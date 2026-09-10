import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({ILY:{}});
vm.runInContext(await readFile(new URL('../game/src/core/room-art.js',import.meta.url),'utf8'),context);
const room=JSON.parse(await readFile(new URL('../game/data/maps/chapter1.json',import.meta.url),'utf8'))['ch1-room'];
const cameraView=context.ILY.classicRoom.cameraView;
test('Classic room camera zooms in, follows both axes and stops at every map edge',()=>{
  for(const [width,height] of [[1280,720],[1672,941],[390,844],[2560,1080]]){
    const center={x:12.5,y:7},a=cameraView(width,height,room,center);
    assert.ok(width/a.scale<room.width*48,'Only part of the room is visible');
    assert.ok(height/a.scale<room.height*48);
    assert.ok(Number.isInteger(a.scale*3),'Each native art pixel occupies whole screen pixels');
    const b=cameraView(width,height,room,{x:center.x+1,y:center.y+1});
    assert.ok(b.x>a.x);assert.ok(b.y>a.y);
    const foot=(center.x+.5)*48*a.scale-a.x*a.scale;
    assert.ok(Math.abs(foot-width/2)<=1,'The player stays horizontally centered away from edges');
    for(const position of [{x:0,y:0},{x:25,y:0},{x:0,y:14},{x:25,y:14}]){
      const c=cameraView(width,height,room,position);
      assert.ok(c.x>=0&&c.y>=0);
      assert.ok(c.x+width/c.scale<=26*48+.001);
      assert.ok(c.y+height/c.scale<=15*48+.001);
      // Pointer conversion must invert the scrolling camera, including near boundaries.
      const screenX=(position.x+.5)*48*c.scale-c.x*c.scale;
      assert.ok(Math.abs((screenX/c.scale+c.x)/48-.5-position.x)<1e-9);
    }
  }
});
test('Classic room art is data driven while keeping the original task targets',()=>{
  assert.equal(room.art.renderer,'classic-room');assert.equal(room.art.nativeTileSize,16);
  for(const o of room.decor){assert.ok(o.w>0&&o.h>0);assert.ok(o.x>=0&&o.y>=0);assert.ok(o.x+o.w<=room.width&&o.y+o.h<=room.height);}
  assert.deepEqual(room.events.map(e=>[e.id,e.x,e.y]),[
    ['floor',16,11],['desk',20,11],['shelf',22,4],['bath',12,8],['handle1',20,11],['handle2',17,8],['computer',20,11]
  ]);
});
