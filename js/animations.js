/* =====================================================================
   ADLOR · IA — Animaciones (idénticas al mockup original)
   ---------------------------------------------------------------------
   NO necesitas tocar este archivo para cambiar el contenido de la web.
   Aquí viven: la lluvia "Matrix" blanca de fondo, el núcleo 3D tipo
   reactor, el reloj/uptime en vivo y la navegación del dock.
   Respeta "prefers-reduced-motion" (accesibilidad).
   ===================================================================== */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio||1, 2);

  /* ---------- uptime (contador de sesión) ---------- */
  var t0=0, up=document.getElementById('uptime');
  function fmt(s){var h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=Math.floor(s%60);
    return [h,m,x].map(function(n){return (n<10?'0':'')+n;}).join(':');}
  setInterval(function(){t0++;if(up)up.textContent=fmt(3600*7+t0);},1000);

  /* =========================================================
     MATRIX RAIN — fondo de página completa, glifos BLANCOS
     ========================================================= */
  var mx=document.getElementById('matrix'), mc=mx.getContext('2d');
  var glyphs='アカサタナハマヤラワ0123456789ABCDEFｦｧｨ<>{}[]#/*+=$%&ADLOR'.split('');
  var cols, drops, fs, mw, mh;
  function mxSize(){
    mw=mx.width=Math.floor(innerWidth*DPR);
    mh=mx.height=Math.floor(innerHeight*DPR);
    mx.style.width=innerWidth+'px';mx.style.height=innerHeight+'px';
    fs=Math.max(13,Math.round(15*DPR));
    cols=Math.ceil(mw/fs);
    drops=new Array(cols);
    for(var i=0;i<cols;i++) drops[i]=Math.random()*-60;
    mc.fillStyle='#04060A';mc.fillRect(0,0,mw,mh);
  }
  mxSize(); addEventListener('resize', mxSize);

  function mxFrame(){
    // fade to dark → trails
    mc.fillStyle='rgba(4,6,10,0.11)';
    mc.fillRect(0,0,mw,mh);
    mc.font=fs+'px '+ 'ui-monospace, monospace';
    mc.textBaseline='top';
    for(var i=0;i<cols;i++){
      var ch=glyphs[(Math.random()*glyphs.length)|0];
      var x=i*fs, y=drops[i]*fs;
      // trailing char: soft white
      mc.fillStyle='rgba(180,205,230,0.22)';
      mc.fillText(ch, x, y);
      // bright head every so often
      if(Math.random()>0.965){
        mc.fillStyle='rgba(232,244,255,0.95)';
        mc.shadowColor='rgba(120,200,255,0.9)';mc.shadowBlur=8*DPR;
        mc.fillText(ch, x, y);
        mc.shadowBlur=0;
      }
      if(y>mh && Math.random()>0.975) drops[i]=Math.random()*-30;
      drops[i]+= (0.35+Math.random()*0.35);
    }
  }

  /* =========================================================
     NÚCLEO 3D — proyección 3D hecha a mano sobre Canvas 2D
     ========================================================= */
  var cv=document.getElementById('core'), cx2=cv.getContext('2d');
  var CORE_FALLBACK=440; // tamaño CSS de referencia (coincide con styles.css)
  function coreSize(){
    var r=cv.getBoundingClientRect();
    // Blindaje: si el navegador aún no midió el canvas (rect ~0), usa un tamaño
    // por defecto para que el núcleo se dibuje igual y no quede en 1x1 px.
    var w=(r.width  > 1) ? r.width  : CORE_FALLBACK;
    var h=(r.height > 1) ? r.height : CORE_FALLBACK;
    cv.width =Math.max(1,Math.round(w*DPR));
    cv.height=Math.max(1,Math.round(h*DPR));
  }
  coreSize();
  addEventListener('resize', coreSize);
  addEventListener('load', coreSize);            // re-mide cuando el layout ya está listo

  var CY='66,230,255';
  function rnd(a,b){return a+Math.random()*(b-a);}
  // Nube de MUCHOS dots (base Fibonacci) con jitter — se mueven poco, aleatorio
  var N=520, pts=[];
  var GA=Math.PI*(3-Math.sqrt(5));
  for(var i=0;i<N;i++){
    var y=1-(i/(N-1))*2, rad=Math.sqrt(Math.max(0,1-y*y)), th=GA*i;
    pts.push({
      bx:Math.cos(th)*rad, by:y, bz:Math.sin(th)*rad,
      fx:rnd(.2,.9), fy:rnd(.2,.9), fz:rnd(.2,.9),          // frecuencias del jitter
      ph1:rnd(0,6.283), ph2:rnd(0,6.283), ph3:rnd(0,6.283),
      am:rnd(.05,.11)                                        // amplitud pequeña
    });
  }
  // 10 dots orbitando en círculo (plano inclinado, radio constante)
  var ORB=10, orbTiltX=0.6, orbTiltZ=0.35, orbR=1.45;

  function rot(p,ax,ay){
    var cy=Math.cos(ay),sy=Math.sin(ay);
    var x=p.x*cy - p.z*sy, z=p.x*sy + p.z*cy;
    var cxx=Math.cos(ax),sxx=Math.sin(ax);
    var y=p.y*cxx - z*sxx, z2=p.y*sxx + z*cxx;
    return {x:x,y:y,z:z2};
  }
  // punto en un círculo con plano inclinado (para los orbitadores)
  function tilt(x,y,z,tx,tz){
    var cxr=Math.cos(tx),sxr=Math.sin(tx);
    var y1=y*cxr - z*sxr, z1=y*sxr + z*cxr;
    var czr=Math.cos(tz),szr=Math.sin(tz);
    return {x:x*czr - y1*szr, y:x*szr + y1*czr, z:z1};
  }

  function drawCore(time){
    var w=cv.width,h=cv.height,cx=w/2,cy=h/2;
    var R=Math.min(w,h)*0.34, focal=3.2;
    cx2.clearRect(0,0,w,h);
    var t=time*0.001;
    var ay=t*0.22, ax=0.42+0.14*Math.sin(t*0.35);

    // ambient halo
    var g=cx2.createRadialGradient(cx,cy,R*0.1,cx,cy,R*2);
    g.addColorStop(0,'rgba('+CY+',.06)');g.addColorStop(1,'rgba('+CY+',0)');
    cx2.fillStyle=g;cx2.beginPath();cx2.arc(cx,cy,R*2,0,Math.PI*2);cx2.fill();

    function proj(p){
      var f=focal/(focal-p.z);
      return {x:cx+p.x*R*f, y:cy+p.y*R*f, s:f, z:p.z};
    }

    // dots con jitter (movimiento aleatorio suave), proyectados y ordenados por profundidad
    var sp=[];
    for(var i=0;i<pts.length;i++){
      var d=pts[i];
      var jx=d.bx + Math.sin(t*d.fx + d.ph1)*d.am;
      var jy=d.by + Math.sin(t*d.fy + d.ph2)*d.am;
      var jz=d.bz + Math.sin(t*d.fz + d.ph3)*d.am;
      sp.push(proj(rot({x:jx,y:jy,z:jz}, ax, ay)));
    }
    sp.sort(function(a,b){return a.z-b.z;});

    // filamento: cada dot conectado al núcleo (centro) por una línea fina
    cx2.shadowBlur=0;
    for(var i=0;i<sp.length;i++){
      var p=sp[i], depth=(p.z+1)/2;
      cx2.strokeStyle='rgba('+CY+','+(0.035+depth*0.11)+')';
      cx2.lineWidth=0.6*DPR;
      cx2.beginPath();cx2.moveTo(cx,cy);cx2.lineTo(p.x,p.y);cx2.stroke();
    }
    // dots (frente blancos, fondo cian)
    for(var i=0;i<sp.length;i++){
      var p=sp[i], depth=(p.z+1)/2;
      var alpha=0.20+depth*0.75, rad=(0.6+depth*1.7)*DPR;
      cx2.fillStyle = depth>0.55 ? 'rgba(224,244,255,'+alpha+')' : 'rgba('+CY+','+(alpha*0.8)+')';
      cx2.shadowColor='rgba('+CY+','+(depth*0.9)+')';cx2.shadowBlur=depth*9*DPR;
      cx2.beginPath();cx2.arc(p.x,p.y,rad,0,Math.PI*2);cx2.fill();
    }
    cx2.shadowBlur=0;

    // 10 dots orbitando en círculo alrededor de la nube (plano inclinado, radio constante)
    var orbAng=t*0.6, orbs=[];
    for(var i=0;i<ORB;i++){
      var a2=orbAng + i*(Math.PI*2/ORB);
      var b=tilt(Math.cos(a2)*orbR, 0, Math.sin(a2)*orbR, orbTiltX, orbTiltZ);
      orbs.push(proj(rot(b, ax, ay)));
    }
    orbs.sort(function(a,b){return a.z-b.z;});
    for(var i=0;i<orbs.length;i++){
      var p=orbs[i], depth=(p.z+1)/2;
      cx2.fillStyle='rgba(240,252,255,'+(0.55+depth*0.45)+')';
      cx2.shadowColor='rgba('+CY+',1)';cx2.shadowBlur=(7+depth*13)*DPR;
      cx2.beginPath();cx2.arc(p.x,p.y,(2.1+depth*1.7)*DPR,0,Math.PI*2);cx2.fill();
    }
    cx2.shadowBlur=0;

    // glowing core (breathing)
    var pulse=0.5+0.5*Math.sin(t*1.7);
    var cr=R*0.22*(0.92+0.12*pulse);
    var cg=cx2.createRadialGradient(cx,cy,0,cx,cy,cr*2.2);
    cg.addColorStop(0,'rgba(240,252,255,.95)');
    cg.addColorStop(0.28,'rgba('+CY+',.85)');
    cg.addColorStop(1,'rgba('+CY+',0)');
    cx2.fillStyle=cg;
    cx2.beginPath();cx2.arc(cx,cy,cr*2.2,0,Math.PI*2);cx2.fill();
    cx2.fillStyle='rgba(245,253,255,.98)';
    cx2.beginPath();cx2.arc(cx,cy,cr*0.42,0,Math.PI*2);cx2.fill();
  }

  /* ---------- run ---------- */
  if(reduce){
    // static: paint matrix once + a single core frame
    mc.fillStyle='#04060A';mc.fillRect(0,0,mw,mh);
    mc.font=fs+'px ui-monospace, monospace';mc.textBaseline='top';
    for(var i=0;i<cols;i++){mc.fillStyle='rgba(180,205,230,0.20)';
      mc.fillText(glyphs[(Math.random()*glyphs.length)|0], i*fs, Math.random()*mh);}
    drawCore(2600);
  }else{
    function loop(ts){ mxFrame(); if(cv.width<=2) coreSize(); drawCore(ts); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  }

  /* ---- reloj en vivo (hora local) ---- */
  var clk=document.getElementById('clock');
  function tick(){ if(!clk) return; var d=new Date();
    clk.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(function(n){return (n<10?'0':'')+n;}).join(':'); }
  tick(); setInterval(tick,1000);

  /* ---- dock: marca activo el botón pulsado (la navegación por ancla
         la hacen los propios enlaces href="#seccion") ---- */
  [].slice.call(document.querySelectorAll('.dockbtn')).forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.dockbtn.active').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active');
    });
  });

  /* ---- resalta en el dock la sección visible al hacer scroll ---- */
  var secciones = [].slice.call(document.querySelectorAll('.section[id]'));
  if('IntersectionObserver' in window && secciones.length){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        var btn=document.querySelector('.dockbtn[data-target="#'+en.target.id+'"]');
        if(!btn) return;
        document.querySelectorAll('.dockbtn.active').forEach(function(x){x.classList.remove('active');});
        btn.classList.add('active');
      });
    },{rootMargin:'-40% 0px -55% 0px'});
    secciones.forEach(function(s){obs.observe(s);});
  }
})();
