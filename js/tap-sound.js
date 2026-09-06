'use strict';
// Toque breve y ligero para cada salto, optimizado para no forzar play/pause continuamente.
const tapAudio=new Audio();
tapAudio.preload='auto';
tapAudio.playsInline=true;
tapAudio.volume=.18;
const tapSoundUrl=makeWavUrl([
  [720,.022,.16,'sine'],
  [1080,.035,.10,'sine'],
  [840,.028,.07,'triangle']
]);
tapAudio.src=tapSoundUrl;
let lastTapSound=0;

function playTapSound(){
  const now=performance.now();
  if(now-lastTapSound<70)return;
  lastTapSound=now;
  try{
    tapAudio.currentTime=0;
    if(tapAudio.paused){
      const p=tapAudio.play();
      if(p&&p.catch)p.catch(()=>{});
    }
  }catch{}
}

// Conserva la lógica original del salto y añade el sonido solo durante la partida.
const originalFlap=flap;
flap=function(){
  const shouldSound=state==='playing';
  originalFlap();
  if(shouldSound)playTapSound();
};
