/* Hours engine: shared scene, sky, water, weather, camera, UI. City content comes from window.CITY (cities/*.js). */
(function(){
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var clamp=function(x,a,b){return Math.min(b,Math.max(a,x))};
var lerp=function(a,b,t){return a+(b-a)*t};
var sstep=function(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
var rs=20261013;
function rnd(){rs=(rs*1664525+1013904223)>>>0;return rs/4294967296}
function fail(msg){var d=document.createElement('div');d.className='fail';d.textContent=msg;document.body.appendChild(d)}
if(typeof THREE==='undefined'){fail('無法載入 3D 程式庫,請檢查網絡後重新整理。');return}
var canvas=$('#c');
var renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'})}catch(e){fail('你的瀏覽器不支援 WebGL,無法顯示'+CITY.nameZh+'場景。');return}
var small=window.innerWidth<700||(navigator.hardwareConcurrency||8)<=4;
var QL=small?1:2;                       /* 0 low, 1 medium, 2 high */
var PR=Math.min(window.devicePixelRatio||1,small?1.5:2);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
var scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x000000,100,500);
var camera=new THREE.PerspectiveCamera(48,1,1,2600);
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- layout constants ---------- */
var RW=28;            /* half width of the river */
var ROW0=40;          /* first block row centre */

/* ---------- shared uniforms ---------- */
var U={
  uTime:{value:0},uScale:{value:700},uPR:{value:PR},
  uLit:{value:0},uNight:{value:0},uSunVis:{value:1},
  uSnow:{value:0},uRain:{value:0},uXmas:{value:0},
  uFogColor:{value:new THREE.Color()},uFogNear:{value:100},uFogFar:{value:500},
  uSkyCol:{value:new THREE.Color()},
  uSunDir:{value:new THREE.Vector3(1,0,0)},uSunCol:{value:new THREE.Color()},uMoonDir:{value:new THREE.Vector3(-1,1,0)},
  uTop:{value:new THREE.Color()},uMid:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uCloudCol:{value:new THREE.Color()},
  uCloud:{value:0.4},
  uVG:{value:0},uVGM:{value:new THREE.Matrix4()},uVGA:{value:1.6},uVGTex:{value:null}
};
function uni(extra){return Object.assign({},U,extra||{})}

/* ---------- Van Gogh projection mapping ---------- */
var vgTex=new THREE.Texture();vgTex.wrapS=vgTex.wrapT=THREE.MirroredRepeatWrapping;vgTex.minFilter=THREE.LinearMipmapLinearFilter;vgTex.anisotropy=8;U.uVGTex.value=vgTex;
(function(){var im=new Image();im.onload=function(){vgTex.image=im;vgTex.needsUpdate=true};im.src=CITY.paintings[0].file})();
var vgTexs=[vgTex];
(function(){CITY.paintings.slice(1).forEach(function(P){var t=new THREE.Texture();t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=8;var im=new Image();im.onload=function(){t.image=im;t.needsUpdate=true};im.src=P.file;vgTexs.push(t)})})();
var PAINTS=CITY.paintings;
function setPaint(i){
  if(!vgTexs[i])return;U.uVGTex.value=vgTexs[i];
  var P=PAINTS[i];$('#credit').textContent=P.a+', '+P.n+', '+P.y+'. Public domain; image via Wikimedia Commons.';
  document.querySelectorAll('.paint').forEach(function(b){b.setAttribute('aria-pressed',+b.getAttribute('data-i')===i?'true':'false')});
}
var VG_FN=[
'vec3 vgSample(vec4 wp){',
' vec4 pc=uVGM*wp;',
' if(pc.w<0.12){vec2 fu=wp.w>0.5?vec2(wp.x+wp.z*0.5,wp.y*1.5+wp.z*0.3)*0.012:vec2(atan(wp.x,wp.z)*0.32+0.5,wp.y*0.7+0.5);return texture2D(uVGTex,fu).rgb;}',
' vec2 uv=pc.xy/pc.w*0.5+0.5;vec2 q=uv-0.5;',
' if(uVGA>1.26){q.y*=1.26/uVGA;}else{q.x*=uVGA/1.26;}',
' uv=q+0.5;',
' uv+=0.0032*vec2(sin(uv.y*58.0+uTime*0.9),cos(uv.x*50.0+uTime*0.7));',
' return texture2D(uVGTex,uv).rgb;',
'}'].join('\n');
var VG_UNI='uniform sampler2D uVGTex;uniform mat4 uVGM;uniform float uVGA;uniform float uVG;';
function vgInject(sh){
  sh.uniforms.uVG=U.uVG;sh.uniforms.uVGM=U.uVGM;sh.uniforms.uVGA=U.uVGA;sh.uniforms.uVGTex=U.uVGTex;sh.uniforms.uTime=U.uTime;
  sh.vertexShader='varying vec3 vVGW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n vVGW=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\n vVGW=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif');
  sh.fragmentShader='varying vec3 vVGW;uniform float uTime;\n'+VG_UNI+'\n'+VG_FN+'\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
   '#include <emissivemap_fragment>\n if(uVG>0.001){vec3 pv=vgSample(vec4(vVGW,1.0));if(pv.r>=0.0){vec3 gn=normalize(cross(dFdx(vVGW),dFdy(vVGW)));float lt=0.42+0.62*abs(gn.y)+0.28*abs(gn.x);vec3 pl=pv*lt;float vm=uVG*0.94;diffuseColor.rgb=mix(diffuseColor.rgb,pl*0.85,vm);totalEmissiveRadiance=totalEmissiveRadiance*(1.0-vm*0.55)+pl*0.28*vm;metalnessFactor*=(1.0-vm);roughnessFactor=mix(roughnessFactor,0.9,vm);}}');
}
function vgSnap(){camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();U.uVGM.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);U.uVGA.value=camera.aspect}

var GLC=[
'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}',
'float fbm(vec2 p){float a=0.5;float s=0.0;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+17.1;a*=0.5;}return s;}'
].join('\n');

/* ---------- sky ---------- */
var skyMat=new THREE.ShaderMaterial({
  uniforms:uni(),side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_Position.z=gl_Position.w;}',
  fragmentShader:[
  'precision highp float;varying vec3 vDir;',
  'uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uHor;uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uMoonDir;uniform vec3 uCloudCol;uniform vec3 uFogColor;',
  'uniform float uNight;uniform float uTime;uniform float uCloud;uniform float uRain;uniform float uSunVis;',VG_UNI,VG_FN,
  GLC,
  'void main(){',
  ' vec3 d=normalize(vDir);float y=d.y;',
  ' vec3 col=mix(uHor,uMid,smoothstep(0.0,0.24,y));',
  ' col=mix(col,uTop,smoothstep(0.14,0.9,y));',
  ' if(y<0.0){col=mix(uHor,uHor*0.5,clamp(-y*5.0,0.0,1.0));}',
  ' col+=vec3(1.0,0.55,0.25)*uNight*0.16*exp(-max(y,0.0)*7.0)*(1.0-uRain*0.3);',
  ' float sd=max(dot(d,uSunDir),0.0);',
  ' col+=uSunCol*(pow(sd,6.0)*0.25+pow(sd,48.0)*0.5+smoothstep(0.9996,0.9999,sd)*6.0)*uSunVis;',
  ' float st=0.0;',
  ' if(y>0.0){vec3 p=d*130.0;vec3 c=floor(p);float h=hash3(c);float r=length(fract(p)-0.5);float tw=0.6+0.4*sin(uTime*2.0+h*40.0);st=step(0.985,h)*smoothstep(0.36,0.0,r)*tw*(0.5+0.8*hash3(c+3.0));}',
  ' col+=vec3(0.8,0.85,1.0)*st*uNight*(1.0-uCloud*0.8)*smoothstep(0.0,0.15,y)*1.4;',
  ' float md=dot(d,uMoonDir);',
  ' float moon=smoothstep(0.9993,0.9997,md);',
  ' col+=vec3(0.92,0.94,1.0)*(moon*1.6+pow(max(md,0.0),90.0)*0.35+pow(max(md,0.0),8.0)*0.06)*uNight*(1.0-uCloud*0.7);',
  ' if(y>0.01){',
  '  vec2 uv=d.xz/(y+0.12)*0.55+vec2(uTime*0.004,uTime*0.0015);',
  '  float n=fbm(uv*1.6);',
  '  float n2=fbm(uv*1.6+uSunDir.xz*0.07);',
  '  float cv=smoothstep(1.0-uCloud,1.0-uCloud+0.28,n+0.12*fbm(uv*5.0));',
  '  cv*=smoothstep(0.0,0.14,y);',
  '  float lit=clamp((n-n2)*4.0+0.55,0.0,1.0);',
  '  vec3 cc=mix(uCloudCol*0.5,uCloudCol*1.05+uSunCol*0.18,lit);',
  '  cc=mix(cc,cc*0.5,uRain*0.6);',
  '  cc+=uSunCol*pow(sd,4.0)*0.6*uSunVis;',
  '  col=mix(col,cc,cv*0.92);',
  ' }',
  ' if(uVG>0.001&&d.y>0.0){vec2 su=vec2(atan(d.x,d.z)*0.9549+uTime*0.004,0.34+0.66*pow(d.y,0.75));su+=0.003*vec2(sin(su.y*58.0+uTime*0.9),cos(su.x*50.0+uTime*0.7));vec3 pv=texture2D(uVGTex,su).rgb;col=mix(col,pv*0.62,uVG*smoothstep(0.0,0.2,d.y));}',
  ' col=mix(col,uFogColor,(1.0-smoothstep(0.0,0.1,y))*0.92);',
' gl_FragColor=vec4(col,1.0);',
  '}'].join('\n')
});
var skyGeo=new THREE.SphereGeometry(1000,40,24);
var sky=new THREE.Mesh(skyGeo,skyMat);sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
/* sky captured into a cube map so every standard material gets sky light and reflections */
var skyScene=new THREE.Scene();var skyTwin=new THREE.Mesh(skyGeo,skyMat);skyTwin.frustumCulled=false;skyScene.add(skyTwin);
var cubeRT=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});
var cubeCam=new THREE.CubeCamera(1,3000,cubeRT);cubeCam.position.set(0,20,0);
var pmrem=new THREE.PMREMGenerator(renderer),envRT=null;
function updateEnv(){
  var vgs=U.uVG.value;U.uVG.value=0;
  cubeCam.update(renderer,skyScene);U.uVG.value=vgs;
  var rt=pmrem.fromCubemap(cubeRT.texture);
  scene.environment=rt.texture;
  if(envRT)envRT.dispose();
  envRT=rt;
}

