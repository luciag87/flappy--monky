'use strict';
// Toque breve, limpio y suave para cada salto/tap del juego.
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

function playTapSound(){
  try{
    tapAudio.pause();
    tapAudio.currentTime=0;
    tapAudio.volume=.18;
    const p=tapAudio.play();
    if(p&&p.catch)p.catch(()=>{});
  }catch{}
}

// Conserva toda la lógica original del salto y añade el sonido solo durante la partida.
const originalFlap=flap;
flap=function(){
  const shouldSound=state==='playing';
  originalFlap();
  if(shouldSound)playTapSound();
};
