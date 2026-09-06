'use strict';
// Audio ligero: una sola pista larga en loop para reducir decodificación y trabajo en Safari/iPhone.
const MUSIC_VOLUME=.26;
const SFX_VOLUME=.52;
const musicA=musicAudio;
musicA.loop=true;
musicA.preload='auto';
musicA.playsInline=true;
musicA.volume=MUSIC_VOLUME;

startMusic=function(){
  if(state!=='playing')return;
  try{
    musicA.volume=MUSIC_VOLUME;
    const p=musicA.play();
    if(p&&p.catch)p.catch(()=>{});
  }catch{}
};
stopMusic=function(){
  try{musicA.pause()}catch{}
};

// Mantiene los efectos equilibrados respecto a la música, sin tocar la pista de fondo.
playSfx=function(name){
  try{
    sfxAudio.pause();
    sfxAudio.src=sfxUrls[name];
    sfxAudio.currentTime=0;
    sfxAudio.volume=SFX_VOLUME;
    const p=sfxAudio.play();
    if(p&&p.catch)p.catch(()=>{});
  }catch{}
};