/* ---------- lights ---------- */
var hemi=new THREE.HemisphereLight(0xffffff,0x444444,0.12);scene.add(hemi);
var dir=new THREE.DirectionalLight(0xffffff,1);scene.add(dir);scene.add(dir.target);
dir.target.position.set(-25,0,-5);
dir.castShadow=true;
function setShadowSize(n){
  dir.shadow.mapSize.set(n,n);
  if(dir.shadow.map){dir.shadow.map.dispose();dir.shadow.map=null}
}
setShadowSize(QL>=2?4096:2048);
var sc=dir.shadow.camera;sc.left=-230;sc.right=230;sc.top=230;sc.bottom=-230;sc.near=10;sc.far=1100;sc.updateProjectionMatrix();
dir.shadow.bias=-0.0006;dir.shadow.normalBias=0.45;

/* ---------- material helpers ---------- */
var nightMats=[],snowMats=[];
function mat(color,o){
  o=o||{};
  var em=o.e!==undefined?o.e:(o.emap?0xffffff:undefined);
  var m=new THREE.MeshStandardMaterial({color:color,roughness:o.r!==undefined?o.r:0.85,metalness:o.m||0,emissive:em!==undefined?em:0x000000,emissiveIntensity:0,map:o.map||null,emissiveMap:o.emap||null});
  m.envMapIntensity=o.env!==undefined?o.env:0.9;
  m.onBeforeCompile=vgInject;
  if(em!==undefined)nightMats.push({m:m,k:o.k!==undefined?o.k:1});
  if(o.snow)snowMats.push({m:m,base:new THREE.Color(color)});
  return m;
}
function facade(cols,rows,o){
  o=o||{};var wall=o.wall||'#8a8478',win=o.win||'#242b36',p=o.p!==undefined?o.p:0.45,sx=o.sx||12,sy=o.sy||14;
  function mk(){var c=document.createElement('canvas');c.width=cols*sx;c.height=rows*sy;return c}
  var a=mk(),b=mk(),A=a.getContext('2d'),B=b.getContext('2d');
  A.fillStyle=wall;A.fillRect(0,0,a.width,a.height);B.fillStyle='#000';B.fillRect(0,0,b.width,b.height);
  for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
    var x=c*sx+sx*.22,y=r*sy+sy*.2,w=sx*.56,h=sy*.62;
    A.fillStyle='rgba(0,0,0,.18)';A.fillRect(x-1,y-1,w+2,h+2);
    A.fillStyle=win;A.fillRect(x,y,w,h);
    A.fillStyle='rgba(255,255,255,.22)';A.fillRect(x-1,y+h+1,w+2,1.5);
    if(rnd()<p){var k=Math.floor(rnd()*3);B.fillStyle=k===0?'#ffd58a':k===1?'#ffbf6a':'#fff0cf';B.fillRect(x,y,w,h)}
  }
  var t1=new THREE.CanvasTexture(a),t2=new THREE.CanvasTexture(b);
  t1.anisotropy=8;t2.anisotropy=8;
  return {map:t1,emap:t2};
}
function mesh(geo,m,x,y,z,parent){var o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;(parent||scene).add(o);return o}
function box(w,h,d,m,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent)}
function cyl(rt,rb,h,seg,m,x,y,z,parent){return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m,x,y,z,parent)}
function strut(a,b,r,m,parent){
  var v=new THREE.Vector3().subVectors(b,a),len=v.length();
  var o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),m);
  o.position.copy(a).addScaledVector(v,0.5);o.castShadow=true;
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  (parent||scene).add(o);return o;
}

/* ---------- point-light lists ---------- */
var lampL=[],beaconL=[],xmasL=[];
var XC=[[1,.78,.45],[1,.16,.12],[.2,1,.35],[.3,.55,1],[1,.95,.85],[1,.7,.15]];
function addLamp(x,y,z,c){lampL.push({p:[x,y,z],c:c||[1,.74,.4],s:1.5,b:0,ph:rnd()})}
function addBeacon(x,y,z){beaconL.push({p:[x,y,z],c:[1,.1,.08],s:1.6,b:1,ph:rnd()})}
function addXmas(x,y,z,list,s){var c=XC[Math.floor(rnd()*XC.length)];(list||xmasL).push({p:[x,y,z],c:c,s:s||0.85,b:2,ph:rnd()})}
function lineXmas(a,b,step,list){
  var d=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),n=Math.max(1,Math.round(d/step));
  for(var i=0;i<=n;i++){var t=i/n;addXmas(lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t),list)}
}
function ptsGeo(list){
  var n=list.length,P=new Float32Array(n*3),C=new Float32Array(n*3),S=new Float32Array(n),B=new Float32Array(n),H=new Float32Array(n);
  for(var i=0;i<n;i++){var q=list[i];P[i*3]=q.p[0];P[i*3+1]=q.p[1];P[i*3+2]=q.p[2];C[i*3]=q.c[0];C[i*3+1]=q.c[1];C[i*3+2]=q.c[2];S[i]=q.s;B[i]=q.b;H[i]=q.ph}
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  g.setAttribute('aCol',new THREE.BufferAttribute(C,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(S,1));
  g.setAttribute('aBlink',new THREE.BufferAttribute(B,1));
  g.setAttribute('aPh',new THREE.BufferAttribute(H,1));
  return g;
}
var POINT_VS=[
'attribute vec3 aCol;attribute float aSize;attribute float aBlink;attribute float aPh;',
'uniform float uTime;uniform float uScale;uniform float uPR;uniform float uAmt;',
'varying vec3 vC;varying float vA;varying float vD;',
'void main(){',
' vec4 mv=modelViewMatrix*vec4(position,1.0);',
' float bl=1.0;',
' if(aBlink>1.5){bl=0.55+0.45*sin(uTime*2.4+aPh*30.0);}',
' else if(aBlink>0.5){bl=step(fract(uTime*0.6+aPh),0.35);}',
' vA=uAmt*bl;vC=aCol;vD=-mv.z;',
' gl_PointSize=max(aSize*uScale/max(-mv.z,1.0),1.5*uPR);',
' gl_Position=projectionMatrix*mv;',
'}'].join('\n');
var POINT_FS=[
'precision highp float;varying vec3 vC;varying float vA;varying float vD;',
'uniform float uFogNear;uniform float uFogFar;',
'void main(){',
' float d=length(gl_PointCoord-0.5)*2.0;',
' float core=clamp(1.0-d,0.0,1.0);',
' float a=pow(core,2.0)+smoothstep(0.35,0.0,d)*0.6;',
' float fg=1.0-0.8*smoothstep(uFogNear,uFogFar,vD);',
' gl_FragColor=vec4(vC*vA*fg*1.5,a);',
'}'].join('\n');
function pointMat(){
  return new THREE.ShaderMaterial({uniforms:uni({uAmt:{value:0}}),vertexShader:POINT_VS,fragmentShader:POINT_FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
}
var lampMat=pointMat(),beaconMat=pointMat(),xmasMat=pointMat();

/* ---------- ground (street tiles), embankments ---------- */
function groundTex(){
  var c=document.createElement('canvas');c.width=c.height=512;var g=c.getContext('2d');
  g.fillStyle='#7d7b77';g.fillRect(0,0,512,512);
  for(var i=0;i<2600;i++){g.fillStyle='rgba('+(rnd()<.5?'0,0,0':'255,255,255')+','+(rnd()*.05)+')';g.fillRect(rnd()*512,rnd()*512,1+rnd()*3,1+rnd()*3)}
  var rw=170;
  g.fillStyle='#2e2f33';g.fillRect(0,256-rw/2,512,rw);g.fillRect(256-rw/2,0,rw,512);
  g.fillStyle='#8a8882';
  [0,1].forEach(function(k){});
  for(var i2=0;i2<3000;i2++){g.fillStyle='rgba('+(rnd()<.5?'0,0,0':'255,255,255')+','+(rnd()*.06)+')';g.fillRect(rnd()*512,rnd()*512,1+rnd()*2,1+rnd()*2)}
  g.fillStyle='rgba(235,225,180,.85)';
  for(var x=8;x<512;x+=44){if(Math.abs(x-256)>rw/2+4){g.fillRect(x,254,24,4);g.fillRect(254,x,4,24)}}
  g.fillStyle='rgba(255,255,255,.7)';
  for(var k=0;k<7;k++){var o=256-rw/2+8+k*21;g.fillRect(o,256-rw/2-22,12,18);g.fillRect(o,256+rw/2+4,12,18);g.fillRect(256-rw/2-22,o,18,12);g.fillRect(256+rw/2+4,o,18,12)}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(180,180);t.offset.set(.5,.5);t.anisotropy=8;
  return t;
}
var groundMat=new THREE.MeshStandardMaterial({color:0xffffff,map:groundTex(),roughness:.92,metalness:0});
groundMat.envMapIntensity=.8;
groundMat.onBeforeCompile=function(sh){
  sh.uniforms.uSnow=U.uSnow;sh.uniforms.uRain=U.uRain;
  sh.fragmentShader='uniform float uSnow;uniform float uRain;\n'+sh.fragmentShader
   .replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.26,0.25,0.25),smoothstep(120.0,260.0,length(vViewPosition)));\n diffuseColor.rgb=mix(diffuseColor.rgb*(1.0-0.3*uRain),vec3(0.9,0.93,0.98),uSnow*0.93);')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,0.22,uRain*(1.0-uSnow));');
  vgInject(sh);
};
var ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
var wall=mat(0x77777c,{snow:true,r:.9});
box(900,1.6,1.7,wall,0,0.8,-(RW+.3));box(900,1.6,1.7,wall,0,0.8,RW+.3);
box(900,.25,6,mat(0x8d8b86,{snow:true}),0,.125,-(RW+3.6));box(900,.25,6,mat(0x8d8b86,{snow:true}),0,.125,RW+3.6);

