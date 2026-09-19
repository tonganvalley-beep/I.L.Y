import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';

// 回归：弹幕 boss 关——全程存活到终篇结束（约 5 分钟、生命 > 0）即视为通关，
// 触发 ending 流程（endGame(true) → hostSend boss:end win:true）。
// 受 OneDrive 回退影响时此测试会失败，可作为「功能消失」的预警。
test('存活满 5 分钟（七幕 + 幕间）触发通关 ending 流程',async()=>{
  const {api}=await harness();
  api.startGame();
  let steps=0;
  while(!api.victory && !api.gameOver && steps<12000){
    api.step(1,true);            // 模拟无敌：普通弹不扣血
    api.G.maxhp=9999; api.G.hp=9999; // 验证用：避开脚本闪屏激光的强制扣血，保证「存活」
    steps++;
  }
  assert.equal(api.gameOver,false,'存活不应判负');
  assert.equal(api.victory,true,'存活到终篇结束应触发通关（进而播放 ending.mp4）');
  assert.equal(api.act+1,7,'应抵达第七幕（终篇）');
  assert.ok(api.elapsed>=api.TOTAL_TIME,'用时应达到约 5 分钟（TOTAL_TIME）');
});
