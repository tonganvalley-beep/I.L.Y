// The XP shell pauses child games while minimized or while the story menu is open.
addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='ily-embed-control')return;
  window.ILY_HOST_PAUSED=event.data.action==='pause';
});
