(function(){
  "use strict";

  var canvas = document.getElementById("globalMap");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  /* World coordinate space (equirectangular-ish, simplified) that all
     drawing happens in; mapped onto the canvas with a "slice" fit (plus
     a bit of overscan for pan room) so it always fills the band without
     distortion. */
  var WORLD_W = 1000, WORLD_H = 460;

  /* Hand-plotted continent silhouettes in world space. Not geographic
     data pulled from any third party -- just enough vertices to read as
     a world map at dot-grid resolution. */
  var CONTINENTS = [
    // North America (+ Central America tail)
    [[112,42],[152,34],[192,42],[224,56],[248,76],[266,96],[266,116],
     [248,120],[238,140],[246,160],[228,176],[210,182],[196,202],
     [182,222],[168,236],[152,256],[138,272],[122,252],[126,226],
     [112,206],[96,190],[82,166],[72,140],[66,110],[76,80],[92,54]],
    // Greenland
    [[300,28],[332,22],[352,38],[346,66],[320,76],[300,60],[294,40]],
    // South America
    [[152,282],[176,270],[202,276],[222,292],[236,312],[246,342],
     [250,378],[240,412],[224,442],[204,456],[190,440],[196,410],
     [180,386],[166,360],[156,330],[148,304]],
    // Europe (incl. Scandinavia + Iberia)
    [[430,52],[448,34],[468,28],[488,40],[498,56],[520,50],[536,62],
     [530,76],[544,86],[538,102],[518,112],[504,106],[488,116],
     [470,112],[456,122],[440,106],[424,90],[420,70]],
    // Africa
    [[432,132],[462,120],[492,126],[516,142],[532,166],[536,196],
     [530,226],[540,256],[534,286],[520,316],[506,342],[490,362],
     [474,376],[464,354],[470,326],[454,296],[444,260],[434,226],
     [424,190],[420,160]],
    // Madagascar
    [[556,320],[566,314],[572,330],[566,350],[555,346]],
    // Asia (Russia / Central & East Asia / SE Asia)
    [[548,42],[602,24],[662,18],[722,24],[782,34],[832,46],[872,60],
     [902,82],[916,106],[906,130],[882,140],[862,160],[872,180],
     [852,200],[822,210],[802,236],[776,226],[762,250],[736,240],
     [722,266],[696,250],[682,270],[656,246],[630,236],[616,206],
     [592,196],[576,166],[562,136],[548,106],[538,76]],
    // Arabian Peninsula
    [[556,150],[576,144],[592,166],[582,196],[560,190],[550,170]],
    // India
    [[652,232],[668,226],[678,252],[662,278],[646,262]],
    // Japan
    [[894,148],[906,144],[912,160],[900,176],[890,166]],
    // Indonesia / SE Asia islands
    [[758,272],[774,268],[770,282],[754,284]],
    [[788,270],[806,266],[812,280],[794,286]],
    [[820,272],[838,270],[834,282],[818,282]],
    // Australia
    [[792,322],[822,310],[856,316],[882,332],[896,356],[890,382],
     [864,402],[830,406],[800,396],[780,372],[780,346]],
    // New Zealand
    [[918,392],[928,384],[934,398],[924,410]],
    [[912,412],[920,406],[924,418],[914,422]]
  ];

  function pointInPoly(x, y, poly){
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++){
      var xi = poly[i][0], yi = poly[i][1];
      var xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)){
        inside = !inside;
      }
    }
    return inside;
  }

  function inAnyContinent(x, y){
    for (var i = 0; i < CONTINENTS.length; i++){
      if (pointInPoly(x, y, CONTINENTS[i])) return true;
    }
    return false;
  }

  /* ---- Seeded RNG so the layout is stable across reloads ---- */
  var seed = 42;
  function rand(){
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 10000) / 10000;
  }

  /* ---- Build the dot field once ---- */
  var dots = [];       // dense, mostly-static background texture
  var particles = [];  // sparser, animated + mouse-reactive network nodes

  (function buildDots(){
    var step = 9;
    var idx = 0;
    for (var gx = 0; gx < WORLD_W; gx += step){
      for (var gy = 0; gy < WORLD_H; gy += step){
        var jx = gx + (rand() - 0.5) * 5;
        var jy = gy + (rand() - 0.5) * 5;
        if (inAnyContinent(jx, jy) && rand() < 0.85){
          var r = 1.1 + rand() * 0.9;
          var o = 0.25 + rand() * 0.4;
          dots.push({ x: jx, y: jy, r: r, baseO: o, phase: rand() * Math.PI * 2 });
          idx++;
          if (idx % 3 === 0){
            particles.push({
              bx: jx, by: jy, x: jx, y: jy,
              vx: 0, vy: 0,
              phase: rand() * Math.PI * 2,
              speed: 0.6 + rand() * 0.6,
              amp: 2.5 + rand() * 3
            });
          }
        }
      }
    }
  })();

  /* ---- Hub nodes (regional service centres) ---- */
  var HOME = { x: 760, y: 140 };
  var HUBS = [
    { x: 150, y: 150 }, // North America
    { x: 245, y: 330 }, // South America
    { x: 500, y: 90 },  // Europe
    { x: 505, y: 250 }, // Africa
    { x: 840, y: 365 }  // Australia
  ];

  function arcControl(a, b, lift){
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - lift };
  }
  var ARCS = [
    { a: HOME, b: HUBS[0], c: arcControl(HOME, HUBS[0], 90) },
    { a: HOME, b: HUBS[1], c: arcControl(HOME, HUBS[1], 70) },
    { a: HOME, b: HUBS[2], c: arcControl(HOME, HUBS[2], 55) },
    { a: HOME, b: HUBS[3], c: arcControl(HOME, HUBS[3], 55) },
    { a: HOME, b: HUBS[4], c: arcControl(HOME, HUBS[4], 40) }
  ];

  /* ---- Sizing: fit WORLD_W x WORLD_H into the canvas, then zoom in a
     bit further (OVERSCAN) so there's always vertical slack to pan
     through, regardless of the band's aspect ratio. The band's own box
     size never changes -- only the map drawn inside it pans up/down as
     the page scrolls. ---- */
  var OVERSCAN = 1.35;
  var scale = 1, offsetX = 0, baseOffsetY = 0, slackY = 0, cssW = 0, cssH = 0;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize(){
    var rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    canvas.width = Math.max(1, Math.round(cssW * DPR));
    canvas.height = Math.max(1, Math.round(cssH * DPR));
    scale = Math.max(cssW / WORLD_W, cssH / WORLD_H) * OVERSCAN;
    offsetX = (cssW - WORLD_W * scale) / 2;
    baseOffsetY = (cssH - WORLD_H * scale) / 2;
    slackY = Math.max(0, WORLD_H * scale - cssH);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---- Scroll-driven vertical pan (clamped, no wrap -- latitude
     doesn't loop the way longitude does) ---- */
  var offsetY = 0;

  function updatePan(){
    var doc = document.documentElement;
    var scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    var progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
    // progress 0 -> top of map showing, progress 1 -> bottom of map showing
    offsetY = baseOffsetY - (progress - 0.5) * slackY;
  }

  /* ---- Mouse tracking (world-space coords, eased, pan-aware) ---- */
  var mouse = { x: -9999, y: -9999, active: false };
  var mouseTarget = { x: -9999, y: -9999 };

  function setMouseFromEvent(clientX, clientY){
    var rect = canvas.getBoundingClientRect();
    var cx = clientX - rect.left;
    var cy = clientY - rect.top;
    mouseTarget.x = (cx - offsetX) / scale;
    mouseTarget.y = (cy - offsetY) / scale;
    mouse.active = true;
  }

  canvas.addEventListener("mousemove", function(e){
    setMouseFromEvent(e.clientX, e.clientY);
  });
  canvas.addEventListener("mouseleave", function(){
    mouse.active = false;
  });
  canvas.addEventListener("touchmove", function(e){
    if (e.touches && e.touches[0]){
      setMouseFromEvent(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
  canvas.addEventListener("touchend", function(){
    mouse.active = false;
  });

  var PULL_RADIUS = 130;
  var LINK_RADIUS = 34;
  var MOUSE_LINK_RADIUS = 150;

  var running = true;
  if ("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      running = entries[0].isIntersecting;
      if (running) requestAnimationFrame(tick);
    }, { threshold: 0.01 });
    io.observe(canvas);
  }

  var t = 0;

  function stepParticles(){
    for (var p = 0; p < particles.length; p++){
      var pt = particles[p];
      var swayX = Math.cos(t * pt.speed + pt.phase) * pt.amp;
      var swayY = Math.sin(t * pt.speed * 0.8 + pt.phase) * pt.amp;
      var targetX = pt.bx + swayX;
      var targetY = pt.by + swayY;

      if (mouse.active){
        var dx = mouse.x - pt.bx, dy = mouse.y - pt.by;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PULL_RADIUS){
          var pull = (1 - dist / PULL_RADIUS);
          pull = pull * pull;
          targetX += dx * pull * 0.5;
          targetY += dy * pull * 0.5;
        }
      }

      pt.x += (targetX - pt.x) * 0.08;
      pt.y += (targetY - pt.y) * 0.08;
    }
  }

  function drawScene(){
    // static-ish background dot texture, gentle twinkle
    for (var i = 0; i < dots.length; i++){
      var d = dots[i];
      var o = d.baseO + Math.sin(t * 0.6 + d.phase) * 0.12;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(207,224,247," + Math.max(0, o).toFixed(3) + ")";
      ctx.fill();
    }

    // connective lines between nearby particles
    ctx.lineWidth = 1 / scale;
    for (var a = 0; a < particles.length; a++){
      var pa = particles[a];
      for (var b = a + 1; b < particles.length; b++){
        var pb = particles[b];
        var ddx = pa.x - pb.x, ddy = pa.y - pb.y;
        var d2 = ddx * ddx + ddy * ddy;
        if (d2 < LINK_RADIUS * LINK_RADIUS){
          var op = (1 - Math.sqrt(d2) / LINK_RADIUS) * 0.35;
          ctx.strokeStyle = "rgba(159,216,255," + op.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
    }

    // lines reaching from the cursor toward nearby particles
    if (mouse.active){
      for (var m = 0; m < particles.length; m++){
        var pm = particles[m];
        var mdx = mouse.x - pm.x, mdy = mouse.y - pm.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < MOUSE_LINK_RADIUS){
          var mop = (1 - mdist / MOUSE_LINK_RADIUS) * 0.55;
          ctx.strokeStyle = "rgba(255,209,102," + mop.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(pm.x, pm.y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,209,102,.9)";
      ctx.fill();
    }

    // flowing dashed arcs from HQ to each regional hub
    var dashPhase = -((t * 26) % 24);
    ctx.lineWidth = 1.1 / scale;
    ctx.setLineDash([2, 7]);
    for (var k = 0; k < ARCS.length; k++){
      var arc = ARCS[k];
      ctx.lineDashOffset = dashPhase;
      ctx.strokeStyle = "rgba(159,203,255,.65)";
      ctx.beginPath();
      ctx.moveTo(arc.a.x, arc.a.y);
      ctx.quadraticCurveTo(arc.c.x, arc.c.y, arc.b.x, arc.b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // pulsing hub markers
    drawHub(HOME.x, HOME.y, "255,209,102", t);
    for (var h = 0; h < HUBS.length; h++){
      drawHub(HUBS[h].x, HUBS[h].y, "159,216,255", t + h * 0.6);
    }
  }

  function drawHub(x, y, rgb, phase){
    for (var ring = 0; ring < 2; ring++){
      var local = ((phase * 0.5 + ring * 1.5) % 3) / 3;
      var r = 3 + local * 18;
      var o = (1 - local) * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + rgb + "," + Math.max(0, o).toFixed(3) + ")";
      ctx.lineWidth = 1.2 / scale;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(" + rgb + ",1)";
    ctx.shadowColor = "rgba(" + rgb + ",.9)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function draw(){
    updatePan();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // ease mouse toward target
    mouse.x += (mouseTarget.x - mouse.x) * 0.15;
    mouse.y += (mouseTarget.y - mouse.y) * 0.15;

    stepParticles();

    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * offsetX, DPR * offsetY);
    drawScene();
  }

  function tick(){
    if (!running) return;
    t += 0.016;
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
