'use strict';
// Toque breve con reproducción conservadora para no forzar seeks continuos en Safari/iPhone.
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
  const minGap=isMobile?120:85;
  if(now-lastTapSound<minGap)return;
  if(!tapAudio.paused&&!tapAudio.ended)return;
  lastTapSound=now;
  try{
    if(tapAudio.ended)tapAudio.currentTime=0;
    const p=tapAudio.play();
    if(p&&p.catch)p.catch(()=>{});
  }catch{}
}

const originalFlap=flap;
flap=function(){
  const shouldSound=state==='playing';
  originalFlap();
  if(shouldSound)playTapSound();
};
