(() => {
  const stage=document.querySelector('#arena');
  const cleanup=ILY.mountDanmu({stage,level:ILY.data.levels['ch1-tutorial'],node:{next:'desktop'},go:()=>{
    cleanup();stage.replaceChildren(ILY.el('p','','练习结束。关闭这个窗口可以回到电脑桌面。'));
  }});
  addEventListener('pagehide',cleanup,{once:true});
})();