/* ---------- river ---------- */
var reflRT=null,reflCam=new THREE.PerspectiveCamera();
var water=new THREE.Mesh(new THREE.PlaneGeometry(2600,RW*2+.6),new THREE.ShaderMaterial({
  uniforms:uni({uRefl:{value:null},uTexM:{value:new THREE.Matrix4()},uUseRefl:{value:0}}),
  vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:[
  'precision highp float;varying vec3 vW;',
  'uniform sampler2D uRefl;uniform mat4 uTexM;uniform float uUseRefl;',
  'uniform float uTime;uniform float uLit;uniform float uNight;uniform float uRain;uniform float uSunVis;uniform float uFogNear;uniform float uFogFar;',
  'uniform vec3 uHor;uniform vec3 uMid;uniform vec3 uTop;uniform vec3 uSkyCol;uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uMoonDir;uniform vec3 uFogColor;',
  VG_UNI,VG_FN,GLC,
  'float ripples(vec2 p,float t){vec2 q=p*0.9;vec2 g=floor(q);vec2 f=fract(q)-0.5;float h=hash(g);float ph=fract(t*0.7+h);float r=ph*0.5;vec2 off=(vec2(hash(g+1.3),hash(g+2.7))-0.5)*0.4;float dd=abs(length(f-off)-r);return smoothstep(0.05,0.0,dd)*(1.0-ph)*step(h,0.65);}',
  'void main(){',
  ' vec3 V=normalize(cameraPosition-vW);',
  ' vec2 p=vW.xz*vec2(0.22,0.5);',
  ' float n1=noise(p+vec2(uTime*0.12,0.0));float n2=noise(p*2.7-vec2(uTime*0.1,uTime*0.17));float n3=noise(p*7.0+vec2(uTime*0.3,0.0));',
  ' vec3 N0=normalize(vec3((n1-0.5)*0.28+(n2-0.5)*0.22,1.0,(n2-0.5)*0.3));',
  ' vec3 N=normalize(N0+vec3((n3-0.5)*0.05,0.0,(n3-0.5)*0.05));',
  ' vec3 R=reflect(-V,N);R.y=abs(R.y);',
  ' float fres=pow(1.0-max(V.y,0.0),4.0)*0.85+0.12;',
  ' vec3 sk=mix(uHor,uMid,smoothstep(0.0,0.4,R.y));sk=mix(sk,uTop,smoothstep(0.3,0.9,R.y));',
  ' vec4 rp=uTexM*vec4(vW,1.0);',
  ' vec2 ruv=rp.xy/rp.w+vec2(N0.x,N0.z)*0.022;ruv=clamp(ruv,0.002,0.998);',
  ' vec3 rc=texture2D(uRefl,ruv).rgb;',
  ' vec3 refl=mix(sk,rc,uUseRefl);',
  ' float L=dot(uSkyCol,vec3(0.33));',
  ' vec3 deep=vec3(0.24,0.18,0.11)*(0.35+L*1.3);',
  ' vec3 col=mix(deep,refl*vec3(0.85,0.8,0.72),clamp(fres*0.8,0.0,1.0));',
  ' col+=uSunCol*pow(max(dot(R,uSunDir),0.0),160.0)*4.0*uSunVis*(1.0-uRain*0.8);',
  ' col+=vec3(0.8,0.88,1.0)*pow(max(dot(R,uMoonDir),0.0),200.0)*2.0*uNight*(1.0-uRain*0.8);',
  ' col+=vec3(0.7,0.8,0.9)*ripples(vW.xz,uTime)*uRain*0.4;',
  ' float dist=length(cameraPosition-vW);',
  ' if(uVG>0.001){vec3 pv=vgSample(vec4(vW,1.0));if(pv.r>=0.0){vec3 pl=pv*0.55;col=mix(col,pl*(0.8+0.4*fres),uVG*0.9);}}',
  ' col=mix(col,uFogColor,smoothstep(uFogNear,uFogFar,dist));',
  ' gl_FragColor=vec4(col,1.0);',
  '}'].join('\n')
}));
water.rotation.x=-Math.PI/2;water.position.y=0.12;scene.add(water);

