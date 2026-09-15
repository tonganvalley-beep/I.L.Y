import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({ILY:{}});
vm.runInContext(await readFile(new URL('../game/src/core/room-art.js',import.meta.url),'utf8'),context);
const room=JSON.parse(await readFile(new URL('../game/data/maps/chapter1.json',import.meta.url),'utf8'))['ch1-room'];
const cameraView=context.ILY.classicRoom.cameraView;
test('Classic room camera scales the map uniformly, covers the panel and follows the player',()=>{
  const w=room.width*48,h=room.height*48;
  for(const [width,height] of [[1280,720],[1672,941],[390,844],[2560,1080],[1493,610]]){
    const a=cameraView(width,height,room,{x:11,y:7});
    assert.ok(Number.isInteger(a.scale*3),'Each native art pixel occupies whole screen pixels');
    assert.ok(w*a.scale>=width-.001&&h*a.scale>=height-.001,'The scaled map covers the whole panel');
    assert.ok(width/a.scale<w&&height/a.scale<h,'The camera still has room to follow');
    const b=cameraView(width,height,room,{x:12,y:8});
    assert.ok(b.x>a.x);assert.ok(b.y>a.y);
    // The player is centred unless the camera has hit a map edge (covered by the edge checks).
    const foot=(11+.5)*48*a.scale-a.x*a.scale;
    assert.ok(Math.abs(foot-width/2)<=1||a.x<=0||a.x>=w-width/a.scale-1e-6,'Player stays horizontally centered away from edges');
    for(const position of [{x:0,y:0},{x:room.width-1,y:0},{x:0,y:room.height-1},{x:room.width-1,y:room.height-1}]){
      const c=cameraView(width,height,room,position);
      assert.ok(c.x>=0&&c.y>=0);
      assert.ok(c.x+width/c.scale<=w+.001);
      assert.ok(c.y+height/c.scale<=h+.001);
      // Pointer conversion must invert the scrolling camera, including near boundaries.
      const screenX=(position.x+.5)*48*c.scale-c.x*c.scale;
      assert.ok(Math.abs((screenX/c.scale+c.x)/48-.5-position.x)<1e-9);
    }
  }
});
test('Classic room art is data driven while keeping the original task targets',()=>{
  assert.equal(room.art.renderer,'classic-room');assert.equal(room.art.nativeTileSize,16);
  for(const o of room.decor){assert.ok(o.w>0&&o.h>0);assert.ok(o.x>=0&&o.y>=0);assert.ok(o.x+o.w<=room.width&&o.y+o.h<=room.height);}
  for(const [x,y,label] of [[2,5,'书架'],[7,2,'窗户'],[14,3,'电脑桌'],[17,3,'浴室门左侧'],[22,3,'浴室门右侧'],[12,14,'入户门口'],[5,13,'床'],[18,13,'零食桌'],[21,13,'坐垫']]) {
    assert.equal(room.tiles[y][x],'F',`${label}必须有真实碰撞块`);
  }
  for(let x=1;x<room.width-1;x++)for(let y=1;y<=3;y++)assert.equal(room.tiles[y][x],'F','背墙和窗户区域不可行走');
  for(const [x,y,label] of [[7,4,'窗前地板'],[19,5,'浴室门前交互点'],[13,13,'入户门前地板']])assert.equal(room.tiles[y][x],'.',`${label}必须仍可到达`);
  for(const event of room.events) assert.equal(room.tiles[event.y][event.x],'.',`${event.id} 调查点必须可到达`);
  assert.deepEqual(room.events.map(e=>[e.id,e.x,e.y]),[
    ['floor',11,10],['desk',14,6],['shelf',5,6],['bath',19,5],['handle1',14,6],['handle2',8,11],['computer',14,6]
  ]);
});
