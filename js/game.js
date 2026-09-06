'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const overlay=document.getElementById('overlay');
const startButton=document.getElementById('start');
const endRunButton=document.getElementById('end-run');
const stage=document.getElementById('stage');
const main=document.querySelector('main');
const pauseButton=document.getElementById('pause');
const restartButton=document.getElementById('restart');
const titleEl=document.getElementById('title');
const messageEl=document.getElementById('message');
const mobileHelp=document.getElementById('mobile-help');
const desktopHelp=document.getElementById('desktop-help');

const W=960,H=540;
const DOG_X=215,DOG_R=22,FLOOR_Y=H-18;
let state='ready';
let dog={x:DOG_X,y:260,vy:0};
let gates=[],sausages=[],particles=[];
let score=0,sausageScore=0,lives=0,best=0,spawn=0,last=0,invulnerable=0;
let dogReady=false,sausageReady=false,hudDirty=true;

const isMobile=window.matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
if(isMobile){main.classList.add('mobile-mode');mobileHelp.hidden=false;desktopHelp.hidden=true;}
try{best=Number(localStorage.getItem('bichon-record'))||0}catch{}

// Capas estáticas y HUD en canvas auxiliares: mantienen el mismo aspecto evitando
// recrear gradientes y sombras costosas en cada frame.
function makeLayer(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
const sceneCanvas=makeLayer(W,H),sceneCtx=sceneCanvas.getContext('2d',{alpha:false});
const sky=sceneCtx.createLinearGradient(0,0,0,H);
sky.addColorStop(0,'#78c6eb');sky.addColorStop(.65,'#c8ebec');sky.addColorStop(1,'#ffe3b1');
sceneCtx.fillStyle=sky;sceneCtx.fillRect(0,0,W,H);
sceneCtx.fillStyle='#183f5f';sceneCtx.fillRect(0,FLOOR_Y,W,18);

const hudCanvas=makeLayer(W,100),hudCtx=hudCanvas.getContext('2d');
function refreshHud(){
  if(!hudDirty)return;
  hudDirty=false;
  hudCtx.clearRect(0,0,W,100);
  hudCtx.save();
  hudCtx.textBaseline='middle';
  hudCtx.shadowColor='#ffffff80';hudCtx.shadowBlur=8;
  hudCtx.fillStyle='#183f5fcc';hudCtx.font='700 22px system-ui';
  hudCtx.textAlign='left';hudCtx.fillText(`🌭 ${sausageScore}   ❤️ ${lives}`,24,36);
  hudCtx.textAlign='right';hudCtx.fillText(`🏆 ${best}`,W-24,36);
  hudCtx.shadowColor='#00000055';hudCtx.shadowBlur=10;
  hudCtx.fillStyle='#183f5f88';hudCtx.font='800 72px system-ui';hudCtx.textAlign='center';
  hudCtx.fillText(score,W/2,58);
  hudCtx.restore();
}

// Audio basado en HTMLAudioElement para mejorar compatibilidad con Safari/iPhone.
const musicAudio=new Audio('assets/audio/monky-background-long.wav?v=20');
musicAudio.loop=true;musicAudio.preload='auto';musicAudio.volume=.32;musicAudio.playsInline=true;
const sfxAudio=new Audio();sfxAudio.preload='auto';sfxAudio.volume=.7;sfxAudio.playsInline=true;
let mediaPrimed=false;
function makeWavUrl(steps){
  const rate=11025,attack=.008,release=.025,total=steps.reduce((n,s)=>n+s[1],0);
  const count=Math.max(1,Math.ceil(total*rate)),data=new Int16Array(count);let offset=0;
  for(const [freq,dur,amp=.55,type='sine'] of steps){
    const len=Math.max(1,Math.floor(dur*rate));
    for(let i=0;i<len&&offset+i<count;i++){
      const t=i/rate,phase=(t*freq)%1,env=Math.min(1,t/attack,Math.max(0,(dur-t)/release));
      let wave;if(type==='square')wave=phase<.5?1:-1;else if(type==='triangle')wave=1-4*Math.abs(phase-.5);else wave=Math.sin(Math.PI*2*phase);
      data[offset+i]=Math.max(-32767,Math.min(32767,Math.round(wave*amp*env*32767)));
    }
    offset+=len;
  }
  const buf=new ArrayBuffer(44+data.length*2),v=new DataView(buf),txt=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  txt(0,'RIFF');v.setUint32(4,36+data.length*2,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);txt(36,'data');v.setUint32(40,data.length*2,true);
  for(let i=0;i<data.length;i++)v.setInt16(44+i*2,data[i],true);
  return URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
}
const sfxUrls={
  silent:makeWavUrl([[1,.04,0,'sine']]),
  sausage:makeWavUrl([[880,.07,.45,'square'],[1174.66,.08,.38,'square'],[1567.98,.11,.32,'triangle']]),
  life:makeWavUrl([[523.25,.09,.35,'triangle'],[659.25,.1,.4,'triangle'],[783.99,.12,.42,'triangle'],[1046.5,.17,.34,'sine']]),
  over:makeWavUrl([[392,.14,.4,'triangle'],[329.63,.17,.4,'triangle'],[261.63,.28,.45,'triangle']])
};
function primeAudioGesture(){
  if(mediaPrimed)return;mediaPrimed=true;
  try{sfxAudio.src=sfxUrls.silent;sfxAudio.volume=.001;const p=sfxAudio.play();if(p&&p.then)p.then(()=>{sfxAudio.pause();sfxAudio.currentTime=0;sfxAudio.volume=.7}).catch(()=>{mediaPrimed=false;sfxAudio.volume=.7})}catch{mediaPrimed=false;sfxAudio.volume=.7}
  try{const p=musicAudio.play();if(p&&p.catch)p.catch(()=>{mediaPrimed=false})}catch{mediaPrimed=false}
}
function playSfx(name){try{sfxAudio.pause();sfxAudio.src=sfxUrls[name];sfxAudio.currentTime=0;sfxAudio.volume=.7;const p=sfxAudio.play();if(p&&p.catch)p.catch(()=>{})}catch{}}
function startMusic(){if(state!=='playing')return;try{musicAudio.volume=.32;const p=musicAudio.play();if(p&&p.catch)p.catch(()=>{})}catch{}}
function stopMusic(){try{musicAudio.pause()}catch{}}
function sausageSound(){playSfx('sausage')}
function lifeSound(){playSfx('life')}
function gameOverSound(){stopMusic();playSfx('over')}

// Sprites preescalados una sola vez. El dibujo conserva el mismo tamaño/calidad,
// pero Safari no tiene que reescalar las imágenes en cada frame.
let dogSpriteCanvas=null,sausageSpriteCanvas=null;
function cacheSprite(img,w,h){const c=makeLayer(w,h),cctx=c.getContext('2d');cctx.imageSmoothingEnabled=true;cctx.imageSmoothingQuality='high';cctx.drawImage(img,0,0,w,h);return c;}
function updateReady(){
  if(!dogReady||!sausageReady)return;
  startButton.disabled=false;startButton.textContent=isMobile?'Jugar en horizontal':'¡Vamos a jugar!';
  if(isMobile&&matchMedia('(orientation: portrait)').matches){titleEl.textContent='Gira el móvil';messageEl.innerHTML='Pon el teléfono en <span class="rotate-hint">horizontal</span> y toca el botón para jugar. Después solo tendrás que tocar la pantalla para saltar.'}
}
const sprite=new Image();
sprite.onload=()=>{dogSpriteCanvas=cacheSprite(sprite,88,88);dogReady=true;updateReady()};
sprite.onerror=()=>{messageEl.textContent='No se pudo cargar el personaje.'};
sprite.src='assets/images/bichon-sprite.png?v=11';
const sausageSprite=new Image();
sausageSprite.onload=()=>{sausageSpriteCanvas=cacheSprite(sausageSprite,92,64);sausageReady=true;updateReady()};
sausageSprite.onerror=()=>{messageEl.textContent='No se pudo cargar la nueva imagen de la salchicha.'};
sausageSprite.src='assets/images/sausage-first.png?v=11';

function show(a,b,c,canEnd=false){titleEl.textContent=a;messageEl.textContent=b;startButton.textContent=c;endRunButton.hidden=!canEnd;overlay.hidden=false}
async function enterMobilePlay(){if(!isMobile)return;try{if(!document.fullscreenElement&&stage.requestFullscreen)await stage.requestFullscreen()}catch{}try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch{}}
function start(){
  if(!dogReady||!sausageReady)return;
  state='playing';dog={x:DOG_X,y:260,vy:-290};gates.length=0;sausages.length=0;particles.length=0;
  score=sausageScore=lives=0;hudDirty=true;invulnerable=0;spawn=.5;overlay.hidden=true;endRunButton.hidden=true;pauseButton.textContent='Pausar';last=performance.now();
  try{musicAudio.currentTime=0}catch{}startMusic();
}
function flap(){
  if(!dogReady||!sausageReady)return;
  if(state==='ready'||state==='over'){start();return}
  if(state!=='playing')return;
  dog.vy=-310;
  for(let i=0;i<6;i++)particles.push({x:dog.x-18,y:dog.y+15,vx:-50-Math.random()*60,vy:(Math.random()-.5)*80,life:.5,type:'cloud'});
}
function pause(){if(state==='playing'){state='paused';stopMusic();show('Una pequeña pausa','Tu aventura te espera.','Continuar');pauseButton.textContent='Continuar'}else if(state==='paused'){state='playing';overlay.hidden=true;last=performance.now();pauseButton.textContent='Pausar';startMusic()}}
function saveBest(){if(score>best){best=score;hudDirty=true;try{localStorage.setItem('bichon-record',String(best))}catch{}}}
function finishGame(){state='over';saveBest();show('¡Otro saltito!',`Has conseguido ${score} puntos y ${sausageScore} salchichas. Tu récord: ${best}.`,isMobile?'Toca para volver a jugar':'Volver a jugar')}
function die(){if(state!=='playing')return;gameOverSound();if(lives>0){state='continue';show('¡Tienes una vida! ❤️',`Puedes gastar una vida y continuar con ${score} puntos y ${sausageScore} salchichas. El bichón reaparecerá en una zona segura.`,`Usar ❤️ y continuar`,true)}else finishGame()}
function continueWithLife(){
  if(state!=='continue'||lives<1)return;
  lives--;hudDirty=true;dog={x:DOG_X,y:H/2,vy:0};
  for(let i=gates.length-1;i>=0;i--)if(gates[i].x<=dog.x+420)gates.splice(i,1);
  for(let i=sausages.length-1;i>=0;i--)if(sausages[i].collected||sausages[i].x<=dog.x+420)sausages.splice(i,1);
  particles.length=0;spawn=Math.max(spawn,1.1);invulnerable=1.25;state='playing';overlay.hidden=true;endRunButton.hidden=true;pauseButton.textContent='Pausar';last=performance.now();startMusic();
}
function circleRect(x,y,r,rx,ry,rw,rh){const dx=x-Math.max(rx,Math.min(x,rx+rw)),dy=y-Math.max(ry,Math.min(y,ry+rh));return dx*dx+dy*dy<r*r}
function collectSausage(s){
  s.collected=true;sausageScore++;hudDirty=true;sausageSound();
  if(sausageScore%20===0){lives++;hudDirty=true;lifeSound();for(let i=0;i<18;i++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*190,vy:(Math.random()-.5)*190,life:.8,type:'life'})}
  for(let i=0;i<10;i++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.55,type:'sausage'});
}
function update(dt){
  if(state!=='playing')return;
  invulnerable=Math.max(0,invulnerable-dt);
  const speed=175+Math.min(score*3,85);
  dog.vy+=760*dt;dog.y+=dog.vy*dt;
  spawn-=dt;
  if(spawn<=0){
    const center=165+Math.random()*210,x=W+50;
    gates.push({x,center,passed:false});
    if(Math.random()<.656)sausages.push({x:x+36,y:center+(Math.random()-.5)*70,collected:false,wobble:Math.random()*Math.PI*2});
    spawn=1.95;
  }
  const gap=190-Math.min(score,30),safe=invulnerable<=0;
  for(let i=0;i<gates.length;i++){
    const g=gates[i];g.x-=speed*dt;
    const top=g.center-gap/2,bottom=g.center+gap/2;
    if(safe&&(circleRect(dog.x,dog.y,DOG_R,g.x-5,0,82,top)||circleRect(dog.x,dog.y,DOG_R,g.x-5,bottom,82,H-bottom))){die();return}
    if(!g.passed&&g.x+77<dog.x-DOG_R){g.passed=true;score++;hudDirty=true}
  }
  for(let i=0;i<sausages.length;i++){
    const s=sausages[i];s.x-=speed*dt;
    if(!s.collected){const dx=dog.x-s.x,dy=dog.y-s.y;if(dx*dx+dy*dy<2025)collectSausage(s)}
  }
  for(let i=gates.length-1;i>=0;i--)if(gates[i].x<=-120)gates.splice(i,1);
  for(let i=sausages.length-1;i>=0;i--){const s=sausages[i];if(s.x<=-100||s.collected)sausages.splice(i,1)}
  if(safe&&(dog.y<22||dog.y>H-42)){die();return}
  if(invulnerable>0)dog.y=Math.max(54,Math.min(H-72,dog.y));
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
}

