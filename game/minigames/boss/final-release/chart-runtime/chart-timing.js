/* Resolve named musical cutoffs without coupling playback to the editor DOM. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./chart-model.js'):root.ChartModel;
  const transitions={act2:80,act3:107,act4:136,act5:158,act6:294,act7:330,outro:353,songEnd:445.668889};
  function resolve(rows){
    const byId=new Map(),cache=new Map(),visiting=new Set(),issues=[];
    for(const row of rows){if(!row.event?.chartId)continue;const id=row.event.chartId;if(byId.has(id))issues.push(`重复事件 ID：${id}`);else byId.set(id,row);}
    function end(row){
      if(cache.has(row))return cache.get(row);
      if(visiting.has(row))throw Error('消失事件互相引用，形成循环。');
      visiting.add(row);
      try{
        if(!Object.hasOwn(M.fields[0].choices,row.event.kind)){cache.set(row,row.event.t);return row.event.t;}
        const original=row.event,e=M.build(M.read(original),original.t,original),rule=e.endCondition;
        const playback=M.playbackEvent(e);
        let value=playback.t+M.span(playback);
        if(rule){
          if(rule.type==='music')value=rule.time;
          else if(rule.type==='phase')value=transitions[rule.phaseId];
          else if(rule.type==='event'){
            const target=byId.get(rule.eventId);if(!target)throw Error(`消失目标不存在：${rule.eventId}`);
            if(target===row)throw Error('事件不能关联自己的消失时间。');
            if(rule.edge==='start')value=target.event.t;
            else if(rule.edge==='end'){
              if(!M.canEnd(target.event))throw Error('设定或音乐标记没有自然消失时刻，请选择“开始”。');
              value=end(target);
            }else throw Error('关联时刻无效。');
          }else throw Error('消失规则类型无效。');
          if(!Number.isFinite(value)||value<e.t||value>445.669)throw Error(`消失时间须在事件开始 ${e.t}s 至歌曲结束之间。`);
        }
        cache.set(row,value);return value;
      }finally{visiting.delete(row);}
    }
    for(const row of rows)if(row.event){try{end(row);}catch(error){cache.set(row,NaN);issues.push(`#${row.id??row.event.chartId??'?'} ${error.message}`);}}
    return {ends:cache,issues};
  }
  function materialize(event,end){
    if(!event.endCondition||!Number.isFinite(end))return event;
    const e={...event},span=Math.max(0,end-e.t);
    // A musical cutoff replaces the old timeout. It does not repeat already fired groups.
    if(e.kind==='bullet')e.waveDuration=span;
    else if(e.kind==='flowerChain'&&!(e.motion==='collapse'&&e.collapseLifeMode==='arrival')&&!(e.motion==='return'&&e.returnLifeMode==='arrival'))e.life=span;
    else if(e.kind==='laserRow'&&e.holdMode!=='music')e.fire=span;
    else if(['tentacle','caption'].includes(e.kind)&&e.holdMode!=='music'){e.hold=Math.max(0,span);e.fade=0;}
    else if(e.kind==='finalWave')e.waveDuration=span||.0001;
    else if(e.kind==='battleKey'&&e.keyStyle==='counter')e.keyDuration=span;
    return e;
  }
  const api={resolve,materialize,transitions};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartTiming=api;
})(typeof globalThis!=='undefined'?globalThis:this);
