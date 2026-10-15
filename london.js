/* London: city config + landmark builders. Loaded before engine.js. */
window.CITY={
 id:'london',name:'London',nameZh:'倫敦',timeZone:'Europe/London',latLon:[51.507,-0.128],
 paintings:[
  {file:'paintings/p0.jpg',n:'The Starry Night',a:'Vincent van Gogh',y:'1889'},
  {file:'paintings/p1.jpg',n:'Starry Night Over the Rhône',a:'Vincent van Gogh',y:'1888'},
  {file:'paintings/p2.jpg',n:'Houses of Parliament, Sunset',a:'Claude Monet',y:'1903'},
  {file:'paintings/p3.jpg',n:'The Starry Night (drawing)',a:'Vincent van Gogh',y:'1889'},
 ],
 presets:{
  sunrise:{h:6.35,fx:{}},
  golden:{h:17.6,fx:{}},
  white:{h:19.6,fx:{snow:1,xmas:1}},
  rainy:{h:21.4,fx:{rain:1}},
  nye:{h:23.6,fx:{xmas:1,fire:1}},
  mist:{h:7.1,fx:{fog:1}},
  vango:{h:22.6,fx:{vg:1}}
},
 views:{
  tower:{t:[55,16,2],az:3.02,el:.18,R:128},
  west:{t:[-92,24,-34],az:.14,el:.17,R:118},
  eye:{t:[-78,24,30],az:-1.45,el:.15,R:105},
  all:{t:[-28,6,0],az:1.57,el:.52,R:360}
},
 blocked:(function(){
var excl=[
  {x:62,z:52,r:17},{x:14,z:-64,r:13},{x:-18,z:-74,r:27},{x:-78,z:42,r:28},
  {x:-108,z:-38,r:14},{x:-50,z:-39,r:10},{x:112,z:-36,r:11}
];
function blocked(x,z,hw){
  if(Math.abs(x-55)<10+hw&&Math.abs(z)<52)return true;
  if(x>-116-hw&&x<-42+hw&&z>-50-hw&&z<-28)return true;
  for(var i=0;i<excl.length;i++){var e=excl[i];if(Math.hypot(x-e.x,z-e.z)<e.r+hw)return true}
  return false;
}
 return blocked;})(),
 build:function(E){
  var THREE=E.THREE,scene=E.scene,rnd=E.rnd,RW=E.RW,ROW0=E.ROW0,blocked=E.blocked,facade=E.facade,mat=E.mat,box=E.box,cyl=E.cyl,mesh=E.mesh,strut=E.strut,
      addBeacon=E.addBeacon,addLamp=E.addLamp,addXmas=E.addXmas,lineXmas=E.lineXmas,xmasL=E.xmasL,eye=E.eye,eyeXmasL=E.eyeXmasL;
/* ---------- landmark: Tower Bridge ---------- */
(function(){
  var g=new THREE.Group();g.position.set(55,0,0);scene.add(g);
  var fT=facade(4,13,{wall:'#cdc6b4',win:'#3b414b',p:.4,sx:14,sy:16});
  var stone=mat(0xffffff,{map:fT.map,emap:fT.emap,k:.9,snow:true,r:.8});
  var stone2=mat(0xbdb6a6,{snow:true,r:.85});
  var blue=mat(0x4a6fa8,{e:0x3a7bff,k:.25,r:.5,m:.3});
  var deckM=mat(0x3b4659,{r:.7});
  var TZ=13;
  for(var s=-1;s<=1;s+=2){
    var z=s*TZ;
    box(12,4,12,stone2,0,2,z,g);
    box(8,30,8,stone,0,19,z,g);
    box(9.2,1.3,9.2,stone2,0,34.6,z,g);
    var roof=cyl(0,4.8,7.5,4,stone2,0,39,z,g);roof.rotation.y=Math.PI/4;
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){
      cyl(0,1.15,6,8,stone2,c[0]*3.7,38,z+c[1]*3.7,g);
      box(1.7,2,1.7,stone2,c[0]*3.7,35.8,z+c[1]*3.7,g);
    });
    addBeacon(55,43,z);
  }
  box(5,1.8,2*TZ-8,mat(0x4a5873,{e:0xffcf80,k:.55}),0,26.5,0,g);
  box(1.6,.5,2*TZ-8,blue,0,27.6,0,g);
  box(7,0.9,88,deckM,0,6.6,0,g);
  [-3.5,3.5].forEach(function(x){box(.55,1.2,88,blue,x,7.5,0,g)});
  var chainM=mat(0x4a6fa8,{e:0x3a7bff,k:.3,r:.5,m:.3});
  var lineM=new THREE.LineBasicMaterial({color:0x4a82e0});
  [-3,3].forEach(function(x){
    [-1,1].forEach(function(s){
      var a=new THREE.Vector3(x,34,s*(TZ+3.2)),b=new THREE.Vector3(x,8,s*44),c=new THREE.Vector3(x,13,s*32);
      var cv=new THREE.QuadraticBezierCurve3(a,c,b);
      var tube=new THREE.Mesh(new THREE.TubeGeometry(cv,28,0.34,6,false),chainM);tube.castShadow=true;g.add(tube);
      var pts=[];
      for(var i=1;i<=16;i++){var t=i/17,p=cv.getPoint(t);pts.push(p.x,p.y,p.z,p.x,7.2,p.z)}
      var lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
      g.add(new THREE.LineSegments(lg,lineM));
      for(var j=0;j<=14;j++){var q=cv.getPoint(j/14);addXmas(55+q.x,q.y+.3,q.z)}
    });
  });
  [-1,1].forEach(function(s){for(var z2=8;z2<=42;z2+=4){addLamp(55-3.8,9.4,s*z2,[.85,.92,1]);addLamp(55+3.8,9.4,s*z2,[.85,.92,1])}});
  lineXmas([55-2.4,28.2,-TZ+4],[55-2.4,28.2,TZ-4],1.5);lineXmas([55+2.4,28.2,-TZ+4],[55+2.4,28.2,TZ-4],1.5);
  [-1,1].forEach(function(s){[[-3.8,-3.8],[3.8,-3.8],[-3.8,3.8],[3.8,3.8]].forEach(function(c){lineXmas([55+c[0],5,s*TZ+c[1]],[55+c[0],34,s*TZ+c[1]],3.8)})});
})();

