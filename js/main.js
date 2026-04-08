/* ── Geneva Bikes — main.js ──────────────────────────────────── */

/* ── CONFIG ────────────────────────────────────────────────── */
const C = {
  bike:'#4f9cf9', ebike:'#e6431a', green:'#34c784', yellow:'#f5c842',
  purple:'#9c6fe4', muted:'#7a82a0', border:'rgba(255,255,255,.08)',
  bg:'#0f1117', bgCard:'#161b27', text:'#e8eaf2',
};
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

/* ── DATA LOADER ───────────────────────────────────────────── */
const _cache = {};
async function load(name) {
  if (_cache[name]) return _cache[name];
  const r = await fetch(`data/${name}.json`);
  _cache[name] = await r.json();
  return _cache[name];
}

/* ── TOOLTIP ───────────────────────────────────────────────── */
const tip = document.getElementById('tooltip');
function showTip(html, e) {
  tip.innerHTML = html; tip.classList.add('visible'); moveTip(e);
}
function moveTip(e) {
  const pad = 14;
  let x = e.clientX+pad, y = e.clientY+pad;
  if (x+tip.offsetWidth+10 > window.innerWidth)  x = e.clientX-tip.offsetWidth-pad;
  if (y+tip.offsetHeight+10 > window.innerHeight) y = e.clientY-tip.offsetHeight-pad;
  tip.style.left = x+'px'; tip.style.top = y+'px';
}
function hideTip() { tip.classList.remove('visible'); }
document.addEventListener('mousemove', e => { if (tip.classList.contains('visible')) moveTip(e); });

/* ── HELPERS ───────────────────────────────────────────────── */
// Always format with Swiss apostrophe: 593'129
function fmtN(n) {
  return Math.round(+n).toLocaleString('fr-CH').replace(/[\s\u00a0]/g,'\u2019');
}
// Compact for axes only
function fmtAxis(n) {
  return n>=1e6?(n/1e6).toFixed(1)+'M': n>=1e3?(n/1e3).toFixed(0)+'k': n.toFixed(0);
}
function shortName(s, n=22) { return s&&s.length>n ? s.slice(0,n)+'…' : (s||''); }
function svgW(sel) { return document.querySelector(sel).getBoundingClientRect().width; }

/* ── KPI STRIP ─────────────────────────────────────────────── */
async function renderKPIs() {
  const d = await load('kpis');
  const cards = [
    { val: fmtN(d.n_trips),                        label: 'Trajets reconstitués',           sub: fmtN(Math.round(d.trips_per_day))+' / jour',        cls: 'accent' },
    { val: fmtN(d.km_total)+' km',                 label: 'Kilomètres estimés',             sub: fmtN(Math.round(d.km_total/d.n_days))+' km / jour', cls: 'green' },
    { val: d.dist_med+' km',                       label: 'Distance médiane / trajet',       sub: 'classique '+d.dist_med_bike+' · e-bike '+d.dist_med_ebike+' km', cls: '' },
    { val: d.pct_ebike_pref+'%',                   label: 'Choix e-bike si disponible',     sub: 'préférence usager',                                cls: 'yellow' },
    { val: d.speed_bike+' / '+d.speed_ebike+' km/h', label: 'Vitesse moy. classique / e-bike', sub: '+2 km/h pour l\'e-bike',                       cls: '' },
    { val: d.pct_loops+'%',                        label: 'Trajets boucles',                sub: fmtN(d.n_loops)+' trajets',                         cls: 'purple' },
    { val: d.med_dur+' min',                       label: 'Durée médiane',                  sub: 'boucles : '+d.med_dur_loops+' min',                cls: '' },
    { val: d.n_days+' jours',                      label: 'Période couverte',               sub: d.date_start+' → '+d.date_end,                      cls: '' },
  ];
  document.getElementById('kpi-grid').innerHTML = cards.map(c=>`
    <div class="kpi-card fade-in">
      <div class="kpi-value ${c.cls}">${c.val}</div>
      <div class="kpi-label">${c.label}</div>
      ${c.sub?`<div class="kpi-sub">${c.sub}</div>`:''}
    </div>`).join('');
  observeAll('.kpi-card');
}