/* ---------- city blocks ---------- */
var blocked=CITY.blocked;
var inst=[],beaconSpots=[];
(function(){
  var cs=6.4;
  for(var x=-200;x<=170;x+=cs){
    for(var side=-1;side<=1;side+=2){
      for(var row=0;row<27;row++){
        var z=side*(ROW0+row*cs);
        if(rnd()<0.04)continue;
        var w=3.6+rnd()*2.4,d=3.6+rnd()*2.4;
        var cx=x+(rnd()-.5)*.8,cz=z+(rnd()-.5)*.8;
        if(blocked(cx,cz,Math.max(w,d)/2))continue;
        var cityF=Math.exp(-Math.pow((x-5)/80,2))*(1-Math.abs(z)/240);
        var nearCam=sstep(60,130,x);         /* keep the foreground low so the skyline stays visible */
        var r=rnd();
        var h=5+Math.pow(r,3.2)*(20*cityF+7)+(r>0.985?16*cityF:0);
        h*=lerp(1,0.5,nearCam);if(side>0&&x>40)h*=0.65;
        if(row===0)h=Math.min(h,lerp(24,14,nearCam));
        var R=rnd(),top=h;
        if(h>19&&rnd()<0.7){
          var h1=h*(0.5+rnd()*0.16);
          inst.push([cx,0,cz,w,h1,d,R,0]);
          var tw=w*(0.62+rnd()*0.15),td=d*(0.62+rnd()*0.15);
          inst.push([cx+(rnd()-.5)*(w-tw)*.6,h1,cz+(rnd()-.5)*(d-td)*.6,tw,h-h1,td,rnd(),0]);
          w=tw;d=td;
        }else inst.push([cx,0,cz,w,h,d,R,0]);
        var nc=1+Math.floor(rnd()*3);
        for(var k=0;k<nc;k++){
          var cw=.8+rnd()*2,ch=.5+rnd()*1.4,cd=.8+rnd()*2;
          inst.push([cx+(rnd()-.5)*Math.max(w-cw-.8,0),top,cz+(rnd()-.5)*Math.max(d-cd-.8,0),cw,ch,cd,rnd(),1]);
        }
        if(top>33)beaconSpots.push([cx,top+0.5,cz]);
      }
    }
  }
})();
(function(){
  for(var x=-340;x<=340;x+=8.5)for(var z=-340;z<=340;z+=8.5){
    if(Math.abs(z)<RW+8)continue;
    if(x>-210&&x<178&&Math.abs(z)<ROW0+27*6.4-4)continue;
    if(rnd()<0.1)continue;
    var w=5+rnd()*3,d=5+rnd()*3,h=6+Math.pow(rnd(),2.5)*18;
    inst.push([x+(rnd()-.5),0,z+(rnd()-.5),w,h,d,rnd(),0]);
  }
})();
var bGeo=new THREE.BoxGeometry(1,1,1);bGeo.translate(0,0.5,0);
var bMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.92,metalness:0});
bMat.envMapIntensity=.85;
bMat.extensions={derivatives:true};
bMat.onBeforeCompile=function(sh){
  sh.uniforms.uLit=U.uLit;sh.uniforms.uSnow=U.uSnow;sh.uniforms.uRain=U.uRain;sh.uniforms.uXmas=U.uXmas;
  sh.vertexShader='attribute float aRand;attribute float aKind;varying float vRand;varying float vKind;varying vec3 vLocal;varying vec3 vSize;varying vec3 vObjN;varying vec3 vWp;\n'+
   sh.vertexShader.replace('#include <begin_vertex>',[
   '#include <begin_vertex>',
   'vRand=aRand;vKind=aKind;vLocal=position;vObjN=normal;',
   'vSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));',
   'vWp=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;'].join('\n'));
  var fsHead=['varying float vRand;varying float vKind;varying vec3 vLocal;varying vec3 vSize;varying vec3 vObjN;varying vec3 vWp;',
   'uniform float uLit;uniform float uSnow;uniform float uRain;uniform float uXmas;',
   'float gWin=0.0;vec3 gEm=vec3(0.0);',GLC].join('\n');
  var facadeCode=[
  '#include <color_fragment>',
  '{',
  ' vec3 n0=normalize(vObjN);float R=vRand;',
  ' float side=1.0-step(0.5,abs(n0.y));',
  ' float isX=step(0.5,abs(n0.x));',
  ' float W=mix(vSize.x,vSize.z,isX);',
  ' float u=(isX>0.5?vLocal.z*vSize.z:vLocal.x*vSize.x)+0.5*W;',
  ' float v=vLocal.y*vSize.y;',
  ' float topDist=vSize.y-v;',
  ' float topAbs=vWp.y+topDist;',
  ' float ty=fract(R*13.7);',
  ' float gl=step(24.0,topAbs)*step(0.38,ty);',
  ' float clutter=step(0.5,vKind);',
  ' vec3 brick=mix(vec3(0.42,0.26,0.20),vec3(0.33,0.22,0.18),fract(R*5.1));',
  ' vec3 stone=mix(vec3(0.62,0.57,0.48),vec3(0.50,0.47,0.42),fract(R*9.3));',
  ' vec3 conc=mix(vec3(0.42,0.43,0.45),vec3(0.31,0.32,0.35),fract(R*3.9));',
  ' vec3 base=ty<0.26?brick:(ty<0.6?stone:conc);',
  ' base=mix(base,vec3(0.42,0.44,0.47)*(0.8+0.4*R),clutter);',
  ' float px=fwidth(v)+fwidth(u);',
  ' float fineFade=1.0-smoothstep(0.08,0.3,px);',
  ' float brickLn=step(0.5,fract(vWp.y*3.4));',
  ' vec3 wallC=base*(0.94+0.12*hash(floor(vec2(u*2.5,v*3.4))*fineFade))*(1.0-0.05*brickLn*step(ty,0.26)*fineFade);',
  ' float edgeD=min(u,W-u);',
  ' wallC*=0.84+0.16*smoothstep(0.0,0.7,edgeD);',
  ' wallC*=1.0+0.28*smoothstep(0.9,0.15,topDist)*step(0.0,topDist)*(1.0-clutter);',
  ' float ao=mix(0.55,1.0,smoothstep(0.0,7.0,vWp.y));',
  ' float fh=3.1;',
  ' float rowF=(v-4.3)/fh;float rowI=floor(rowF);float fy=fract(rowF);',
  ' float cellW=mix(1.5,2.3,fract(R*17.3));',
  ' float cols=max(1.0,floor((W-1.2)/cellW));float cw=(W-1.2)/cols;',
  ' float uu=u-0.6;float colF=uu/cw;float colI=floor(colF);float fx=fract(colF);',
  ' float inU=step(0.0,uu)*step(uu,W-1.2);',
  ' float upper=step(0.0,rowF)*step(v,vSize.y-1.0)*side*inU*(1.0-clutter);',
  ' float wx=smoothstep(0.14,0.19,fx)*smoothstep(0.86,0.81,fx);',
  ' float wy=smoothstep(0.2,0.25,fy)*smoothstep(0.82,0.77,fy);',
  ' wx=mix(wx,step(0.04,fx)*step(fx,0.96),gl);wy=mix(wy,step(0.1,fy)*step(fy,0.9),gl);',
  ' float winMask=wx*wy*upper;',
  ' vec2 id=vec2(colI,rowI)+R*91.7+isX*7.0;',
  ' float hc=hash(id);',
  ' float on=step(hc,uLit*0.78*(1.0-0.25*gl));',
  ' vec3 warm=mix(vec3(1.0,0.76,0.42),vec3(0.82,0.9,1.0),step(0.82,hash(id+3.1)))*(0.7+0.6*hash(id+9.0));',
  ' float hx=hash(id+5.5);',
  ' vec3 fc=hx<0.25?vec3(1.0,0.2,0.15):(hx<0.5?vec3(0.2,0.9,0.35):(hx<0.75?vec3(1.0,0.8,0.45):vec3(0.35,0.55,1.0)));',
  ' vec3 emis=mix(warm,fc,uXmas*step(0.62,hash(id+8.8)));',
  ' float shopV=step(0.4,v)*step(v,3.5);',
  ' float sf=fract((u-0.5)/2.6);float shopU=step(0.07,sf)*step(sf,0.93)*step(0.5,u)*step(u,W-0.5);',
  ' float shopMask=shopV*shopU*side*(1.0-clutter)*(1.0-gl);',
  ' float shopOn=step(hash(vec2(floor((u-0.5)/2.6),R*50.0)),uLit*0.9);',
  ' vec3 shopC=mix(vec3(1.0,0.82,0.5),vec3(0.9,0.95,1.0),step(0.7,hash(vec2(R,floor((u-0.5)/2.6)))));',
  ' float vis=1.0-smoothstep(0.12,0.42,px);',
  ' float roof=smoothstep(0.5,0.9,n0.y);',
  ' float snowSide=side*step(topDist,0.7+1.6*hash(vec2(floor(u*1.2),R*17.0)));',
  ' float snowAmt=uSnow;',
  ' vec3 glassDark=mix(vec3(0.05,0.07,0.1),vec3(0.17,0.24,0.3),gl);',
  ' vec3 col=wallC*ao;',
  ' col=mix(col,glassDark*(0.8+0.4*hash(id)),winMask*vis*(1.0-snowSide*snowAmt));',
  ' col=mix(col,vec3(0.07,0.08,0.1),shopMask*vis);',
  ' float farMix=1.0-vis;',
  ' col=mix(col,wallC*ao*mix(0.7,0.55,gl),farMix*upper);',
  ' gEm=emis*1.15*on*winMask*vis*(1.0-snowSide*snowAmt)+shopC*0.85*shopOn*shopMask*vis;',
  ' gEm+=emis*uLit*0.22*farMix*upper;',
  ' vec2 hq=abs(vLocal.xz)*vSize.xz;vec2 hs=0.5*vSize.xz;float eD=min(hs.x-hq.x,hs.y-hq.y);',
  ' vec3 roofC=mix(vec3(0.20,0.21,0.23),vec3(0.31,0.27,0.24),step(0.7,fract(R*7.7)))*(0.75+0.5*hash(floor(vWp.xz*1.3)));',
  ' roofC=mix(base*0.85,roofC,smoothstep(0.22,0.34,eD));',
  ' col=mix(col,roofC,roof);',
  ' float sn=max(roof,snowSide*0.88)*snowAmt;',
  ' col=mix(col,vec3(0.93,0.96,1.0)*(0.94+0.06*hash(floor(vWp.xz*3.0))),sn);',
  ' col*=1.0-0.22*uRain;',
  ' gWin=winMask*vis*(1.0-snowSide*snowAmt)+shopMask*vis*0.6;',
  ' diffuseColor.rgb=col;',
  '}'].join('\n');
  sh.fragmentShader=fsHead+'\n'+sh.fragmentShader
    .replace('#include <color_fragment>',facadeCode)
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,0.1,gWin);roughnessFactor=mix(roughnessFactor,max(roughnessFactor*0.5,0.2),uRain);')
    .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n metalnessFactor=gWin*0.6;')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=gEm;');
  vgInject(sh);
};
var cityMesh=new THREE.InstancedMesh(bGeo,bMat,inst.length);
(function(){
  var o=new THREE.Object3D(),R=new Float32Array(inst.length),K=new Float32Array(inst.length);
  for(var i=0;i<inst.length;i++){var c=inst[i];o.position.set(c[0],c[1],c[2]);o.scale.set(c[3],c[4],c[5]);o.updateMatrix();cityMesh.setMatrixAt(i,o.matrix);R[i]=c[6];K[i]=c[7]}
  bGeo.setAttribute('aRand',new THREE.InstancedBufferAttribute(R,1));
  bGeo.setAttribute('aKind',new THREE.InstancedBufferAttribute(K,1));
  cityMesh.frustumCulled=false;cityMesh.castShadow=true;cityMesh.receiveShadow=true;scene.add(cityMesh);
})();
beaconSpots.forEach(function(b){addBeacon(b[0],b[1],b[2])});

/* ---------- trees along the embankments ---------- */
(function(){
  var pos=[];
  for(var side=-1;side<=1;side+=2)for(var x=-195;x<=165;x+=3.1){pos.push([x+(rnd()-.5)*1.6,side*(RW+7.0+(rnd()-.5)*3.2),1.2+rnd()*.9])}
  var trunkG=new THREE.CylinderGeometry(.22,.32,3,6);trunkG.translate(0,1.5,0);
  var crownG=new THREE.IcosahedronGeometry(1,3);
  (function(){var p=crownG.attributes.position,v=new THREE.Vector3();
    for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var n=Math.sin(v.x*5.1+v.y*3.7)*Math.cos(v.z*4.3+v.x*2.1)*.12+Math.sin(v.y*9.0+v.z*7.0)*.05;v.multiplyScalar(1+n);p.setXYZ(i,v.x,v.y,v.z)}
    crownG.computeVertexNormals();})();
  var trunks=new THREE.InstancedMesh(trunkG,new THREE.MeshStandardMaterial({color:0x3b2a1e,roughness:1}),pos.length);
  var crownM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
  crownM.onBeforeCompile=function(sh){sh.uniforms.uSnow=U.uSnow;sh.fragmentShader='uniform float uSnow;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.92,0.95,1.0),uSnow*0.7);');vgInject(sh)};
  var crowns=new THREE.InstancedMesh(crownG,crownM,pos.length);
  var pal=[0x3d5a2a,0x4a6a30,0x35502a,0x56703a,0x2f4a26,0x6b7a3a],o=new THREE.Object3D(),col=new THREE.Color();
  pos.forEach(function(p,i){
    o.position.set(p[0],0,p[1]);o.scale.set(1,p[2]/2,1);o.rotation.y=rnd()*6;o.updateMatrix();trunks.setMatrixAt(i,o.matrix);
    var s=p[2]*1.25;o.position.set(p[0],2.6+s*.7,p[1]);o.scale.set(s,s*.85,s);o.updateMatrix();crowns.setMatrixAt(i,o.matrix);
    crowns.setColorAt(i,col.setHex(pal[Math.floor(rnd()*pal.length)]).multiplyScalar(.85+rnd()*.3));
  });
  trunks.castShadow=crowns.castShadow=true;trunks.receiveShadow=crowns.receiveShadow=true;
  trunks.frustumCulled=crowns.frustumCulled=false;scene.add(trunks);scene.add(crowns);
})();

var eye={wheel:null,pods:[],podMats:[]};var eyeXmasL=[];
/* ---------- city landmarks (cities/*.js) ---------- */
var CITYX=CITY.build({THREE:THREE,scene:scene,rnd:rnd,RW:RW,ROW0:ROW0,blocked:blocked,facade:facade,mat:mat,box:box,cyl:cyl,mesh:mesh,strut:strut,
  addBeacon:addBeacon,addLamp:addLamp,addXmas:addXmas,lineXmas:lineXmas,xmasL:xmasL,eye:eye,eyeXmasL:eyeXmasL});