/* ---------- landmark: The Shard ---------- */
(function(){
  var f=facade(12,56,{wall:'#6f93aa',win:'#41627a',p:.5,sx:10,sy:10});
  var m=mat(0xffffff,{map:f.map,emap:f.emap,r:.12,m:.75,k:.8,env:1.3,snow:false});
  var s=mesh(new THREE.ConeGeometry(11,76,4,1),m,62,38,52);s.rotation.y=Math.PI/4;
  var sh=mat(0xb9d6e8,{r:.08,m:.8,env:1.4,e:0xcfe8ff,k:.5});
  for(var i=0;i<5;i++){
    var t=mesh(new THREE.ConeGeometry(2.4-i*.3,9+i*2,4,1),sh,62+(i-2)*.7,78+i*1.2,52+(i%2?.7:-.7));t.rotation.y=Math.PI/4+i*.5;t.rotation.z=(i-2)*.05;
  }
  mesh(new THREE.CylinderGeometry(.1,.35,5,6),mat(0xcfe8ff,{e:0xcfe8ff,k:1}),62,88,52);
  addBeacon(62,90.8,52);
  for(var k=0;k<16;k++)addXmas(62+(rnd()-.5)*6,6+k*5,52+(rnd()-.5)*6);
})();

/* ---------- landmark: 30 St Mary Axe ---------- */
(function(){
  var pts=[];
  for(var i=0;i<=26;i++){
    var t=i/26,r=t<.62?2.8+3.9*Math.sin(Math.PI/2*t/.62):6.7*Math.cos(Math.PI/2*(t-.62)/.38);
    pts.push(new THREE.Vector2(Math.max(r,.05),t*46));
  }
  var c=document.createElement('canvas');c.width=512;c.height=512;var x=c.getContext('2d');
  x.fillStyle='#5f8a90';x.fillRect(0,0,512,512);
  var cb=document.createElement('canvas');cb.width=512;cb.height=512;var xb=cb.getContext('2d');xb.fillStyle='#000';xb.fillRect(0,0,512,512);
  for(var r=0;r<40;r++)for(var q=0;q<24;q++){
    var yy=r*12.8,xx=(q*21.3+r*5.3)%512;
    x.fillStyle=((q+r)%2)?'#1f3d44':'#7fb0b6';x.fillRect(xx,yy+1,16,10.5);
    if(rnd()<.4){xb.fillStyle='#ffe0a8';xb.fillRect(xx,yy+1,16,10.5)}
  }
  x.fillStyle='rgba(20,30,36,.7)';for(var d=0;d<24;d++)x.fillRect(d*21.3,0,1.3,512);
  var t1=new THREE.CanvasTexture(c),t2=new THREE.CanvasTexture(cb);t1.anisotropy=8;
  t1.wrapS=t2.wrapS=THREE.RepeatWrapping;
  var m=mat(0xffffff,{map:t1,emap:t2,r:.14,m:.7,env:1.3,k:.85});
  mesh(new THREE.LatheGeometry(pts,32),m,14,0,-64);
  addBeacon(14,47,-64);
})();

