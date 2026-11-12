/* Carrusel de avisos, operable por teclado, toque y dots */
(function(){
  'use strict';
  const el=document.getElementById('joBannerCarousel');
  if(!el)return;
  const slides=Array.from(el.querySelectorAll('.jo-banner-slide'));
  const dots=Array.from(el.parentElement.querySelectorAll('[data-jo-slide]'));
  if(slides.length<2||dots.length!==slides.length)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index=0, timer=null, touchX=null;
  const delay=6000;
  function show(next){
    index=(next+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===index;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',String(!active));
      const link=slide.querySelector('.jo-banner-link');
      if(link) link.tabIndex=active?0:-1;
    });
    dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));
  }
  function pause(){if(timer!==null){window.clearInterval(timer);timer=null;}}
  function play(){pause();if(!reduced&&!document.hidden)timer=window.setInterval(()=>show(index+1),delay);}
  dots.forEach((dot,i)=>{
    dot.addEventListener('click',()=>{show(i);play();});
    dot.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();
        const next=(i+(e.key==='ArrowRight'?1:-1)+dots.length)%dots.length;
        dots[next].focus();show(next);
      }
    });
  });
  el.addEventListener('mouseenter',pause);
  el.addEventListener('mouseleave',play);
  el.addEventListener('focusin',pause);
  el.addEventListener('focusout',e=>{if(!el.contains(e.relatedTarget))play();});
  el.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.screenX??null;pause();},{passive:true});
  el.addEventListener('touchend',e=>{
    if(touchX!==null){
      const d=(e.changedTouches[0]?.screenX??touchX)-touchX;
      if(Math.abs(d)>40)show(index+(d<0?1:-1));
    }
    touchX=null;play();
  },{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?pause():play());
  show(0);play();
})();