/* ---------- boats ---------- */
var boats=[];
(function(){
  var hullM=mat(0x23303f,{r:.6,m:.2}),whiteM=mat(0xe9edf2,{r:.5});
  for(var i=0;i<7;i++){
    var g=new THREE.Group(),big=i<3,L=big?11:6.5,Wd=big?3.2:2.1;
    var cabM=mat(0xf2f4f7,{e:0xffd9a0,k:.9,r:.4});
    box(L,1.1,Wd,hullM,0,.55,0,g);
    cyl(0,Wd/2,2.6,4,hullM,L/2+1.1,.55,0,g).rotation.z=-Math.PI/2;
    box(L*.72,1.5,Wd*.82,cabM,-L*.05,1.85,0,g);
    box(L*.76,.22,Wd*.9,whiteM,-L*.05,2.7,0,g);
    var lights=[];
    for(var k=0;k<(big?7:4);k++){var lx=-L/2+1+k*(L-2)/(big?6:3);lights.push({p:[lx,2.85,0],c:XC[k%XC.length],s:.9,b:2,ph:rnd()})}
    var pts=new THREE.Points(ptsGeo(lights),xmasMat);pts.frustumCulled=false;g.add(pts);
    var dirn=i%2?1:-1;
    g.position.set(-230+rnd()*460,0.1,(i%2?1:-1)*(5+rnd()*17));g.rotation.y=dirn>0?0:Math.PI;
    scene.add(g);
    boats.push({g:g,sp:dirn*(2.2+rnd()*2.6)*(big?.8:1.2),bob:rnd()*6,cab:cabM});
  }
})();

/* ---------- finalise point layers ---------- */
var lampPts=new THREE.Points(ptsGeo(lampL),lampMat);lampPts.frustumCulled=false;scene.add(lampPts);
var beaconPts=new THREE.Points(ptsGeo(beaconL),beaconMat);beaconPts.frustumCulled=false;scene.add(beaconPts);
var xmasPts=new THREE.Points(ptsGeo(xmasL),xmasMat);xmasPts.frustumCulled=false;scene.add(xmasPts);
var eyeXmas=new THREE.Points(ptsGeo(eyeXmasL),xmasMat);eyeXmas.frustumCulled=false;eye.wheel.add(eyeXmas);

/* ---------- cars ---------- */
var carPts;
(function(){
  var N=300,P=new Float32Array(N*3),C=new Float32Array(N*3),Sp=new Float32Array(N),Ph=new Float32Array(N);
  var lanes=[-(RW+2.3),-(RW+3.4),RW+2.3,RW+3.4];
  for(var i=0;i<N;i++){
    var lane=lanes[i%4],fwd=lane<0?(i%2?1:-1):(i%2?-1:1);
    P[i*3]=0;P[i*3+1]=0.7;P[i*3+2]=lane+(rnd()-.5)*.3;
    var head=fwd>0;C[i*3]=1;C[i*3+1]=head?.95:.1;C[i*3+2]=head?.8:.08;
    Sp[i]=fwd*(5+rnd()*5);Ph[i]=rnd()*340;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  g.setAttribute('aCol',new THREE.BufferAttribute(C,3));
  g.setAttribute('aSp',new THREE.BufferAttribute(Sp,1));
  g.setAttribute('aPh',new THREE.BufferAttribute(Ph,1));
  carPts=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:uni({uAmt:{value:0}}),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:[
    'attribute vec3 aCol;attribute float aSp;attribute float aPh;uniform float uTime;uniform float uScale;uniform float uPR;uniform float uAmt;',
    'varying vec3 vC;varying float vA;varying float vD;',
    'void main(){',
    ' vec3 p=position;p.x=mod(aPh+uTime*aSp,340.0)-170.0;',
    ' vec4 mv=modelViewMatrix*vec4(p,1.0);vC=aCol;vA=uAmt;vD=-mv.z;',
    ' gl_PointSize=max(0.9*uScale/max(-mv.z,1.0),1.5*uPR);gl_Position=projectionMatrix*mv;}'].join('\n'),
    fragmentShader:POINT_FS}));
  carPts.frustumCulled=false;scene.add(carPts);
})();

/* ---------- rain ---------- */
var rain;
(function(){
  var N=9000,P=new Float32Array(N*6),E=new Float32Array(N*2),S=new Float32Array(N*2);
  for(var i=0;i<N;i++){
    var x=rnd(),y=rnd(),z=rnd(),s=rnd();
    for(var k=0;k<2;k++){P[(i*2+k)*3]=x;P[(i*2+k)*3+1]=y;P[(i*2+k)*3+2]=z;E[i*2+k]=k;S[i*2+k]=s}
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  g.setAttribute('aEnd',new THREE.BufferAttribute(E,1));
  g.setAttribute('aSp',new THREE.BufferAttribute(S,1));
  rain=new THREE.LineSegments(g,new THREE.ShaderMaterial({uniforms:uni({uCenter:{value:new THREE.Vector3()},uBox:{value:new THREE.Vector3(150,90,150)}}),transparent:true,depthWrite:false,
    vertexShader:[
    'attribute float aEnd;attribute float aSp;uniform vec3 uCenter;uniform vec3 uBox;uniform float uTime;uniform float uRain;varying float vA;',
    'void main(){',
    ' vec3 p=position*uBox;',
    ' p.y=mod(p.y-uTime*(48.0+aSp*22.0),uBox.y);',
    ' p.x=mod(p.x+uTime*4.0,uBox.x);',
    ' p+=normalize(vec3(0.12,1.0,0.04))*aEnd*1.7;',
    ' vec3 w=uCenter+p-uBox*0.5;',
    ' vA=0.42*(1.0-aEnd*0.9)*uRain;',
    ' gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}'].join('\n'),
    fragmentShader:'precision highp float;varying float vA;uniform float uNight;void main(){vec3 c=mix(vec3(0.66,0.74,0.86),vec3(0.5,0.6,0.8),uNight);gl_FragColor=vec4(c,vA);}'}));
  rain.frustumCulled=false;rain.visible=false;scene.add(rain);
})();

/* ---------- snow ---------- */
var snow;
(function(){
  var N=7000,P=new Float32Array(N*3),S=new Float32Array(N);
  for(var i=0;i<N;i++){P[i*3]=rnd();P[i*3+1]=rnd();P[i*3+2]=rnd();S[i]=rnd()}
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  g.setAttribute('aS',new THREE.BufferAttribute(S,1));
  snow=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:uni({uCenter:{value:new THREE.Vector3()},uBox:{value:new THREE.Vector3(150,90,150)}}),transparent:true,depthWrite:false,
    vertexShader:[
    'attribute float aS;uniform vec3 uCenter;uniform vec3 uBox;uniform float uTime;uniform float uScale;uniform float uPR;uniform float uSnow;varying float vA;',
    'void main(){',
    ' float sp=0.8+aS*0.9;vec3 p=position*uBox;',
    ' p.y=mod(p.y-uTime*sp*3.2,uBox.y);',
    ' p.x=mod(p.x+sin(uTime*0.5*sp+aS*50.0)*2.0+uTime*1.2,uBox.x);',
    ' p.z=mod(p.z+cos(uTime*0.4*sp+aS*30.0)*2.0,uBox.z);',
    ' vec3 w=uCenter+p-uBox*0.5;',
    ' vec4 mv=viewMatrix*vec4(w,1.0);',
    ' gl_PointSize=max((0.2+aS*0.24)*uScale/max(-mv.z,1.0),1.6*uPR);',
    ' vA=0.9*uSnow;gl_Position=projectionMatrix*mv;}'].join('\n'),
    fragmentShader:'precision highp float;varying float vA;uniform float uNight;void main(){float d=length(gl_PointCoord-0.5)*2.0;float a=smoothstep(1.0,0.2,d)*vA;vec3 c=mix(vec3(0.95,0.97,1.0),vec3(0.62,0.7,0.9),uNight*0.6);gl_FragColor=vec4(c,a);}'}));
  snow.frustumCulled=false;snow.visible=false;scene.add(snow);
})();

