/* Rendering uses the exported c2w matrices. Intermediate display poses interpolate
   control samples only for visualization; they are not extra model inputs. */
(()=>{
 const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
 function interpolate(a,b,t){
  const yaw=m=>Math.atan2(m[0][2],m[2][2]),pitch=m=>Math.asin(Math.max(-1,Math.min(1,-m[1][2])));
  let ya=yaw(a),delta=yaw(b)-ya;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
  const y=ya+delta*t,p=pitch(a)+(pitch(b)-pitch(a))*t,c=Math.cos(y),s=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
  return {position:mix(a.slice(0,3).map(r=>r[3]),b.slice(0,3).map(r=>r[3]),t),rotation:[[c,s*sp,s*cp],[0,cp,-sp],[-s,c*sp,c*cp]],yaw:y,pitch:p};
 }
 function view(canvas,{yaw=-.5,pitch=.65,zoom=2.2}={}){
  const ctx=canvas.getContext('2d'),initial={yaw,pitch,zoom};let drag=null;
  const v={ctx,yaw,pitch,zoom,width:1,height:1};
  v.resize=()=>{v.width=canvas.clientWidth;v.height=canvas.clientHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(v.width*d);canvas.height=Math.round(v.height*d);ctx.setTransform(d,0,0,d,0,0)};
  new ResizeObserver(v.resize).observe(canvas);
  v.project=p=>{const cy=Math.cos(v.yaw),sy=Math.sin(v.yaw),cp=Math.cos(v.pitch),sp=Math.sin(v.pitch),x=cy*p[0]+sy*p[2],z=-sy*p[0]+cy*p[2],y=cp*p[1]-sp*z,d=sp*p[1]+cp*z+5;return [v.width/2+x/d*v.height*v.zoom,v.height/2+y/d*v.height*v.zoom,d]};
  v.line=(points,color,width=1)=>{ctx.beginPath();points.forEach((p,i)=>{const q=v.project(p);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
  v.dot=(p,color,r=3)=>{const q=v.project(p);ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()};
  v.text=(p,text,color)=>{const q=v.project(p);ctx.fillStyle=color;ctx.font='10px "DM Sans",sans-serif';ctx.fillText(text,q[0]+5,q[1]-5)};
  v.frustum=(pos,rot,size,color,axes=false,ratios=[.8,.45])=>{
   const transform=p=>pos.map((x,i)=>x+rot[i].reduce((s,c,j)=>s+c*p[j],0));
   const corners=[[-ratios[0]*size,-ratios[1]*size,size],[ratios[0]*size,-ratios[1]*size,size],[ratios[0]*size,ratios[1]*size,size],[-ratios[0]*size,ratios[1]*size,size]].map(transform);
   v.line([...corners,corners[0]],color,1.5);corners.forEach(p=>v.line([pos,p],color,1));v.dot(pos,color,3);
   if(axes)[['X','#d36e64'],['Y','#72a673'],['Z','#739fcf']].forEach(([name,c],i)=>{const p=[0,0,0];p[i]=size*1.5;const end=transform(p);v.line([pos,end],c,2);v.text(end,name,c)});
  };
  canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)};
  canvas.onpointermove=e=>{if(!drag)return;v.yaw+=(e.clientX-drag[0])*.007;v.pitch=Math.max(-1.4,Math.min(1.4,v.pitch+(e.clientY-drag[1])*.007));drag=[e.clientX,e.clientY]};
  canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
  canvas.addEventListener('wheel',e=>{e.preventDefault();v.zoom=Math.max(.5,Math.min(5,v.zoom*Math.exp(-e.deltaY*.001)))},{passive:false});
  canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')v.yaw-=.1;if(e.key==='ArrowRight')v.yaw+=.1;if(e.key==='ArrowUp')v.pitch-=.1;if(e.key==='ArrowDown')v.pitch+=.1;if(e.key==='+')v.zoom=Math.min(5,v.zoom*1.1);if(e.key==='-')v.zoom=Math.max(.5,v.zoom/1.1)};
  v.reset=()=>Object.assign(v,initial);return v;
 }
 window.WorldPrismView=view;
 window.WorldPrismPose={mount(canvas){
  const v=view(canvas);let records=[],info=null,frame=0,positions=[],center=[0,0,0],scale=1,visible=false,ratios=[.8,.45];
  new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(canvas);
  const normalize=p=>p.map((x,i)=>(x-center[i])/scale);
  function set(pair){info=pair;records=window.WORLDPRISM_POSES[pair.id]||[];const K=records[0].K;ratios=[K[0][2]/K[0][0],K[1][2]/K[1][1]];positions=records.map(r=>r.extrinsic.slice(0,3).map(row=>row[3]));center=[0,1,2].map(i=>(Math.min(...positions.map(p=>p[i]))+Math.max(...positions.map(p=>p[i])))/2);scale=Math.max(.5,...[0,1,2].map(i=>Math.max(...positions.map(p=>p[i]))-Math.min(...positions.map(p=>p[i]))))/2;frame=0;v.reset()}
  document.querySelector('#pose-reset').onclick=v.reset;
  window.addEventListener('worldprism:time',e=>frame=e.detail.frame);
  let last=0;
  function draw(t){requestAnimationFrame(draw);if(!visible||!records.length||t-last<25)return;last=t;const c=v.ctx;c.clearRect(0,0,v.width,v.height);
   for(let i=-2;i<=2;i++){v.line([[i,0,-2],[i,0,2]],'#e3e8dc');v.line([[-2,0,i],[2,0,i]],'#e3e8dc')}
   const path=positions.map(normalize),j=Math.min(records.length-1,frame/4),lo=Math.floor(j),hi=Math.min(lo+1,records.length-1),pose=interpolate(records[lo].extrinsic,records[hi].extrinsic,j-lo),p=normalize(pose.position);
   v.line(path,'#b7c2ac',2);v.line([...path.slice(0,lo+1),p],'#668b48',2.5);
   [0,.25,.5,.75,1].map(t=>Math.round(t*(records.length-1))).forEach(i=>v.frustum(path[i],records[i].extrinsic.slice(0,3).map(r=>r.slice(0,3)),.13,'#b6c6a7',false,ratios));
   const closed=Math.hypot(...positions.at(-1).map((x,i)=>x-positions[0][i]))<1e-5;v.dot(path[0],'#c39447',4);v.text(path[0],closed?'START / END':'START','#8b744a');if(!closed){v.dot(path.at(-1),'#637d4a',4);v.text(path.at(-1),'END','#637d4a')}v.frustum(p,pose.rotation,.32,'#3e6e35',true,ratios);
   document.querySelector('#pose-frame').textContent=`FRAME ${Math.min(info.frames,Math.floor(frame+1e-5)+1)} / ${info.frames}`;
   document.querySelector('#pose-angles').textContent=`Yaw ${Math.round(pose.yaw*180/Math.PI)}° · Pitch ${Math.round(pose.pitch*180/Math.PI)}°`;
  }requestAnimationFrame(draw);return {set};
 }};
})();