/* ── DAILY ─────────────────────────────────────────────────── */
async function renderDaily() {
  const [daily, vac] = await Promise.all([load('daily'), load('vacances')]);
  const W = svgW('#daily-svg'), H = 280;
  const m = {top:16, right:16, bottom:32, left:50};
  const w = W-m.left-m.right, h = H-m.top-m.bottom;

  const svg = d3.select('#daily-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const parse = d3.timeParse('%Y-%m-%d');
  const data = daily.map(d=>({date:parse(d.date),bike:+d.n_bike||0,ebike:+d.n_ebike||0,total:+d.total}));
  const roll7 = data.map((d,i)=>{
    const sl=data.slice(Math.max(0,i-3),Math.min(data.length,i+4));
    return {date:d.date, v:d3.mean(sl,r=>r.total)};
  });

  const x = d3.scaleTime().domain(d3.extent(data,d=>d.date)).range([0,w]);
  const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.total)*1.08]).range([h,0]);

  vac.forEach(v=>{
    const x1=x(parse(v.start)), x2=x(parse(v.end));
    if(!isNaN(x1)) g.append('rect').attr('x',x1).attr('y',0).attr('width',Math.max(0,x2-x1)).attr('height',h).attr('fill','rgba(156,111,228,.09)');
  });

  g.append('path').datum(data).attr('fill',C.bike).attr('fill-opacity',.22)
    .attr('d',d3.area().x(d=>x(d.date)).y0(d=>y(0)).y1(d=>y(d.bike)).curve(d3.curveMonotoneX));
  g.append('path').datum(data).attr('fill',C.ebike).attr('fill-opacity',.2)
    .attr('d',d3.area().x(d=>x(d.date)).y0(d=>y(d.bike)).y1(d=>y(d.total)).curve(d3.curveMonotoneX));
  g.append('path').datum(roll7).attr('fill','none').attr('stroke',C.yellow).attr('stroke-width',2)
    .attr('d',d3.line().x(d=>x(d.date)).y(d=>y(d.v)).defined(d=>!isNaN(d.v)).curve(d3.curveMonotoneX));

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());
  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(d3.timeMonth).tickFormat(d3.timeFormat('%b %y'))).call(g=>g.select('.domain').remove());

  const vline = g.append('line').attr('stroke',C.muted).attr('stroke-width',1).attr('stroke-dasharray','4,4').attr('y1',0).attr('y2',h).attr('opacity',0);
  const bisect = d3.bisector(d=>d.date).left;
  svg.append('rect').attr('x',m.left).attr('y',m.top).attr('width',w).attr('height',h).attr('fill','transparent')
    .on('mousemove', function(event) {
      const mx = d3.pointer(event,this)[0];
      const x0 = x.invert(mx);
      const i = Math.min(bisect(data,x0,1), data.length-1);
      const d = data[i];
      if (!d) return;
      vline.attr('x1',x(d.date)).attr('x2',x(d.date)).attr('opacity',1);
      showTip(`<div class="tt-label">${d3.timeFormat('%d %b %Y')(d.date)}</div>
        <div class="tt-row"><span>Total</span><span class="tt-val">${fmtN(d.total)}</span></div>
        <div class="tt-row"><span style="color:${C.bike}">● Classique</span><span class="tt-val">${fmtN(d.bike)}</span></div>
        <div class="tt-row"><span style="color:${C.ebike}">● E-bike</span><span class="tt-val">${fmtN(d.ebike)}</span></div>`, event);
    })
    .on('mouseleave',()=>{vline.attr('opacity',0);hideTip();});
}

