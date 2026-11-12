/* Carrusel accesible de banners de Jornadas */
(function(){
 'use strict';
 const carousel=document.getElementById('joBannerCarousel');
 if(!carousel)return;
 const slides=Array.from(carousel.querySelectorAll('.jo-banner-slide'));
 const dots=Array.from(document.querySelectorAll('[data-jo-slide]'));
 const prev=carousel.querySelector('.jo-banner-prev'),next=carousel.querySelector('.jo-banner-next');
 if(slides.length<2)return;
 let index=0,timer=null;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function show(value){
  index=(value+slides.length)%slides.length;
  slides.forEach((s,i)=>{let on=i===index;s.classList.toggle('is-active',on);s.setAttribute('aria-hidden',String(!on));s.querySelectorAll('a').forEach(a=>a.tabIndex=on?0:-1);});
  dots.forEach((d,i)=>d.setAttribute('aria-current',String(i===index)));
 }
 function pause(){if(timer){clearInterval(timer);timer=null}}
 function resume(){pause();if(!reduced&&document.visibilityState!=='hidden')timer=setInterval(()=>show(index+1),7000)}
 prev?.addEventListener('click',()=>{show(index-1);resume()});
 next?.addEventListener('click',()=>{show(index+1);resume()});
 dots.forEach((b,i)=>b.addEventListener('click',()=>{show(i);resume()}));
 carousel.addEventListener('mouseenter',pause);carousel.addEventListener('mouseleave',resume);
 carousel.addEventListener('focusin',pause);carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget))resume()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pause();else resume()});
 show(0);resume();
})();