/* ---------- landmark: St Paul's ---------- */
(function(){
  var g=new THREE.Group();g.position.set(-18,0,-74);scene.add(g);
  var s=mat(0xd9d2c3,{e:0xffd9a0,k:.5,snow:true,r:.8});
  var lead=mat(0x8a949c,{e:0xb8c4d8,k:.25,snow:true,r:.5,m:.2});
  var gold=mat(0xd8b36a,{e:0xffc870,k:.8,r:.4,m:.6});
  box(34,13,17,s,0,6.5,0,g);
  box(14,5,14,s,0,15.5,0,g);
  box(18,2,6,s,0,13.5,9.6,g);
  for(var i=0;i<8;i++)cyl(.45,.5,12,10,s,-7.8+i*2.2,6.5,11.8,g);
  var drum=cyl(8,8.6,8,32,s,0,22,0,g);
  for(var k=0;k<32;k++){var a=k/32*Math.PI*2;cyl(.28,.28,6,8,s,Math.cos(a)*8.4,22,Math.sin(a)*8.4,g)}
  cyl(8.8,8.8,.8,32,s,0,26.4,0,g);
  var dc=document.createElement('canvas');dc.width=256;dc.height=128;var dx=dc.getContext('2d');
  dx.fillStyle='#8f99a1';dx.fillRect(0,0,256,128);dx.fillStyle='rgba(30,36,44,.35)';for(var q=0;q<32;q++)dx.fillRect(q*8,0,1.5,128);
  var dt=new THREE.CanvasTexture(dc);lead.map=dt;
  var dome=mesh(new THREE.SphereGeometry(8,32,16,0,Math.PI*2,0,Math.PI/2),lead,0,26.8,0,g);dome.scale.set(1,1.2,1);
  cyl(1.7,2.1,4.2,12,s,0,37.2,0,g);cyl(.1,1.5,2.4,12,gold,0,40.5,0,g);mesh(new THREE.SphereGeometry(.9,12,10),gold,0,42.2,0,g);
  cyl(.12,.12,3,6,gold,0,44,0,g);box(1.8,.2,.2,gold,0,44.6,0,g);
  [-1,1].forEach(function(sx){box(5.4,22,5.4,s,sx*12,11,7,g);cyl(0,3.4,5,8,s,sx*12,24.5,7,g);cyl(2,2,2.4,10,lead,sx*12,22.6,7,g)});
  for(var j=0;j<24;j++){var b=j/24*Math.PI*2;addLamp(-18+Math.cos(b)*9,27.2,-74+Math.sin(b)*9,[1,.85,.55])}
  addBeacon(-18,45.4,-74);
})();

