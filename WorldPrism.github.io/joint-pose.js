/* Draw both requested input paths at one common scale, with unwrapped yaw. */
(()=>{const originalPose=window.WorldPrismPose;window.WorldPrismPose={mount(canvas){
 const v=window.WorldPrismView(canvas,{yaw:-.5,pitch:.72,zoom:3.7}),base=window.WORLDPRISM_BASE_POSE;let norm=window.WORLDPRISM_INPUT_VIEW;
 let pair=null,frame=0,visible=false,last=0,sets=[];
 const normalize=p=>p.map((x,i)=>(x-norm.center[i])/norm.scale);
 function series(records){const positions=records.map(r=>r.extrinsic.slice(0,3).map(row=>row[3])),yaw=[];let previous=0,total=0;
  records.forEach((r,i)=>{const a=Math.atan2(r.extrinsic[0][2],r.extrinsic[2][2]);if(!i)total=a;else{let d=a-previous;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;total+=d}previous=a;yaw.push(total)});return{records,positions,yaw};}
 new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(canvas);document.querySelector('#pose-reset').onclick=v.reset;
 window.addEventListener('worldprism:time',e=>frame=e.detail.frame);
 function draw(t){requestAnimationFrame(draw);if(!visible||!pair||t-last<30)return;last=t;v.ctx.clearRect(0,0,v.width,v.height);
  for(let i=-1;i<=1.001;i+=.5){v.line([[i,0,-1],[i,0,1]],'#e0e6d9');v.line([[-1,0,i],[1,0,i]],'#e0e6d9')}
  const angles=[];
  sets.forEach((s,k)=>{const j=Math.min(s.records.length-1,frame/4),lo=Math.floor(j),hi=Math.min(lo+1,s.records.length-1),u=j-lo;
   const p=s.positions[lo].map((x,i)=>x+(s.positions[hi][i]-x)*u),yaw=s.yaw[lo]+(s.yaw[hi]-s.yaw[lo])*u,co=Math.cos(yaw),si=Math.sin(yaw),color='#6fd3c0';angles.push(Math.round(yaw*180/Math.PI));
   v.line(s.positions.map(normalize),color,2.5);v.dot(normalize(s.positions.at(-1)),color,3);
   for(let n=0;n<s.records.length;n+=8)v.frustum(normalize(s.positions[n]),s.records[n].extrinsic.slice(0,3).map(row=>row.slice(0,3)),.055,color,false,[.99,.56]);
   v.frustum(normalize(p),[[co,0,si],[0,1,0],[-si,0,co]],0.16,color,false,[.99,.56]);
  });
  v.text(normalize(sets[0].positions[0]),'START','#84734d');document.querySelector('#pose-frame').textContent=`FRAME ${Math.min(pair.frames,Math.floor(frame)+1)} / ${pair.frames}`;
  document.querySelector('#pose-angles').textContent=`Yaw ${angles[0]}°`;
 }requestAnimationFrame(draw);return{set(p){pair=p;sets=[series(window.WORLDPRISM_POSES[p.id])];const pts=sets.flatMap(s=>s.positions);const low=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),high=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));norm={center:low.map((x,i)=>(x+high[i])/2),scale:Math.max(...high.map((x,i)=>(x-low[i])/2),1)};frame=0;v.reset()}};
}}})();
