(()=>{'use strict';
 const root=document.documentElement, slides=[...document.querySelectorAll('#stage > .ag-slide')];
 if(!slides.length || !window.SlideDeck) return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'); let animations=[];
 const stop=()=>{animations.forEach(a=>a.cancel());animations=[]};
 function play(slide){ stop(); if(!slide||reduce.matches||root.classList.contains('motion-off'))return;
   const groups=[slide.querySelector('h1,h2'),slide.querySelector('.v28-core,.cover-desc'),...slide.querySelectorAll('.v28-tag'),...slide.querySelectorAll('.ag-body > *, .cover-options, .cover-bottom')].filter(Boolean);
   groups.forEach((el,i)=>{ animations.push(el.animate([{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:300,delay:Math.min(i,12)*75,easing:'ease-out'})); });
 }
 const tip=document.createElement('div');tip.className='v30-tooltip';tip.id='v30-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 let target=null;
 function hide(){if(target)target.removeAttribute('aria-describedby');target=null;tip.hidden=true;}
 function show(el){ if(!el||!el.dataset.tip)return;hide();target=el;el.setAttribute('aria-describedby',tip.id);tip.textContent=el.dataset.tip;tip.hidden=false;
  const r=el.getBoundingClientRect(), s=el.closest('.ag-slide')?.getBoundingClientRect()||{left:0,right:innerWidth,top:0,bottom:innerHeight}, t=tip.getBoundingClientRect();
  const left=Math.max(4,s.left+4,Math.min(r.left,s.right-t.width-4,innerWidth-t.width-4));let top=r.bottom+8;if(top+t.height>Math.min(innerHeight,s.bottom)-4)top=r.top-t.height-8;top=Math.max(4,s.top+4,top);tip.style.left=left+'px';tip.style.top=top+'px'; }
 document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-tip]');if(el && !el.contains(e.relatedTarget))show(el)});
 document.addEventListener('pointerout',e=>{if(target && target.contains(e.target) && !target.contains(e.relatedTarget) && !target.matches(':focus-visible'))hide()});
 document.addEventListener('focusin',e=>{if(e.target.matches('[data-tip]:focus-visible'))show(e.target)});document.addEventListener('focusout',e=>{if(e.target===target)hide()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});window.addEventListener('scroll',hide,{passive:true});window.addEventListener('resize',hide);
 const observer=new MutationObserver(records=>{for(const r of records)if(r.target.classList.contains('is-active')){hide();play(r.target)}});
 slides.forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['class']}));
 window.addEventListener('beforeprint',()=>{stop();hide()});reduce.addEventListener('change',stop);
 root.classList.add('v30-ready');play(slides.find(s=>s.classList.contains('is-active')));
})();