/* ---------- landmark: Big Ben + Palace of Westminster ---------- */
var clockMat,clockCtx,clockTex;
function drawClock(hh,mm){
  var cx=clockCtx;cx.clearRect(0,0,128,128);
  cx.fillStyle='#f8e8b8';cx.beginPath();cx.arc(64,64,62,0,7);cx.fill();
  cx.strokeStyle='#2a2216';cx.lineWidth=3;cx.beginPath();cx.arc(64,64,58,0,7);cx.stroke();
  cx.lineWidth=4;
  for(var i=0;i<12;i++){var a=i/12*Math.PI*2;cx.beginPath();cx.moveTo(64+Math.cos(a)*48,64+Math.sin(a)*48);cx.lineTo(64+Math.cos(a)*56,64+Math.sin(a)*56);cx.stroke()}
  var ma=(mm/60)*Math.PI*2-Math.PI/2,ha=((hh%12)+mm/60)/12*Math.PI*2-Math.PI/2;
  cx.lineCap='round';
  cx.lineWidth=6;cx.beginPath();cx.moveTo(64,64);cx.lineTo(64+Math.cos(ha)*28,64+Math.sin(ha)*28);cx.stroke();
  cx.lineWidth=4;cx.beginPath();cx.moveTo(64,64);cx.lineTo(64+Math.cos(ma)*42,64+Math.sin(ma)*42);cx.stroke();
  clockTex.needsUpdate=true;
}
(function(){
  var g=new THREE.Group();g.position.set(-108,0,-38);scene.add(g);
  var fs=facade(3,12,{wall:'#b9a98a',win:'#2c251c',p:.45,sx:14,sy:16});
  var shaft=mat(0xffffff,{map:fs.map,emap:fs.emap,k:.8,snow:true,r:.8});
  var stone=mat(0xc2b293,{e:0xffc880,k:.35,snow:true,r:.8});
  var roofM=mat(0x4f5a65,{snow:true,r:.5,m:.3});
  var gold=mat(0xe0b860,{e:0xffc870,k:.9,r:.35,m:.7});
  box(7,32,7,shaft,0,16,0,g);
  box(9,10,9,stone,0,37,0,g);
  box(9.8,1,9.8,gold,0,31.8,0,g);box(9.8,1,9.8,gold,0,42.4,0,g);
  var cc=document.createElement('canvas');cc.width=cc.height=128;clockCtx=cc.getContext('2d');
  clockTex=new THREE.CanvasTexture(cc);clockTex.anisotropy=4;drawClock(10,10);
  clockMat=new THREE.MeshStandardMaterial({color:0xffffff,map:clockTex,emissive:0xffe9b0,emissiveMap:clockTex,emissiveIntensity:.3,roughness:.6});
  var cg=new THREE.CircleGeometry(3.6,32);
  [[0,0,4.55,0],[0,0,-4.55,Math.PI],[4.55,0,0,Math.PI/2],[-4.55,0,0,-Math.PI/2]].forEach(function(c){
    var f=new THREE.Mesh(cg,clockMat);g.add(f);f.position.set(c[0],37,c[2]);f.rotation.y=c[3];
  });
  box(7.6,3.4,7.6,stone,0,44.2,0,g);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){cyl(0,.9,4,6,stone,c[0]*3.3,47.4,c[1]*3.3,g)});
  cyl(0,5.6,12,4,roofM,0,52,0,g).rotation.y=Math.PI/4;
  cyl(.1,.2,4,6,gold,0,59,0,g);
  addBeacon(-108,61.2,-38);
  var fp=facade(26,3,{wall:'#bfae8c',win:'#2c251c',p:.4,sx:12,sy:16});
  var pal=mat(0xffffff,{map:fp.map,emap:fp.emap,k:.8,snow:true,r:.8});
  box(66,11,14,pal,34,5.5,0,g);
  box(66,1.2,15,roofM,34,11.6,0,g);
  for(var t=0;t<8;t++){cyl(0,1.5,7,6,stone,2+t*9,15.5,-5.5,g);cyl(0,1.2,5,6,stone,6+t*9,14.8,5.5,g)}
  box(9,38,9,stone,64,19,0,g);cyl(0,6.2,7,4,roofM,64,41.5,0,g).rotation.y=Math.PI/4;
  lineXmas([-108,12.8,-38+7.8],[-108+66,12.8,-38+7.8],2.4);
  lineXmas([-108-4.6,31.9,-38+4.6],[-108+4.6,31.9,-38+4.6],1.5);
})();

