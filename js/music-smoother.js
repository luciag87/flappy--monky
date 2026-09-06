'use strict';
// Música ambiente: otro -20% de volumen y transición de loop más natural.
const MUSIC_VOLUME=.2048; // 20% menos que .256
const CROSSFADE_SECONDS=1.35;
const musicA=musicAudio;
const musicB=new Audio('assets/bichon-flappy-music.wav?v=19');
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
    // Fundido de potencia constante: evita el bajón de volumen típico de un fade lineal.
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
function watchMusicLoop(){
  if(state==='playing'&&!musicCrossfading&&Number.isFinite(activeMusic.duration)&&activeMusic.duration>0&&activeMusic.duration-activeMusic.currentTime<=CROSSFADE_SECONDS)crossfadeMusic();
  requestAnimationFrame(watchMusicLoop);
}
requestAnimationFrame(watchMusicLoop);

// Sustituye únicamente la música de fondo; los efectos mantienen su volumen actual.
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

// Prepara también la segunda pista durante un gesto del usuario para Safari/iPhone.
function primeSmoothMusic(){
  setMusicVolume(musicB,0);
  try{const p=musicB.play();if(p&&p.then)p.then(()=>{musicB.pause();try{musicB.currentTime=0}catch{}}).catch(()=>{})}catch{}
}
startButton.addEventListener('touchstart',primeSmoothMusic,{passive:true,once:true});
startButton.addEventListener('pointerdown',primeSmoothMusic,{passive:true,once:true});