(()=>{
 const vids=[...document.querySelectorAll('.generation-card video')];
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 vids.forEach(v=>{v.muted=true;v.loop=true;v.playsInline=true;v.removeAttribute('controls');v.setAttribute('controls','');});
 const io=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting){v.play().catch(()=>{})}else{v.pause()}}),{threshold:.35});
 vids.forEach(v=>io.observe(v));
})();