/* ── HEATMAP ───────────────────────────────────────────────── */
async function renderHeatmap() {
  const data = await load('heatmap');
  const W = svgW('#heatmap-svg'), H = 200;
  const m = {top:8,right:8,bottom:28,left:36};
  const w=W-m.left-m.right, h=H-m.top-m.bottom;
  const cW=w/24, cH=h/7;

  d3.select('#heatmap-svg').selectAll('*').remove();
  const svg = d3.select('#heatmap-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0,d3.max(data,d=>d.n)]);

  g.selectAll('rect').data(data).join('rect')
    .attr('x',d=>d.hour*cW+1).attr('y',d=>d.dayofweek*cH+1)
    .attr('width',cW-2).attr('height',cH-2).attr('rx',3).attr('fill',d=>color(d.n))
    .on('mouseover',(e,d)=>showTip(`<div class="tt-label">${DAYS[d.dayofweek]} ${d.hour}h–${d.hour+1}h</div><div class="tt-row"><span>Départs</span><span class="tt-val">${fmtN(d.n)}</span></div>`,e))
    .on('mouseleave',hideTip);

  g.selectAll('.day-label').data(DAYS).join('text').attr('class','day-label')
    .attr('x',-6).attr('y',(_,i)=>i*cH+cH/2).attr('text-anchor','end').attr('dominant-baseline','middle')
    .attr('fill',C.muted).attr('font-size',11).text(d=>d);
  g.append('g').attr('transform',`translate(0,${h})`).selectAll('text').data(d3.range(0,24,2)).join('text')
    .attr('x',d=>d*cW+cW/2).attr('y',14).attr('text-anchor','middle').attr('fill',C.muted).attr('font-size',10).text(d=>d+'h');
}

/* ── HOURLY ────────────────────────────────────────────────── */
async function renderHourly() {
  const data = await load('hourly');
  function draw(isWeekend) {
    const byHour = {bike:new Array(24).fill(0), ebike:new Array(24).fill(0)};
    data.filter(d=>d.is_weekend===isWeekend).forEach(d=>{byHour[d.bike_type][d.hour]=d.n;});

    const W=svgW('#hourly-svg'), H=220, m={top:8,right:16,bottom:32,left:44};
    const w=W-m.left-m.right, h=H-m.top-m.bottom, bw=w/24;

    d3.select('#hourly-svg').selectAll('*').remove();
    const svg=d3.select('#hourly-svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

    const maxY=d3.max(d3.range(24),h=>byHour.bike[h]+byHour.ebike[h])*1.12;
    const y=d3.scaleLinear().domain([0,maxY]).range([h,0]);

    g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());

    d3.range(24).forEach(hr=>{
      const x0=hr*bw+2, bw2=bw-4;
      const yb=y(byHour.bike[hr]), ye=y(byHour.bike[hr]+byHour.ebike[hr]);
      g.append('rect').attr('x',x0).attr('y',yb).attr('width',bw2).attr('height',h-yb).attr('fill',C.bike).attr('fill-opacity',.8).attr('rx',2);
      if(byHour.ebike[hr]>0) g.append('rect').attr('x',x0).attr('y',ye).attr('width',bw2).attr('height',yb-ye).attr('fill',C.ebike).attr('fill-opacity',.8).attr('rx',2);
      g.append('rect').attr('x',x0).attr('y',0).attr('width',bw2).attr('height',h).attr('fill','transparent')
        .on('mouseover',e=>showTip(`<div class="tt-label">${hr}h–${hr+1}h</div>
          <div class="tt-row"><span style="color:${C.bike}">● Classique</span><span class="tt-val">${fmtN(byHour.bike[hr])}</span></div>
          <div class="tt-row"><span style="color:${C.ebike}">● E-bike</span><span class="tt-val">${fmtN(byHour.ebike[hr])}</span></div>`,e))
        .on('mouseleave',hideTip);
    });

    g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(d3.scaleLinear().domain([0,24]).range([0,w])).ticks(24).tickFormat(d=>d%2===0?d+'h':'')).call(g=>g.select('.domain').remove());
  }
  draw(false);
  document.getElementById('btn-weekday').addEventListener('click',()=>{draw(false);document.getElementById('btn-weekday').classList.add('active');document.getElementById('btn-weekend').classList.remove('active');});
  document.getElementById('btn-weekend').addEventListener('click',()=>{draw(true);document.getElementById('btn-weekend').classList.add('active');document.getElementById('btn-weekday').classList.remove('active');});
}

/* ── MONTHLY ───────────────────────────────────────────────── */
async function renderMonthly() {
  const data = await load('monthly');
  const bm={};
  data.forEach(d=>{if(!bm[d.month])bm[d.month]={bike:0,ebike:0};bm[d.month][d.bike_type]=d.n;});
  const months=Object.keys(bm).sort();
  const vals=months.map(m=>({m,bike:bm[m].bike||0,ebike:bm[m].ebike||0}));

  const W=svgW('#monthly-svg'),H=200,m={top:8,right:16,bottom:42,left:44};
  const w=W-m.left-m.right,h=H-m.top-m.bottom;

  d3.select('#monthly-svg').selectAll('*').remove();
  const svg=d3.select('#monthly-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const x=d3.scaleBand().domain(months).range([0,w]).padding(.25);
  const y=d3.scaleLinear().domain([0,d3.max(vals,d=>d.bike+d.ebike)*1.12]).range([h,0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());

  vals.forEach(v=>{
    const xp=x(v.m);
    g.append('rect').attr('x',xp).attr('y',y(v.bike)).attr('width',x.bandwidth()).attr('height',h-y(v.bike)).attr('fill',C.bike).attr('fill-opacity',.82).attr('rx',2);
    if(v.ebike>0) g.append('rect').attr('x',xp).attr('y',y(v.bike+v.ebike)).attr('width',x.bandwidth()).attr('height',y(v.bike)-y(v.bike+v.ebike)).attr('fill',C.ebike).attr('fill-opacity',.82).attr('rx',2);
    g.append('rect').attr('x',xp).attr('y',0).attr('width',x.bandwidth()).attr('height',h).attr('fill','transparent')
      .on('mouseover',e=>showTip(`<div class="tt-label">${v.m}</div>
        <div class="tt-row"><span style="color:${C.bike}">● Classique</span><span class="tt-val">${fmtN(v.bike)}</span></div>
        <div class="tt-row"><span style="color:${C.ebike}">● E-bike</span><span class="tt-val">${fmtN(v.ebike)}</span></div>
        <div class="tt-row"><span>Total</span><span class="tt-val">${fmtN(v.bike+v.ebike)}</span></div>`,e))
      .on('mouseleave',hideTip);
  });

  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d=>{const p=d.split('-');return ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][+p[1]]+' '+p[0].slice(2);})).call(g=>g.select('.domain').remove());
}

