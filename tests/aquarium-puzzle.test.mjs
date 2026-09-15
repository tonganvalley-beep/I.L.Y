import test from 'node:test';
import assert from 'node:assert/strict';
import '../game/aquarium-demo/puzzle.js';
const P=globalThis.AquariumPuzzle;
test('All exhibits have a valid solution, scrambled start, and reachable filters',()=>{
  for(let i=0;i<P.count;i++){
    const level=P.createLevel(i);
    assert.equal(P.evaluate(level,level.solution).success,true,`level ${i} solution`);
    assert.equal(P.evaluate(level,level.initial).success,false,`level ${i} starts unsolved`);
    assert.ok(level.target>0);
    for(const id of level.locked)assert.equal(level.initial[id],level.solution[id]);
  }
});
test('Disconnected inlet, broken connections and unvisited filters cannot win',()=>{
  const level=P.createLevel(0),cells=[...level.solution];
  cells[level.start]=P.rotate(cells[level.start],1);
  assert.equal(P.evaluate(level,cells).success,false);
  cells.splice(0,cells.length,...level.solution);cells[5]=0;
  assert.ok(P.evaluate(level,cells).leaks.length);
  assert.equal(P.evaluate({...level,filters:[15]},level.solution).success,false);
});
test('Rotation is reversible and keeps all four ports',()=>{
  for(let mask=0;mask<16;mask++){
    assert.equal(P.rotate(mask,4),mask);
    assert.equal(P.rotate(P.rotate(mask),-1),mask);
  }
});