/* ---------- landmark: London Eye ---------- */
(function(){
  var g=new THREE.Group();g.position.set(-78,0,36);g.rotation.y=0;scene.add(g);
  var rimM=mat(0xf0f3f8,{e:0x8fb8ff,k:1.1,r:.35,m:.4});
  var wheel=new THREE.Group();wheel.position.set(0,24,0);g.add(wheel);eye.wheel=wheel;
  [-0.7,0.7].forEach(function(zz){var r=new THREE.Mesh(new THREE.TorusGeometry(21,.3,8,120),rimM);r.position.z=zz;r.castShadow=true;wheel.add(r)});
  var sp=[];
  for(var i=0;i<48;i++){var a=i/48*Math.PI*2;sp.push(0,0,.7,Math.cos(a)*21,Math.sin(a)*21,.7,0,0,-.7,Math.cos(a)*21,Math.sin(a)*21,-.7)}
  var lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  wheel.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0xe3e9f2})));
  var podG=new THREE.SphereGeometry(1,14,12);
  for(var j=0;j<32;j++){
    var b=j/32*Math.PI*2;
    var pm=new THREE.MeshStandardMaterial({color:0xeef3f8,roughness:.3,metalness:.15,emissive:0xaed0ff,emissiveIntensity:0});
    var p=new THREE.Mesh(podG,pm);p.scale.set(1.75,1.15,1.2);p.position.set(Math.cos(b)*21.6,Math.sin(b)*21.6,1.7);p.castShadow=true;
    wheel.add(p);eye.pods.push(p);eye.podMats.push(pm);
    for(var k=0;k<3;k++){var a2=b+(k-1)*0.06;addXmas(Math.cos(a2)*21,Math.sin(a2)*21,0.4,eyeXmasL,.7)}
  }
  var legM=mat(0xf0f3f8,{r:.4,m:.3});
  strut(new THREE.Vector3(0,24,0.9),new THREE.Vector3(-10,0,-8),.6,legM,g);
  strut(new THREE.Vector3(0,24,0.9),new THREE.Vector3(10,0,-8),.6,legM,g);
  strut(new THREE.Vector3(0,24,-0.9),new THREE.Vector3(-10,0,8),.6,legM,g);
  strut(new THREE.Vector3(0,24,-0.9),new THREE.Vector3(10,0,8),.6,legM,g);
  cyl(1.3,1.3,3,12,legM,0,24,0,g).rotation.x=Math.PI/2;
  eye.group=g;
})();

/* ---------- Christmas tree + riverside lights ---------- */
(function(){
  var g=new THREE.Group();g.position.set(112,0,-36);scene.add(g);
  var green=mat(0x1f5a36,{e:0x103a20,k:.6,r:.9});
  cyl(.55,.85,3,8,mat(0x4a3220,{}),0,1.5,0,g);
  [[5.8,6.4,3],[4.7,5.8,8],[3.7,5.2,12.4],[2.6,4.6,16.4]].forEach(function(l){cyl(.1,l[0],l[1],16,green,0,l[2]+l[1]/2,0,g)});
  for(var i=0;i<180;i++){
    var t=i/180,y=3.5+t*17.5,r=(1-t)*5.6*(0.6+0.4*Math.abs(Math.sin(t*14)));
    var a=i*2.4;addXmas(112+Math.cos(a)*r,y,-36+Math.sin(a)*r,null,0.95);
  }
  xmasL.push({p:[112,22.6,-36],c:[1,.85,.4],s:3.8,b:0,ph:0});
  for(var x=-130;x<=125;x+=2.6){addXmas(x,2.9,-(RW+1));addXmas(x,2.9,RW+1)}
  for(var x2=-130;x2<=125;x2+=6.5){addLamp(x2,4.2,-(RW+2.2));addLamp(x2,4.2,RW+2.2)}
  for(var qx=-195;qx<=165;qx+=10)for(var side=-1;side<=1;side+=2)for(var row=0;row<27;row++){
    var qz=side*(ROW0+5+row*10);
    if(rnd()<0.5&&!blocked(qx,qz,.5))addLamp(qx+1.9,3.5,qz+1.9,rnd()<.25?[.9,.95,1]:[1,.72,.38]);
  }
})();

  return {onTime:function(hh,mm){drawClock(hh,mm)},onLamp:function(l){clockMat.emissiveIntensity=.3+.9*l}};
 }
};
