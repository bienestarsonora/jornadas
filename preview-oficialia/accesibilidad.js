/* Controles de accesibilidad, sin dependencias externas */
(function(){
 'use strict';
 const root=document.documentElement;
 const toggle=document.getElementById('joA11yToggle');
 const panel=document.getElementById('joA11yPanel');
 const closer=document.getElementById('joA11yClose');
 const topBtn=document.getElementById('joScrollTop');
 if(!toggle||!panel||!closer)return;
 const buttons=Array.from(panel.querySelectorAll('[data-jo-a11y]'));
 let size=100;
 function setOpen(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)closer.focus();else toggle.focus();}
 toggle.addEventListener('click',()=>setOpen(panel.hidden));
 closer.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false)}});
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggle.contains(e.target)){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}});
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.joA11y;
  if(action==='bigger'||action==='smaller'){size=Math.min(135,Math.max(85,size+(action==='bigger'?10:-10)));root.style.fontSize=size+'%';return;}
  if(action==='reset'){size=100;root.style.fontSize='';root.classList.remove('jo-a11y-contrast','jo-a11y-gray','jo-a11y-links');buttons.forEach(b=>b.setAttribute('aria-pressed','false'));return;}
  const name={'contrast':'jo-a11y-contrast','grayscale':'jo-a11y-gray','links':'jo-a11y-links'}[action];
  if(name){const enabled=root.classList.toggle(name);button.setAttribute('aria-pressed',String(enabled));}
 }));
 if(topBtn){topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
})();