/* ---------- fireworks (CPU particles) ---------- */
var FN=4200,fPos=new Float32Array(FN*3),fCol=new Float32Array(FN*3),fA=new Float32Array(FN),fS=new Float32Array(FN);
var fVel=new Float32Array(FN*3),fLife=new Float32Array(FN),fMax=new Float32Array(FN),fKind=new Uint8Array(FN),fTy=new Float32Array(FN),fPtr=0;
var fGeo=new THREE.BufferGeometry();
var fPA=new THREE.BufferAttribute(fPos,3),fCA=new THREE.BufferAttribute(fCol,3),fAA=new THREE.BufferAttribute(fA,1),fSA=new THREE.BufferAttribute(fS,1);
[fPA,fCA,fAA,fSA].forEach(function(a){a.setUsage(THREE.DynamicDrawUsage)});
fGeo.setAttribute('position',fPA);fGeo.setAttribute('aCol',fCA);fGeo.setAttribute('aAlpha',fAA);fGeo.setAttribute('aSize',fSA);
var fire=new THREE.Points(fGeo,new THREE.ShaderMaterial({uniforms:uni(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'attribute vec3 aCol;attribute float aAlpha;attribute float aSize;uniform float uScale;uniform float uPR;varying vec3 vC;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vC=aCol;vA=aAlpha;gl_PointSize=max(aSize*uScale/max(-mv.z,1.0),1.5*uPR);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'precision highp float;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-0.5)*2.0;float core=clamp(1.0-d,0.0,1.0);float a=pow(core,2.0)+smoothstep(0.4,0.0,d)*0.7;gl_FragColor=vec4(vC*vA*1.6,a);}'}));
fire.frustumCulled=false;fire.visible=false;scene.add(fire);
for(var fi=0;fi<FN;fi++)fPos[fi*3+1]=-999;
function fSpawn(x,y,z,vx,vy,vz,r,g,b,life,size,kind,ty){
  var i=fPtr;fPtr=(fPtr+1)%FN;
  fPos[i*3]=x;fPos[i*3+1]=y;fPos[i*3+2]=z;fVel[i*3]=vx;fVel[i*3+1]=vy;fVel[i*3+2]=vz;
  fCol[i*3]=r;fCol[i*3+1]=g;fCol[i*3+2]=b;fLife[i]=1;fMax[i]=life;fS[i]=size;fKind[i]=kind;fTy[i]=ty||0;fA[i]=1;
}
function hsl(h,s,l){var c=new THREE.Color();c.setHSL(h,s,l);return c}
function explode(x,y,z){
  var h=Math.random(),c1=hsl(h,1,.62),c2=hsl((h+.45)%1,1,.65),type=Math.random(),n=type<.25?90:150;
  var big=type<.25?0:type<.65?1:2;
  for(var i=0;i<n;i++){
    var th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),sp,vx,vy,vz;
    if(big===0){sp=20;vx=Math.cos(th)*sp;vy=(Math.random()-.5)*3;vz=Math.sin(th)*sp}
    else{sp=(big===2?10:16)+Math.random()*(big===2?8:12);vx=Math.sin(ph)*Math.cos(th)*sp;vy=Math.cos(ph)*sp;vz=Math.sin(ph)*Math.sin(th)*sp}
    var c=Math.random()<.5?c1:c2;if(Math.random()<.1)c=new THREE.Color(1,.95,.85);
    fSpawn(x,y,z,vx,vy,vz,c.r,c.g,c.b,big===2?2.8:1.9+Math.random()*.6,big===2?2.4:3.2,0);
  }
}
var nextFire=0;
function updateFire(dt,t,active){
  if(active&&t>nextFire){
    var finale=Math.random()<.12,n=finale?5:1;
    for(var k=0;k<n;k++){
      var x=-70+Math.random()*150,z=-20+Math.random()*40,ty=52+Math.random()*48;
      fSpawn(x,2,z,(Math.random()-.5)*3,52+Math.random()*10,(Math.random()-.5)*3,1,.8,.5,6,1.5,1,ty);
    }
    nextFire=t+(finale?1.8:.45+Math.random()*.8);
  }
  for(var i=0;i<FN;i++){
    if(fLife[i]<=0){fA[i]=0;continue}
    var i3=i*3;
    if(fKind[i]===1){
      fPos[i3]+=fVel[i3]*dt;fPos[i3+1]+=fVel[i3+1]*dt;fPos[i3+2]+=fVel[i3+2]*dt;
      fSpawn(fPos[i3],fPos[i3+1],fPos[i3+2],(Math.random()-.5)*2,-3,(Math.random()-.5)*2,1,.7,.35,.45,1.0,0);
      if(fPos[i3+1]>=fTy[i]){explode(fPos[i3],fPos[i3+1],fPos[i3+2]);fLife[i]=0;fA[i]=0}
      continue;
    }
    var dr=1-1.6*dt;fVel[i3]*=dr;fVel[i3+1]=fVel[i3+1]*dr-11*dt;fVel[i3+2]*=dr;
    fPos[i3]+=fVel[i3]*dt;fPos[i3+1]+=fVel[i3+1]*dt;fPos[i3+2]+=fVel[i3+2]*dt;
    fLife[i]-=dt/fMax[i];
    if(fLife[i]<=0){fA[i]=0;fPos[i3+1]=-999}else fA[i]=Math.pow(fLife[i],1.4);
  }
  fPA.needsUpdate=true;fAA.needsUpdate=true;fCA.needsUpdate=true;fSA.needsUpdate=true;
}

/* ---------- day / night model ---------- */
var KEYS=['top','mid','hor','sun','cloud','amb'];
var KF=[
 [0,'#04070f','#0a1226','#131c33','#000000','#1b2540','#1a2442'],
 [4.6,'#070d1c','#121d3c','#26335a','#000000','#263052','#202c50'],
 [5.7,'#1a2a58','#5a5a8a','#e8825a','#ff8f50','#c9806e','#4a4a70'],
 [6.5,'#3b6db0','#8fb0d8','#ffc088','#ffcc88','#ffd6b0','#8a95b0'],
 [8,'#3f86d0','#8cbde8','#cfe3f2','#fff0d2','#ffffff','#9db4cc'],
 [12,'#2f7fd6','#7db8ea','#c3dff2','#fffbf0','#ffffff','#b4c8dc'],
 [16,'#3a82cc','#86b7de','#dce8f0','#ffeccc','#fff4e4','#a8bcd0'],
 [17.4,'#4a7ab8','#c0a9a6','#ffbf7e','#ffb46e','#ffd0a0','#a0a0b0'],
 [18.2,'#28407a','#a85a78','#ff7a4a','#ff7a45','#ff9a80','#70688a'],
 [19,'#15244f','#4a3a6e','#d0605a','#ff5a3a','#8a5a8a','#4a4670'],
 [19.8,'#0c1634','#1c2a58','#3a4a80','#000000','#34406a','#2e3c64'],
 [21,'#050a1a','#0a1428','#16223c','#000000','#1d2848','#1c2646'],
 [24,'#04070f','#0a1226','#131c33','#000000','#1b2540','#1a2442']
].map(function(r){var o={h:r[0]};KEYS.forEach(function(k,i){o[k]=new THREE.Color(r[i+1])});return o});
var E={};KEYS.forEach(function(k){E[k]=new THREE.Color()});
var tmpC=new THREE.Color(),gray=new THREE.Color();
var fx={snow:0,xmas:0,rain:0,fire:0,fog:0,vg:0},fxT={snow:0,xmas:0,rain:0,fire:0,fog:0,vg:0};
var env={lamp:0,sunUp:1,night:0};
function desat(c,amt,dark){var l=c.r*.3+c.g*.59+c.b*.11;gray.setRGB(l*dark,l*dark,l*dark);c.lerp(gray,amt)}
var lightDirV=new THREE.Vector3();
var fogK=1;
function applyTime(h){
  var i=0;while(i<KF.length-2&&h>=KF[i+1].h)i++;
  var a=KF[i],b=KF[i+1],t0=clamp((h-a.h)/(b.h-a.h),0,1),t=t0*t0*(3-2*t0);
  KEYS.forEach(function(k){E[k].copy(a[k]).lerp(b[k],t)});
  var ang=(h-6)/12*Math.PI,ca=Math.cos(ang),sa=Math.sin(ang);
  var sd=U.uSunDir.value.set(ca,sa*.85,.35).normalize();
  var md=U.uMoonDir.value.set(-.9*ca-.9,-.3*sa,.3).normalize();
  var rain=fx.rain;
  if(rain>0.001){['top','mid','hor','cloud','amb'].forEach(function(k){desat(E[k],rain*.65,.8)})}
  var sunUp=sstep(-.08,.12,sd.y),sunInt=sstep(-.02,.18,sd.y)*(1-.75*rain);
  env.sunUp=sunUp;
  U.uNight.value=1-sstep(-.18,.02,sd.y);env.night=U.uNight.value;
  U.uSunVis.value=sstep(-.14,-.03,sd.y)*(1-.6*rain);
  var lamp=Math.max(1-sstep(-.10,.12,sd.y),rain*.4);env.lamp=lamp;
  U.uLit.value=lamp*.72;
  U.uTop.value.copy(E.top);U.uMid.value.copy(E.mid);U.uHor.value.copy(E.hor);U.uSunCol.value.copy(E.sun);U.uCloudCol.value.copy(E.cloud);
  U.uCloud.value=.42+rain*.55;
  U.uSkyCol.value.copy(E.amb);
  /* directional light: sun by day, moon by night */
  lightDirV.copy(md).lerp(sd,sunUp).normalize();
  if(lightDirV.y<.2){lightDirV.y=.2;lightDirV.normalize()}
  dir.color.copy(E.sun).multiplyScalar(sunInt*1.25);
  tmpC.setRGB(.42,.5,.75).multiplyScalar(.5*(1-sunUp));dir.color.add(tmpC);
  dir.intensity=1;
  dir.position.copy(dir.target.position).addScaledVector(lightDirV,420);
  hemi.color.copy(E.amb);hemi.groundColor.copy(E.amb).multiplyScalar(.5);
  var fogAmt=fx.fog;
  U.uFogColor.value.copy(E.hor).multiplyScalar(.9);
  if(fogAmt>0.001||rain>0.001){var l=E.hor.r*.3+E.hor.g*.59+E.hor.b*.11;gray.setRGB(l*.95+.04,l*.95+.045,l*.95+.05);U.uFogColor.value.lerp(gray,Math.max(fogAmt*.7,rain*.4))}
  U.uFogNear.value=lerp(lerp(90,60,rain),30,fogAmt)*fogK;
  U.uFogFar.value=lerp(lerp(330,280,rain),340,fogAmt)*fogK;
  scene.fog.color.copy(U.uFogColor.value);scene.fog.near=U.uFogNear.value;scene.fog.far=U.uFogFar.value;
  if(fogAmt>0.001){U.uHor.value.lerp(U.uFogColor.value,fogAmt*.9);U.uMid.value.lerp(U.uFogColor.value,fogAmt*.55)}
  nightMats.forEach(function(n){n.m.emissiveIntensity=n.k*lamp});
  if(CITYX&&CITYX.onLamp)CITYX.onLamp(lamp);
  snowMats.forEach(function(s){s.m.color.copy(s.base).lerp(tmpC.setRGB(.9,.93,.98),fx.snow*.55)});
}

/* ---------- post-processing ---------- */
var composer=null,bloom=null,grade=null;
function hasPost(){return typeof THREE.EffectComposer==='function'&&typeof THREE.RenderPass==='function'&&typeof THREE.ShaderPass==='function'&&typeof THREE.UnrealBloomPass==='function'}
function initPost(){
  if(!hasPost())return;
  try{
    var w=window.innerWidth,h=window.innerHeight;
    var rt=null;
    try{rt=new THREE.WebGLMultisampleRenderTarget(w*PR,h*PR,{type:THREE.HalfFloatType,format:THREE.RGBAFormat});rt.samples=QL>=2?4:2}catch(e){rt=null}
    composer=rt?new THREE.EffectComposer(renderer,rt):new THREE.EffectComposer(renderer);
    composer.setPixelRatio(PR);composer.setSize(w,h);
    composer.addPass(new THREE.RenderPass(scene,camera));
    bloom=new THREE.UnrealBloomPass(new THREE.Vector2(w,h),0.4,0.7,0.95);
    composer.addPass(bloom);
    grade=new THREE.ShaderPass({
      uniforms:{tDiffuse:{value:null},uTime:{value:0},uNight:{value:0},uAspect:{value:1},uWarm:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:[
      'precision highp float;uniform sampler2D tDiffuse;uniform float uTime;uniform float uNight;uniform float uAspect;uniform float uWarm;varying vec2 vUv;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}',
      'void main(){',
      ' vec2 d=vUv-0.5;float r2=dot(d,d);vec2 off=d*r2*0.005;',
      ' vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);',
      ' col*=1.05;',
      ' vec3 tm=aces(col*1.08);',
      ' col=mix(col/(1.0+max(col-0.85,0.0)*0.9),tm,0.5);',
      ' float l=dot(col,vec3(0.299,0.587,0.114));',
      ' col=mix(vec3(l),col,1.12);',
      ' col+=vec3(-0.012,0.0,0.024)*(1.0-l)*0.7;',
      ' col*=mix(vec3(1.0),vec3(1.05,1.0,0.94),uWarm);',
      ' float vg=smoothstep(1.0,0.28,length(d*vec2(uAspect,1.0)*1.15));',
      ' col*=mix(0.6,1.0,vg);',
      ' col+=(hash(vUv*vec2(1920.0,1080.0)+fract(uTime)*100.0)-0.5)*0.022;',
      ' gl_FragColor=vec4(col,1.0);',
      '}'].join('\n')});
    composer.addPass(grade);
  }catch(e){composer=null;bloom=null;grade=null;if(window.console)console.warn('post-processing disabled',e)}
}
initPost();

/* ---------- planar reflection for the river ---------- */
function reflOn(){return QL>=2&&!!reflRT}
function initRefl(){
  if(QL<2)return;
  if(reflRT)reflRT.dispose();
  reflRT=new THREE.WebGLRenderTarget(Math.max(64,Math.floor(window.innerWidth*PR*.5)),Math.max(64,Math.floor(window.innerHeight*PR*.5)),{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
  water.material.uniforms.uRefl.value=reflRT.texture;
}
var mV=new THREE.Vector3(),mU=new THREE.Vector3(),mT=new THREE.Vector3(),biasM=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
function renderRefl(){
  var wy=water.position.y;
  camera.updateMatrixWorld();
  reflCam.fov=camera.fov;reflCam.aspect=camera.aspect;reflCam.near=camera.near;reflCam.far=camera.far;reflCam.updateProjectionMatrix();
  var cp=camera.position;
  reflCam.position.set(cp.x,2*wy-cp.y,cp.z);
  camera.getWorldDirection(mV);mT.copy(cp).add(mV);mT.y=2*wy-mT.y;
  mU.set(0,1,0).applyQuaternion(camera.quaternion);mU.y=-mU.y;
  reflCam.up.copy(mU);reflCam.lookAt(mT);reflCam.updateMatrixWorld();
  var m=water.material.uniforms.uTexM.value;
  m.copy(biasM).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  var vw=water.visible,vr=rain.visible,vs=snow.visible;
  water.visible=false;rain.visible=false;snow.visible=false;
  renderer.setRenderTarget(reflRT);renderer.clear();renderer.render(scene,reflCam);renderer.setRenderTarget(null);
  water.visible=vw;rain.visible=vr;snow.visible=vs;
}
initRefl();

/* ---------- camera & input ---------- */
var T=new THREE.Vector3(-28,6,0),Tt=T.clone();
var cam={az:3.02,el:.18,R:128,tAz:3.02,tEl:.18,tR:128,drag:false,lx:0,ly:0,idle:0,base:0};
function baseR(){return window.innerWidth/window.innerHeight<1?220:128}
cam.R=cam.tR=360;cam.az=cam.tAz=1.57;cam.el=cam.tEl=.52;
function resize(){
  var w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.fov=w/h<1?62:44;camera.updateProjectionMatrix();
  U.uScale.value=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));
  if(composer){composer.setPixelRatio(PR);composer.setSize(w,h)}
  initRefl();
  if(grade)grade.uniforms.uAspect.value=w/h;
  var br=baseR();cam.tR=clamp(cam.tR*br/(cam.base||br),br*.4,br*3.2);cam.base=br;
}
window.addEventListener('resize',resize);resize();
canvas.addEventListener('pointerdown',function(e){cam.drag=true;cam.lx=e.clientX;cam.ly=e.clientY;canvas.classList.add('drag');try{canvas.setPointerCapture(e.pointerId)}catch(_){}hideHint()});
canvas.addEventListener('pointermove',function(e){
  if(!cam.drag)return;
  cam.tAz=cam.tAz-(e.clientX-cam.lx)*.004;
  cam.tEl=clamp(cam.tEl+(e.clientY-cam.ly)*.0025,.004,.6);
  cam.lx=e.clientX;cam.ly=e.clientY;
});
function endDrag(){cam.drag=false;canvas.classList.remove('drag')}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('wheel',function(e){e.preventDefault();cam.tR=clamp(cam.tR*(1+e.deltaY*.0012),baseR()*.35,baseR()*3.2);hideHint()},{passive:false});
var pinch=0;
canvas.addEventListener('touchmove',function(e){
  if(e.touches.length===2){
    var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    if(pinch)cam.tR=clamp(cam.tR*pinch/d,baseR()*.35,baseR()*3.2);
    pinch=d;e.preventDefault();
  }
},{passive:false});
canvas.addEventListener('touchend',function(){pinch=0});

/* ---------- UI ---------- */
function localHour(){var d=new Date();return d.getHours()+d.getMinutes()/60}
var S={h:localHour(),playing:!reduce,speed:1,cycle:150,tween:null};
var tm=$('#tm'),clk=$('#clk'),phZh=$('#phZh'),phEn=$('#phEn');
var speeds=[1,4,.25],speedI=0;
(function(){
  var stops=KF.map(function(k){var c=k.mid.clone().lerp(k.hor,.45);return '#'+c.getHexString()+' '+(k.h/24*100).toFixed(1)+'%'});
  document.documentElement.style.setProperty('--track','linear-gradient(90deg,'+stops.join(',')+')');
})();
var PH=[[4.6,'深夜','deep night'],[5.8,'黎明前','before dawn'],[7,'日出','sunrise'],[10,'早晨','morning'],[15,'日間','daytime'],[17.2,'午後','afternoon'],[18.6,'黃昏','golden hour'],[19.8,'藍調時刻','blue hour'],[24.01,'夜晚','night']];
var lastMin=-1;
function updateClock(){
  var m=Math.floor(S.h*60)%1440;if(m===lastMin)return;lastMin=m;
  var hh=Math.floor(m/60),mm=m%60;
  clk.textContent=(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  for(var i=0;i<PH.length;i++){if(S.h<PH[i][0]){phZh.textContent=PH[i][1];phEn.textContent=PH[i][2];break}}
  if(CITYX&&CITYX.onTime)CITYX.onTime(hh,mm);
}
function setPlay(p){S.playing=p;$('#icPause').hidden=!p;$('#icPlay').hidden=p}
setPlay(S.playing);
$('#bPlay').addEventListener('click',function(){S.tween=null;setPlay(!S.playing)});
$('#bSpeed').addEventListener('click',function(){speedI=(speedI+1)%speeds.length;S.speed=speeds[speedI];this.textContent='×'+(S.speed<1?'¼':S.speed)});
tm.addEventListener('input',function(){S.tween=null;S.h=parseFloat(tm.value);setPlay(false);lastMin=-1});
function cityHour(){
  try{
    var ps=new Intl.DateTimeFormat('en-GB',{timeZone:CITY.timeZone,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),H=0,M=0;
    ps.forEach(function(p){if(p.type==='hour')H=+p.value%24;if(p.type==='minute')M=+p.value});
    return H+M/60;
  }catch(e){var d=new Date();return d.getUTCHours()+d.getUTCMinutes()/60}
}
function goTo(h){
  var d=(((h-S.h+12)%24)+24)%24-12;
  S.tween={from:S.h,d:d,t:0};
}
$('#bNow').addEventListener('click',function(){goTo(cityHour());setPlay(true)});
function setFx(name,on){
  if(name==='vg'){$('#pRow').hidden=!on;$('#credit').hidden=!on;if(on&&fxT.vg===0)vgSnap();}
  fxT[name]=on?1:0;
  var b=document.querySelector('.fx[data-fx="'+name+'"]');if(b)b.setAttribute('aria-pressed',on?'true':'false');
}
document.querySelectorAll('.paint').forEach(function(b){b.addEventListener('click',function(){setPaint(+b.getAttribute('data-i'))})});
setPaint(0);
document.querySelectorAll('.fx').forEach(function(b){b.addEventListener('click',function(){var n=b.getAttribute('data-fx');setFx(n,fxT[n]===0)})});
var PRE=CITY.presets;
document.querySelectorAll('.preset').forEach(function(b){b.addEventListener('click',function(){
  var p=PRE[b.getAttribute('data-p')];
  ['snow','xmas','rain','fire','fog','vg'].forEach(function(n){setFx(n,!!p.fx[n])});
  goTo(p.h);setPlay(false);
})});

var VIEWS=CITY.views;
function goView(n){
  var v=VIEWS[n];if(!v)return;
  var f=baseR()/(window.innerWidth/window.innerHeight<1?220:128);
  Tt.set(v.t[0],v.t[1],v.t[2]);
  var d=(v.az-cam.tAz)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;
  cam.tAz=cam.tAz+d;cam.tEl=v.el;cam.tR=v.R*f;
  document.querySelectorAll('.view').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-v')===n?'true':'false')});
}
document.querySelectorAll('.view').forEach(function(b){b.addEventListener('click',function(){goView(b.getAttribute('data-v'));hideHint()})});
function setUI(off){document.body.classList.toggle('ui-off',off);$('#bShow').hidden=!off}
$('#bHide').addEventListener('click',function(){setUI(true)});
$('#bShow').addEventListener('click',function(){setUI(false)});
window.addEventListener('keydown',function(e){
  if(e.target&&e.target.tagName==='INPUT'&&e.key!==' ')return;
  if(e.key==='h'||e.key==='H')setUI(!document.body.classList.contains('ui-off'));
  if(e.key===' '&&!(e.target&&e.target.tagName==='BUTTON')){e.preventDefault();S.tween=null;setPlay(!S.playing)}
});
var hintHidden=false;function hideHint(){if(hintHidden)return;hintHidden=true;$('#hint').style.opacity=0}
setTimeout(hideHint,9000);
window.__LH={setPaint:setPaint,S:S,fx:fx,fxT:fxT,cam:cam,
  set:function(h,o){S.tween=null;S.h=h;setPlay(false);for(var k in o){fx[k]=fxT[k]=o[k]}if(o.vg)vgSnap();lastMin=-1;envKey=''},
  noAuto:!!window.__NOAUTO,
  fireInfo:function(){var a=0,k=0,my=-1e9,mx=1e9,Mx=-1e9;for(var i=0;i<FN;i++)if(fLife[i]>0){a++;if(fKind[i]===1)k++;my=Math.max(my,fPos[i*3+1]);mx=Math.min(mx,fPos[i*3]);Mx=Math.max(Mx,fPos[i*3])}return [a,k,my,mx,Mx,nextFire,tt,fPtr]},
  stepFire:function(n){for(var i=0;i<n;i++){tt+=0.05;updateFire(0.05,tt,true)}}};

/* ---------- main loop ---------- */
var last=performance.now(),tt=0;
var fwd=new THREE.Vector3(),envKey='',frameN=0,fpsT=0,fpsN=0,slowRuns=0;
function fLifeAny(){fCheck++;if(fCheck%20===0){fAnyAlive=false;for(var i=0;i<FN;i++)if(fLife[i]>0){fAnyAlive=true;break}}return fAnyAlive}
var fCheck=0,fAnyAlive=false;
function degrade(){
  if(QL<=0)return;
  QL--;
  if(QL<2){if(reflRT){reflRT.dispose();reflRT=null}water.material.uniforms.uRefl.value=null;water.material.uniforms.uUseRefl.value=0}
  if(QL<1){setShadowSize(1024);if(bloom){bloom.strength=0}}
  else setShadowSize(2048);
  if(composer&&QL<2){}
}

/* ---------- compass: scene +x = east, -z = north ---------- */
var cmpRose=$('#cmpRose'),cmpSun=$('#cmpSun'),cmpMoon=$('#cmpMoon'),cmpTxt=$('#cmpTxt'),cmpRise=$('#cmpRise'),cmpSet=$('#cmpSet');
var DEG=180/Math.PI,CARD=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function bearing(x,z){var b=Math.atan2(x,-z)*DEG;return (b+360)%360}
function cardName(b){return CARD[Math.round(b/22.5)%16]}
(function(){var g=$('#cmpTicks'),h='';for(var i=0;i<36;i++){var a=i*10,l=i%9===0?0:(i%3===0?2:3.5);h+='<line x1="0" y1="-31" x2="0" y2="'+(-31+(i%9===0?0:(i%3===0?3:2)))+'" stroke="rgba(255,255,255,.35)" transform="rotate('+a+')"/>'}g.innerHTML=h})();
var riseB=bearing(Math.cos(0),-.35),setB=bearing(-1,-.35);
cmpRise.setAttribute('transform','rotate('+riseB+')');cmpSet.setAttribute('transform','rotate('+setB+')');
var cmpKey='';
function updateCompass(az){
  var fb=bearing(-Math.cos(az),-Math.sin(az));
  cmpRose.setAttribute('transform','rotate('+(-fb).toFixed(1)+')');
  var sd=U.uSunDir.value,md=U.uMoonDir.value;
  var sb=bearing(sd.x,sd.z),mb=bearing(md.x,md.z),se=Math.asin(sd.y)*DEG,me=Math.asin(md.y)*DEG;
  cmpSun.setAttribute('transform','rotate('+sb.toFixed(1)+')');cmpSun.style.opacity=se>-2?1:.18;
  cmpMoon.setAttribute('transform','rotate('+mb.toFixed(1)+')');cmpMoon.style.opacity=(env.night>.3&&me>0)?1:0;
  var t=se>-2?'太陽 '+cardName(sb)+' '+Math.round(sb)+'°  高 '+Math.max(0,Math.round(se))+'°':(me>0?'月亮 '+cardName(mb)+' '+Math.round(mb)+'°  高 '+Math.round(me)+'°':'日出 '+cardName(riseB)+' · 日落 '+cardName(setB));
  if(t!==cmpKey){cmpKey=t;cmpTxt.textContent=t}
}
function frame(now){
  var dt=clamp((now-last)/1000,0,.05);last=now;tt+=dt;frameN++;
  U.uTime.value=tt;
  if(S.tween){
    S.tween.t=Math.min(1,S.tween.t+dt/1.8);
    var e=S.tween.t,ez=e*e*(3-2*e);
    S.h=((S.tween.from+S.tween.d*ez)%24+24)%24;
    if(S.tween.t>=1)S.tween=null;
  }else if(S.playing){S.h=(S.h+dt*24/(S.cycle/S.speed))%24}
  if(document.activeElement!==tm||S.playing||S.tween)tm.value=S.h;
  updateClock();
  var k=1-Math.exp(-dt*1.6);
  for(var n in fx){fx[n]+=(fxT[n]-fx[n])*k;if(Math.abs(fxT[n]-fx[n])<.002)fx[n]=fxT[n]}
  U.uSnow.value=fx.snow;U.uRain.value=fx.rain;U.uXmas.value=fx.xmas;
  U.uVG.value=fx.vg;fogK=Math.max(1,cam.R/230);
  applyTime(S.h);
  var lamp=env.lamp;
  lampMat.uniforms.uAmt.value=lamp*.95;lampPts.visible=lamp>.004;
  beaconMat.uniforms.uAmt.value=.35+.65*lamp;
  var xa=fx.xmas*(.3+.7*lamp);xmasMat.uniforms.uAmt.value=xa;xmasPts.visible=eyeXmas.visible=xa>.004;
  carPts.material.uniforms.uAmt.value=lamp*.8;carPts.visible=lamp>.05;
  eye.wheel.rotation.z-=dt*.025;
  for(var i=0;i<eye.pods.length;i++){
    eye.pods[i].rotation.z=-eye.wheel.rotation.z;
    var pm=eye.podMats[i];
    var base=tmpC.setRGB(.68,.82,1);
    if(fx.xmas>.01){tmpC.setRGB(i%2?1:.15,i%2?.15:.9,.2);base.lerp(tmpC,fx.xmas)}
    pm.emissive.copy(base);pm.emissiveIntensity=lamp*1.1;
  }
  for(var b=0;b<boats.length;b++){
    var bt=boats[b];bt.g.position.x+=bt.sp*dt;
    if(bt.g.position.x>240)bt.g.position.x=-240;if(bt.g.position.x<-240)bt.g.position.x=240;
    bt.g.position.y=0.1+Math.sin(tt*1.2+bt.bob)*.06;bt.g.rotation.z=Math.sin(tt*.9+bt.bob)*.012;
  }
  /* camera */
  if(!cam.drag&&!reduce)cam.idle+=dt;
  var kk=1-Math.exp(-dt*5);
  cam.az+=(cam.tAz-cam.az)*kk;cam.el+=(cam.tEl-cam.el)*kk;cam.R+=(cam.tR-cam.R)*kk;
  var az=cam.az+(reduce?0:Math.sin(cam.idle*.06)*.07),ce=Math.cos(cam.el);
  T.lerp(Tt,kk);
  camera.position.set(T.x+cam.R*ce*Math.cos(az),T.y+cam.R*Math.sin(cam.el),T.z+cam.R*ce*Math.sin(az));
  camera.lookAt(T);
  updateCompass(az);
  sky.position.copy(camera.position);
  camera.getWorldDirection(fwd);
  var cx=camera.position.x+fwd.x*55,cy=camera.position.y+fwd.y*20-8,cz=camera.position.z+fwd.z*55;
  rain.material.uniforms.uCenter.value.set(cx,cy,cz);rain.visible=fx.rain>.004;
  snow.material.uniforms.uCenter.value.set(cx,cy,cz);snow.visible=fx.snow>.004;
  var fa=fx.fire>.5;fire.visible=fa||fLifeAny();
  updateFire(dt,tt,fa);
  /* sky light capture, only when the sky has changed */
  var key=S.h.toFixed(2)+'|'+fx.rain.toFixed(2)+'|'+fx.fog.toFixed(2);
  if(key!==envKey&&frameN%2===0){envKey=key;updateEnv()}
  /* post settings follow the time of day */
  if(bloom&&QL>=1){bloom.threshold=lerp(1.05,.55,env.night);bloom.strength=lerp(.22,.8,env.night)+fx.fire*.2}
  if(grade){grade.uniforms.uTime.value=tt;grade.uniforms.uNight.value=env.night;grade.uniforms.uWarm.value=(1-env.night)*(1-fx.snow*.5)}
  renderer.shadowMap.needsUpdate=true;
  if(reflOn()){water.material.uniforms.uUseRefl.value=1;renderRefl()}
  if(composer&&QL>=1)composer.render();else renderer.render(scene,camera);
  /* adapt quality on slow devices */
  if(!window.__LH.noAuto){
    fpsT+=dt;fpsN++;
    if(fpsT>2.5){var fps=fpsN/fpsT;fpsT=0;fpsN=0;if(fps<24){slowRuns++;if(slowRuns>=2){slowRuns=0;degrade()}}else slowRuns=0}
  }
  requestAnimationFrame(frame);
}
applyTime(S.h);updateClock();
requestAnimationFrame(frame);
})();
})();