function round(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawSausage(x,y,t,w=0){ctx.save();ctx.translate(x,y+Math.sin(t/180+w)*5);ctx.rotate(Math.sin(t/260+w)*.1);ctx.drawImage(sausageSpriteCanvas,-46,-32);ctx.restore()}
function draw(t){
  ctx.drawImage(sceneCanvas,0,0);
  const gap=190-Math.min(score,30);
  for(let i=0;i<gates.length;i++){
    const g=gates[i],top=g.center-gap/2,bottom=g.center+gap/2;
    round(g.x,-20,72,top+20,12,'#247d8c');round(g.x-5,top-18,82,18,6,'#185965');
    round(g.x,bottom,72,H-bottom,12,'#247d8c');round(g.x-5,bottom,82,18,6,'#185965');
  }
  for(let i=0;i<sausages.length;i++){const s=sausages[i];if(!s.collected)drawSausage(s.x,s.y,t,s.wobble)}
  for(let i=0;i<particles.length;i++){
    const p=particles[i];ctx.globalAlpha=Math.max(0,p.life*1.5);ctx.fillStyle=p.type==='life'?'#ff8fa3':p.type==='sausage'?'#ffd17b':'#fff';
    ctx.beginPath();ctx.arc(p.x,p.y,p.type==='life'?5:4,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(dogReady){
    ctx.save();ctx.translate(dog.x,state==='ready'?dog.y+Math.sin(t/350)*8:dog.y);
    ctx.rotate(state==='playing'?Math.max(-.22,Math.min(.45,dog.vy/1100)):0);
    if(invulnerable>0&&Math.floor(t/100)%2===0)ctx.globalAlpha=.45;
    ctx.drawImage(dogSpriteCanvas,-44,-44);ctx.restore();ctx.globalAlpha=1;
  }
  if(state==='playing'||state==='continue'){refreshHud();ctx.drawImage(hudCanvas,0,0)}
}

function frame(t){
  // Usa el tiempo real transcurrido. El antiguo límite rígido a 1/30 hacía que
  // los frames tardíos avanzasen menos de lo debido y producía sensación de tirones.
  const dt=Math.min((t-last)/1000||0,.05);last=t;
  update(dt);draw(t);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat){primeAudioGesture();flap()}}if(e.code==='KeyP'&&!e.repeat)pause()});
window.addEventListener('blur',()=>{if(state==='playing'&&!isMobile)pause()});
startButton.addEventListener('pointerdown',primeAudioGesture,{passive:true});
startButton.onclick=async()=>{primeAudioGesture();if(state==='continue'){continueWithLife();return}if(isMobile)await enterMobilePlay();if(state==='paused')pause();else start()};
endRunButton.onclick=()=>{if(state==='continue')finishGame()};
restartButton.onclick=()=>{primeAudioGesture();start()};
pauseButton.onclick=()=>{primeAudioGesture();pause()};
canvas.onpointerdown=e=>{e.preventDefault();primeAudioGesture();flap()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(state==='playing'){last=performance.now();startMusic()}});
window.addEventListener('pageshow',()=>{last=performance.now();if(state==='playing')startMusic()});
window.addEventListener('orientationchange',()=>{if(isMobile&&matchMedia('(orientation: portrait)').matches&&state!=='playing')show('Gira el móvil','Pon el teléfono en horizontal. Después toca el botón y juega tocando la pantalla.','Jugar en horizontal')});