/* ── MAP ───────────────────────────────────────────────────── */
/* ── LOOPS MAP (LEAFLET VERSION) ─────────────────────────── */
async function renderLoopsMap() {
  const [data, topLoops] = await Promise.all([load('loops_spatial'), load('top_loops')]);

  // 1. Remplissage de la liste Top 20 (Barres)
  const maxN = topLoops[0].n;
  document.getElementById('top-loops-bars').innerHTML = topLoops.map(d => `
    <div class="bar-row" title="${d.name}">
      <div class="bar-label">${shortName(d.name, 22)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${d.n / maxN * 100}%;background:${C.purple}"></div></div>
      <div class="bar-val" style="font-size:.72rem;color:var(--muted)">${fmtN(d.n)} <span style="color:${C.muted};">(${d.dur_med}m)</span></div>
    </div>`).join('');

  // 2. Initialisation de la carte Leaflet
  // Note : utilise 'loops-map-container' comme ID (voir étape HTML plus bas)
  const map = L.map('loops-map-container', { zoomControl: true, attributionControl: false }).setView([46.2044, 6.1432], 13);
  
  // Fond de carte sombre identique à ta première carte
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

  const maxLoops = d3.max(data, d => d.n_loops);
  const rScale = d3.scaleSqrt().domain([0, maxLoops]).range([4, 22]);
  
  // Échelle de couleur violette pour les boucles
  const colorScale = d3.scaleSequential(t => d3.interpolatePurples(0.2 + t * 0.8)).domain([0, maxLoops]);

  data.forEach(d => {
    if (!d.latitude || d.n_loops === 0) return;

    const marker = L.circleMarker([d.latitude, d.longitude], {
      radius: rScale(d.n_loops),
      fillColor: colorScale(d.n_loops),
      color: 'rgba(255,255,255,0.2)', // Bordure fine blanche
      weight: 1,
      fillOpacity: 0.7
    }).addTo(map);

    // Tooltip identique à ton système actuel
    marker.on('mouseover', e => showTip(`
      <div class="tt-label">${d.name}</div>
      <div class="tt-row"><span>Boucles</span><span class="tt-val">${fmtN(d.n_loops)}</span></div>
      <div class="tt-row"><span>Durée méd.</span><span class="tt-val">${d.dur_med || '?'} min</span></div>`, e.originalEvent));
    
    marker.on('mouseout', hideTip);
  });
}

  document.getElementById('btn-show-stations').addEventListener('click',function(){
    this.classList.toggle('active');
    if(this.classList.contains('active')) stationLayer.addTo(map); else map.removeLayer(stationLayer);
  });
  document.getElementById('btn-show-od').addEventListener('click',function(){
    this.classList.toggle('active');
    if(this.classList.contains('active')) odLayer.addTo(map); else map.removeLayer(odLayer);
  });


/* ── TOP OD BARS ───────────────────────────────────────────── */
async function renderTopOD() {
  const data = await load('top_od');
  const maxN = data[0].n;
  document.getElementById('top-od-bars').innerHTML = data.slice(0,15).map(d=>`
    <div class="bar-row" title="${d.dep} → ${d.arr}">
      <div class="bar-label">${shortName(d.dep,11)} → ${shortName(d.arr,11)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${d.n/maxN*100}%;background:${C.bike}"></div></div>
      <div class="bar-val">${fmtN(d.n)}</div>
    </div>`).join('');
}

