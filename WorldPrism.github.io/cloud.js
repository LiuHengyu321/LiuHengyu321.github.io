(()=>{
 const pairs=window.WORLDPRISM_COMPARISONS||[];if(!pairs.length)return;
 const section=document.querySelector('#cloud-section'),select=document.querySelector('#cloud-select'),canvases=[document.querySelector('#cloud-baseline'),document.querySelector('#cloud-ours')];section.hidden=false;
 const views=canvases.map(c=>window.WorldPrismView(c,{yaw:.2,pitch:-.35,zoom:2.6}));
 let data=null,frame=0,visible=false,auto=false,last=0,active=0,activeScene=pairs[0].id;
 pairs.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title;select.append(o)});
 canvases.forEach((canvas,i)=>['pointerdown','wheel','keydown'].forEach(event=>canvas.addEventListener(event,()=>active=i)));
 function sync(){const source=views[active],target=views[1-active];target.yaw=source.yaw;target.pitch=source.pitch;target.zoom=source.zoom}
 function plotMotion(pair){
  const charts=[];
  for(const [key,profile,label,unit] of [['translation_p95','translation_profile','Estimated camera translation','× scene depth'],['rotation_p95_deg','rotation_profile_deg','Estimated camera rotation','°']]){
   if(key==='translation_p95'&&!pair.motion.active_components[key])continue;
   const series=['worldplay','worldprism'].map(m=>pair.motion.metrics[m][profile]),peak=Math.max(key==='translation_p95'?.05:5,...series.flat())*1.12;
   const x=i=>40+i/(pair.frames-1)*920,y=a=>122-a/peak*96,format=v=>key==='translation_p95'?v.toFixed(3):v.toFixed(1);
   const curves=series.map((values,k)=>`<polyline points="${values.map((a,i)=>`${x(i).toFixed(2)},${y(a).toFixed(2)}`).join(' ')}" fill="none" stroke="${k?'#4e713b':'#ba8841'}" stroke-width="2.5"/>`).join('');
   charts.push(`<div class="motion-chart"><div class="motion-legend"><span>${label}</span><span class="baseline-key">WorldPlay ${format(pair.motion.metrics.worldplay[key])}${unit}</span><span class="ours-key">WorldPrism ${format(pair.motion.metrics.worldprism[key])}${unit}</span><small>95th-percentile amplitude</small></div><svg viewBox="0 0 1000 150" role="img" aria-label="${label}: both models on the same scale"><path d="M40 25V122H960" fill="none" stroke="#d0d6c9"/><text x="4" y="30">${format(peak)}${key==='rotation_p95_deg'?'°':''}</text><text x="20" y="126">0</text><text x="40" y="145">0 s</text><text x="930" y="145">${((pair.frames-1)/pair.fps).toFixed(1)} s</text>${curves}<line class="motion-cursor" x1="40" x2="40" y1="25" y2="122" stroke="#17271f" stroke-dasharray="3 4"/></svg></div>`);
  }
  document.querySelector('#motion-plot').innerHTML=charts.join('');
 }
 function load(){data=(window.WORLDPRISM_PAIRED_CLOUDS||{})[select.value];views.forEach(v=>v.reset());active=0;const pair=pairs.find(p=>p.id===select.value);const info=pair.motion;if(info){const values=[];if(info.active_components.translation_p95)values.push(`Translation ${info.ratios.translation_p95.toFixed(2)}×`);else values.push('Translation near zero (both)');if(info.active_components.rotation_p95_deg)values.push(`Rotation ${info.ratios.rotation_p95_deg.toFixed(2)}×`);else values.push('Rotation under 5° (both)');document.querySelector('#motion-match').replaceChildren();for(const label of [...values,'WorldPrism / WorldPlay · estimated output amplitude']){const span=document.createElement('span');span.textContent=label;document.querySelector('#motion-match').append(span)}document.querySelector('#motion-report').href=pair.motion_report;plotMotion(pair)}}
 select.onchange=()=>{load();if(select.value!==activeScene)window.dispatchEvent(new CustomEvent('worldprism:select',{detail:{id:select.value}}))};
 window.addEventListener('worldprism:scene',e=>{activeScene=e.detail.pair.id;select.value=activeScene;load()});
 window.addEventListener('worldprism:time',e=>{frame=e.detail.frame;const x=40+frame/(e.detail.pair.frames-1)*920;document.querySelectorAll('.motion-cursor').forEach(cursor=>{cursor.setAttribute('x1',x);cursor.setAttribute('x2',x)})});
 new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(section);
 document.querySelector('#cloud-reset').onclick=()=>{views.forEach(v=>v.reset());active=0};
 const toggle=document.querySelector('#cloud-rotate');toggle.onclick=()=>{auto=!auto;toggle.textContent=auto?'Pause rotation Ⅱ':'Rotate both ▷'};
 function draw(t){requestAnimationFrame(draw);if(!visible||!data||t-last<40)return;const dt=Math.min((t-last)/1000,.1);last=t;if(auto)views[active].yaw+=dt*.12;sync();
  ['worldplay','worldprism'].forEach((model,index)=>{const d=data.models[model],v=views[index],c=v.ctx;c.fillStyle='#101d18';c.fillRect(0,0,v.width,v.height);
   for(let i=0;i<d.points.length;i++){const [x,y,z]=v.project(d.points[i]);if(z<.2||x<0||x>v.width||y<0||y>v.height)continue;const rgb=d.colors[i];c.fillStyle=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;const size=Math.max(1,3.6*v.zoom/z);c.fillRect(x,y,size,size)}
   v.line(d.cameras,'#e1ae5e',1.7);const n=d.frame_count,idx=Math.min(n-1,Math.max(0,Math.floor(frame)));
   for(let i=0;i<n;i+=Math.max(1,Math.floor(n/8)))v.frustum(d.cameras[i],d.cameraRotations[i],.055,'#bd975b',false,d.frustumRatios[i]);
   v.frustum(d.cameras[idx],d.cameraRotations[idx],.13,'#ffde91',true,d.frustumRatios[idx]);
   section.querySelectorAll('.cloud-frame')[index].textContent=`CAMERA ${idx+1} / ${n}`;
  });
 }load();requestAnimationFrame(draw);
})();
