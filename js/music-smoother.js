'use strict';
// Balance de audio optimizado: evita un segundo bucle requestAnimationFrame permanente.
const MUSIC_VOLUME=.26;
const SFX_VOLUME=.52;
const CROSSFADE_SECONDS=1.35;
const musicA=musicAudio;
const musicB=new Audio('assets/audio/monky-background-long.wav?v=23');
musicA.loop=false;musicB.loop=false;
musicA.preload='auto';musicB.preload='auto';
musicA.playsInline=true;musicB.playsInline=true;
musicA.volume=MUSIC_VOLUME;musicB.volume=0;
let activeMusic=musicA,waitingMusic=musicB,musicFadeFrame=0,musicCrossfading=false;

function setMusicVolume(audio,value){try{audio.volume=Math.max(0,Math.min(MUSIC_VOLUME,value))}catch{}}
function cancelMusicFade(){if(musicFadeFrame)cancelAnimationFrame(musicFadeFrame);musicFadeFrame=0;musicCrossfading=false}
function crossfadeMusic(){
  if(musicCrossfading||state!=='playing'||!Number.isFinite(activeMusic.duration))return;
  musicCrossfading=true;
  try{waitingMusic.currentTime=0}catch{}
  setMusicVolume(waitingMusic,0);
  const play=waitingMusic.play();
  if(play&&play.catch)play.catch(()=>{musicCrossfading=false});
  const started=performance.now();
  const fade=now=>{
    if(state!=='playing'){cancelMusicFade();return}
    const p=Math.min(1,(now-started)/(CROSSFADE_SECONDS*1000));
    const outGain=Math.cos(p*Math.PI/2);
    const inGain=Math.sin(p*Math.PI/2);
    setMusicVolume(activeMusic,MUSIC_VOLUME*outGain);
    setMusicVolume(waitingMusic,MUSIC_VOLUME*inGain);
    if(p<1){musicFadeFrame=requestAnimationFrame(fade);return}
    try{activeMusic.pause();activeMusic.currentTime=0}catch{}
    const old=activeMusic;activeMusic=waitingMusic;waitingMusic=old;
    setMusicVolume(waitingMusic,0);
    musicCrossfading=false;musicFadeFrame=0;
  };
  musicFadeFrame=requestAnimationFrame(fade);
}

// Comprueba el final solo cuando el navegador informa progreso de audio.
// El requestAnimationFrame queda reservado únicamente para el fundido de 1,35 s.
function checkMusicLoop(e){
  const audio=e.currentTarget;
  if(audio!==activeMusic||state!=='playing'||musicCrossfading)return;
  if(Number.isFinite(audio.duration)&&audio.duration>0&&audio.duration-audio.currentTime<=CROSSFADE_SECONDS+.15)crossfadeMusic();
}
musicA.addEventListener('timeupdate',checkMusicLoop,{passive:true});
musicB.addEventListener('timeupdate',checkMusicLoop,{passive:true});

startMusic=function(){
  if(state!=='playing')return;
  cancelMusicFade();
  setMusicVolume(activeMusic,MUSIC_VOLUME);
  const p=activeMusic.play();if(p&&p.catch)p.catch(()=>{});
};
stopMusic=function(){
  cancelMusicFade();
  try{musicA.pause();musicB.pause()}catch{}
};

// Rebaja únicamente los efectos interactivos; no altera su duración ni su carácter.
playSfx=function(name){
  try{
    sfxAudio.pause();
    sfxAudio.src=sfxUrls[name];
    sfxAudio.currentTime=0;
    sfxAudio.volume=SFX_VOLUME;
    const p=sfxAudio.play();if(p&&p.catch)p.catch(()=>{});
  }catch{}
};

function primeSmoothMusic(){
  setMusicVolume(musicB,0);
  try{const p=musicB.play();if(p&&p.then)p.then(()=>{musicB.pause();try{musicB.currentTime=0}catch{}}).catch(()=>{})}catch{}
}
// pointerdown cubre ratón, lápiz y touch; evita preparar dos veces el audio en iPhone.
startButton.addEventListener('pointerdown',primeSmoothMusic,{passive:true,once:true});