/* ── EBIKE PREFERENCE ──────────────────────────────────────── */
async function renderEbikePref() {
  const {global:avg, by_hour} = await load('ebike_pref');
  document.getElementById('pct-ebike-val').textContent = avg.toFixed(1)+'%';

  const W=svgW('#ebike-pref-svg'),H=180,m={top:8,right:16,bottom:28,left:40};
  const w=W-m.left-m.right,h=H-m.top-m.bottom;
  d3.select('#ebike-pref-svg').selectAll('*').remove();
  const svg=d3.select('#ebike-pref-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const x=d3.scaleBand().domain(by_hour.map(d=>d.hour)).range([0,w]).padding(.15);
  const y=d3.scaleLinear().domain([0,100]).range([h,0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(d=>d+'%')).call(g=>g.select('.domain').remove());

  g.selectAll('rect').data(by_hour).join('rect')
    .attr('x',d=>x(d.hour)).attr('y',d=>y(d.pct)).attr('width',x.bandwidth()).attr('height',d=>h-y(d.pct))
    .attr('fill',d=>d.pct>=avg?C.ebike:'rgba(230,67,26,.3)').attr('rx',2)
    .on('mouseover',(e,d)=>showTip(`<div class="tt-label">${d.hour}h–${d.hour+1}h</div><div class="tt-row"><span>% e-bike choisi</span><span class="tt-val">${d.pct}%</span></div>`,e))
    .on('mouseleave',hideTip);

  g.append('line').attr('x1',0).attr('x2',w).attr('y1',y(avg)).attr('y2',y(avg))
    .attr('stroke','white').attr('stroke-width',1.5).attr('stroke-dasharray','5,3').attr('opacity',.55);
  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickValues(by_hour.filter((_,i)=>i%2===0).map(d=>d.hour)).tickFormat(d=>d+'h')).call(g=>g.select('.domain').remove());
}

/* ── DURATION ──────────────────────────────────────────────── */
async function renderDuration() {
  const {bins,bike,ebike,median_all,median_bike,median_ebike} = await load('duration');
  const W=svgW('#duration-svg'),H=200,m={top:8,right:16,bottom:28,left:44};
  const w=W-m.left-m.right,h=H-m.top-m.bottom,bw=w/bins.length;

  d3.select('#duration-svg').selectAll('*').remove();
  const svg=d3.select('#duration-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const maxY=d3.max(bins.map((_,i)=>bike[i]+ebike[i]))*1.1;
  const y=d3.scaleLinear().domain([0,maxY]).range([h,0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());

  bins.forEach((b,i)=>{
    const x0=i*bw+1,bw2=bw-2;
    g.append('rect').attr('x',x0).attr('y',y(bike[i])).attr('width',bw2).attr('height',h-y(bike[i])).attr('fill',C.bike).attr('fill-opacity',.75).attr('rx',2);
    if(ebike[i]>0) g.append('rect').attr('x',x0).attr('y',y(bike[i]+ebike[i])).attr('width',bw2).attr('height',y(bike[i])-y(bike[i]+ebike[i])).attr('fill',C.ebike).attr('fill-opacity',.75).attr('rx',2);
    g.append('rect').attr('x',x0).attr('y',0).attr('width',bw2).attr('height',h).attr('fill','transparent')
      .on('mouseover',e=>showTip(`<div class="tt-label">${b}–${b+5} min</div>
        <div class="tt-row"><span style="color:${C.bike}">● Classique</span><span class="tt-val">${fmtN(bike[i])}</span></div>
        <div class="tt-row"><span style="color:${C.ebike}">● E-bike</span><span class="tt-val">${fmtN(ebike[i])}</span></div>`,e))
      .on('mouseleave',hideTip);
  });

  // Median line (no 30min line)
  const xMed = (median_all/5)*bw;
  g.append('line').attr('x1',xMed).attr('x2',xMed).attr('y1',0).attr('y2',h)
    .attr('stroke','rgba(255,255,255,.55)').attr('stroke-width',2).attr('stroke-dasharray','5,3');
  g.append('text').attr('x',xMed+4).attr('y',14).attr('fill','rgba(255,255,255,.7)').attr('font-size',10)
    .text(`Méd. ${median_all} min`);

  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(d3.scaleLinear().domain([0,bins.length]).range([0,w])).ticks(bins.length/2).tickFormat(d=>bins[d]!=null?bins[d]+'min':'')).call(g=>g.select('.domain').remove());
}

/* ── OD MATRIX (10×10) ─────────────────────────────────────── */
async function renderODMatrix() {
  const data = await load('od_matrix');
  const stations = [...new Set(data.map(d=>d.dep))];
  const n = stations.length;
  const si = Object.fromEntries(stations.map((s,i)=>[s,i]));
  const grid = Array.from({length:n},()=>new Array(n).fill(0));
  data.forEach(d=>{grid[si[d.dep]][si[d.arr]]=d.n;});

  const W=svgW('#odmatrix-svg'),H=Math.min(W*0.85,560);
  const m={top:88,right:12,bottom:12,left:140};
  const cell=(W-m.left-m.right)/n;
  const maxVal=d3.max(data.filter(d=>!d.is_loop),d=>d.n);
  const color=d3.scaleSequential(d3.interpolateBlues).domain([0,maxVal]);

  d3.select('#odmatrix-svg').selectAll('*').remove();
  const svg=d3.select('#odmatrix-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  stations.forEach((dep,di)=>{
    stations.forEach((arr,ai)=>{
      const v=grid[di][ai];
      const isLoop=(di===ai);
      g.append('rect').attr('x',ai*cell).attr('y',di*cell).attr('width',cell-2).attr('height',cell-2).attr('rx',3)
        .attr('fill',isLoop?'rgba(156,111,228,.42)':(v===0?'rgba(255,255,255,.03)':color(v)))
        .attr('stroke',isLoop?'rgba(156,111,228,.6)':'transparent').attr('stroke-width',1);
      if(v>0&&cell>20){
        g.append('text').attr('x',ai*cell+cell/2).attr('y',di*cell+cell/2)
          .attr('text-anchor','middle').attr('dominant-baseline','middle')
          .attr('fill',isLoop?'#ce93d8':(v>maxVal*.4?'#fff':C.muted))
          .attr('font-size',Math.min(cell*.38,11)).text(v);
      }
      if(v>0){
        g.append('rect').attr('x',ai*cell).attr('y',di*cell).attr('width',cell).attr('height',cell).attr('fill','transparent')
          .on('mouseover',e=>showTip(`<div class="tt-label">${shortName(dep,20)} → ${shortName(arr,20)}</div>
            <div class="tt-row"><span>Trajets</span><span class="tt-val">${fmtN(v)}</span></div>
            ${isLoop?'<div class="tt-row"><span style="color:#9c6fe4">● Boucle</span></div>':''}`,e))
          .on('mouseleave',hideTip);
      }
    });
  });

  stations.forEach((s,i)=>{
    g.append('text').attr('x',i*cell+cell/2).attr('y',-6).attr('text-anchor','start').attr('fill',C.muted).attr('font-size',9)
      .attr('transform',`rotate(-45,${i*cell+cell/2},-6)`).text(shortName(s,16));
    g.append('text').attr('x',-6).attr('y',i*cell+cell/2).attr('text-anchor','end').attr('dominant-baseline','middle').attr('fill',C.muted).attr('font-size',9).text(shortName(s,22));
  });
}

/* ── LOOPS MAP ─────────────────────────────────────────────── */
async function renderLoopsMap() {
  const data = await load('loops_spatial');
  const topLoops = await load('top_loops');

  // Top loops bar chart
  const maxN = topLoops[0].n;
  document.getElementById('top-loops-bars').innerHTML = topLoops.map(d=>`
    <div class="bar-row" title="${d.name}">
      <div class="bar-label">${shortName(d.name,22)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${d.n/maxN*100}%;background:${C.purple}"></div></div>
      <div class="bar-val" style="font-size:.72rem;color:var(--muted)">${fmtN(d.n)} <span style="color:${C.muted};">(${d.dur_med}m)</span></div>
    </div>`).join('');

  // Scatter map with purple circles
  const W=svgW('#loops-map-svg'), H=Math.round(W*0.7);
  d3.select('#loops-map-svg').attr('viewBox',`0 0 ${W} ${H}`);

  const lats = data.map(d=>d.latitude).filter(Boolean);
  const lons = data.map(d=>d.longitude).filter(Boolean);
  const latExt = d3.extent(lats), lonExt = d3.extent(lons);
  const pad = 20;

  const xS = d3.scaleLinear().domain(lonExt).range([pad, W-pad]);
  const yS = d3.scaleLinear().domain(latExt).range([H-pad, pad]);

  const maxLoops = d3.max(data,d=>d.n_loops);
  const rScale = d3.scaleSqrt().domain([0,maxLoops]).range([2,22]);
  const colorScale = d3.scaleSequential(t=>d3.interpolatePurples(.15+t*.8)).domain([0,maxLoops]);

  const svg = d3.select('#loops-map-svg');
  svg.selectAll('*').remove();

  // Background
  svg.append('rect').attr('width',W).attr('height',H).attr('fill','var(--bg-card)').attr('rx',8);

  svg.selectAll('circle').data(data.filter(d=>d.latitude)).join('circle')
    .attr('cx',d=>xS(d.longitude)).attr('cy',d=>yS(d.latitude))
    .attr('r',d=>rScale(d.n_loops)).attr('fill',d=>colorScale(d.n_loops)).attr('fill-opacity',.75)
    .attr('stroke','rgba(156,111,228,.3)').attr('stroke-width',.5)
    .on('mouseover',(e,d)=>{
      if(d.n_loops>0) showTip(`<div class="tt-label">${d.name}</div><div class="tt-row"><span>Boucles</span><span class="tt-val">${fmtN(d.n_loops)}</span></div>`,e);
    })
    .on('mouseleave',hideTip);

  // Annotate top 5
  data.sort((a,b)=>b.n_loops-a.n_loops).slice(0,5).forEach(d=>{
    if(!d.latitude) return;
    svg.append('text').attr('x',xS(d.longitude)+rScale(d.n_loops)+3).attr('y',yS(d.latitude))
      .attr('dominant-baseline','middle').attr('fill','rgba(255,255,255,.7)')
      .attr('font-size',9).text(shortName(d.name,18));
  });
}

/* ── ZONE FLOW ─────────────────────────────────────────────── */
async function renderZoneFlow() {
  const data = await load('zone_flow');
  const zones = ['Centre (<1.5km)','Proche (1.5-3km)','Périphérie (>3km)'];
  const zShort = ['Centre','Proche','Périphérie'];
  const n=zones.length;
  const mat=Array.from({length:n},()=>new Array(n).fill(0));
  const zi=Object.fromEntries(zones.map((z,i)=>[z,i]));
  data.forEach(d=>{const di=zi[d.zone_dep],ai=zi[d.zone_arr];if(di!=null&&ai!=null)mat[di][ai]=d.n;});
  const maxVal=d3.max(mat.flat());

  let html='<table class="data-table"><thead><tr><th></th>'+zShort.map(z=>`<th style="text-align:right">${z}</th>`).join('')+'</tr></thead><tbody>';
  zones.forEach((dep,di)=>{
    html+=`<tr><td style="color:var(--text);font-weight:600">${zShort[di]}</td>`;
    zones.forEach((_,ai)=>{
      const v=mat[di][ai];
      const bg=di===ai?'rgba(156,111,228,.15)':`rgba(79,156,249,${v/maxVal*.35})`;
      html+=`<td style="background:${bg};text-align:right;font-family:var(--mono);font-size:.8rem">${fmtN(v)}</td>`;
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  document.getElementById('zone-flow-table').innerHTML=html;
}

/* ── WEATHER SCATTER ───────────────────────────────────────── */
async function renderWeather() {
  const d = await load('weather_corr');
  const kpis = await load('kpis');

  document.getElementById('r-temp-val').textContent = '+'+d.r_temp.toFixed(3);
  document.getElementById('slope-temp').textContent  = Math.abs(d.reg_temp.m).toFixed(0);
  document.getElementById('spd-bike-val').textContent  = kpis.speed_bike+' km/h';
  document.getElementById('spd-ebike-val').textContent = kpis.speed_ebike+' km/h';

  const data = d.scatter.filter(r=>r.temp_mean!=null&&r.n_trips!=null);
  const W=svgW('#scatter-temp-svg'),H=240,m={top:12,right:16,bottom:38,left:52};
  const w=W-m.left-m.right,h=H-m.top-m.bottom;

  d3.select('#scatter-temp-svg').selectAll('*').remove();
  const svg=d3.select('#scatter-temp-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const x=d3.scaleLinear().domain(d3.extent(data,r=>r.temp_mean)).nice().range([0,w]);
  const y=d3.scaleLinear().domain([0,d3.max(data,r=>r.n_trips)*1.1]).range([h,0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());
  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(7).tickFormat(dd=>dd+'°C')).call(g=>g.select('.domain').remove());

  // Regression line
  const x0=d3.min(data,r=>r.temp_mean), x1=d3.max(data,r=>r.temp_mean);
  g.append('line').attr('x1',x(x0)).attr('x2',x(x1)).attr('y1',y(d.reg_temp.m*x0+d.reg_temp.b)).attr('y2',y(d.reg_temp.m*x1+d.reg_temp.b))
    .attr('stroke',C.green).attr('stroke-width',2).attr('stroke-dasharray','6,3').attr('opacity',.85);

  g.selectAll('circle').data(data).join('circle')
    .attr('cx',r=>x(r.temp_mean)).attr('cy',r=>y(r.n_trips)).attr('r',4)
    .attr('fill',r=>r.rainy?C.bike:C.yellow).attr('fill-opacity',.7).attr('stroke','rgba(0,0,0,.15)').attr('stroke-width',.5)
    .on('mouseover',(e,r)=>showTip(`<div class="tt-label">${r.date}</div>
      <div class="tt-row"><span>Température</span><span class="tt-val">${r.temp_mean.toFixed(1)}°C</span></div>
      <div class="tt-row"><span>Trajets</span><span class="tt-val">${fmtN(r.n_trips)}</span></div>`,e))
    .on('mouseleave',hideTip);

  svg.append('text').attr('x',m.left+8).attr('y',m.top+18).attr('fill',C.green).attr('font-size',12).attr('font-weight',700).text(`r = +${d.r_temp.toFixed(3)}`);

  g.append('text').attr('x',w/2).attr('y',h+32).attr('text-anchor','middle').attr('fill',C.muted).attr('font-size',11).text('Température moyenne journalière (°C)');
  g.append('text').attr('transform','rotate(-90)').attr('x',-h/2).attr('y',-40).attr('text-anchor','middle').attr('fill',C.muted).attr('font-size',11).text('Trajets / jour');
}

/* ── SPEED HISTOGRAM ───────────────────────────────────────── */
async function renderSpeed() {
  const d = await load('speed');
  const W=svgW('#speed-svg'),H=200,m={top:8,right:16,bottom:32,left:44};
  const w=W-m.left-m.right,h=H-m.top-m.bottom;
  const bw=w/d.bins.length;

  d3.select('#speed-svg').selectAll('*').remove();
  const svg=d3.select('#speed-svg').attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${m.left},${m.top})`);

  const maxY=d3.max(d.bins.map((_,i)=>d.bike[i]+d.ebike[i]))*1.12;
  const y=d3.scaleLinear().domain([0,maxY]).range([h,0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(fmtAxis)).call(g=>g.select('.domain').remove());

  d.bins.forEach((b,i)=>{
    const x0=i*bw+1,bw2=bw-2;
    g.append('rect').attr('x',x0).attr('y',y(d.bike[i])).attr('width',bw2).attr('height',h-y(d.bike[i])).attr('fill',C.bike).attr('fill-opacity',.75).attr('rx',1);
    if(d.ebike[i]>0) g.append('rect').attr('x',x0).attr('y',y(d.bike[i]+d.ebike[i])).attr('width',bw2).attr('height',y(d.bike[i])-y(d.bike[i]+d.ebike[i])).attr('fill',C.ebike).attr('fill-opacity',.75).attr('rx',1);
    g.append('rect').attr('x',x0).attr('y',0).attr('width',bw2).attr('height',h).attr('fill','transparent')
      .on('mouseover',e=>showTip(`<div class="tt-label">${b}–${b+1} km/h</div>
        <div class="tt-row"><span style="color:${C.bike}">● Classique</span><span class="tt-val">${fmtN(d.bike[i])}</span></div>
        <div class="tt-row"><span style="color:${C.ebike}">● E-bike</span><span class="tt-val">${fmtN(d.ebike[i])}</span></div>`,e))
      .on('mouseleave',hideTip);
  });

  // Mean lines
  [[d.mean_bike,C.bike,'Moy. classique'],[d.mean_ebike,C.ebike,'Moy. e-bike']].forEach(([mean,col,lbl])=>{
    const xm=(mean-d.bins[0])*bw;
    g.append('line').attr('x1',xm).attr('x2',xm).attr('y1',0).attr('y2',h).attr('stroke',col).attr('stroke-width',2).attr('stroke-dasharray','5,3');
    g.append('text').attr('x',xm+3).attr('y',14).attr('fill',col).attr('font-size',9).attr('font-weight',700).text(`${lbl}: ${mean} km/h`);
  });

  g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(d3.scaleLinear().domain([0,d.bins.length]).range([0,w])).ticks(8).tickFormat(i=>d.bins[Math.round(i)]!=null?d.bins[Math.round(i)]+' km/h':'')).call(g=>g.select('.domain').remove());
  g.append('text').attr('x',w/2).attr('y',h+28).attr('text-anchor','middle').attr('fill',C.muted).attr('font-size',10).text('Vitesse estimée (km/h)');
}

/* ── NAV HIGHLIGHT ─────────────────────────────────────────── */
function initNav() {
  const io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        document.querySelectorAll('.nav-links a').forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+en.target.id));
      }
    });
  },{rootMargin:'-40% 0px -55% 0px'});
  document.querySelectorAll('section[id]').forEach(s=>io.observe(s));
}

/* ── FADE IN ────────────────────────────────────────────────── */
function observeAll(sel) {
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.08});
  document.querySelectorAll(sel).forEach(el=>io.observe(el));
}

/* ── BOOT ───────────────────────────────────────────────────── */
async function boot() {
  initNav();
  observeAll('.fade-in');
  await renderKPIs();
  await Promise.all([
    renderDaily(), renderHeatmap(), renderHourly(), renderMonthly(),
    renderTopOD(), renderEbikePref(), renderDuration(),
    renderZoneFlow(), renderWeather(), renderSpeed(),
    renderODMatrix(), renderLoopsMap(),
  ]);
  await renderMap();
}

document.addEventListener('DOMContentLoaded', boot);

let _rto;
window.addEventListener('resize', ()=>{
  clearTimeout(_rto);
  _rto = setTimeout(()=>{
    renderDaily(); renderHeatmap(); renderHourly(); renderMonthly();
    renderEbikePref(); renderDuration(); renderODMatrix();
    renderWeather(); renderSpeed(); renderLoopsMap();
  }, 280);
});
