/* Barra flotante de Bienestar: búsqueda, accesibilidad y atención ciudadana */
(function(){
  'use strict';
  const root=document.documentElement;
  const a11yToggle=document.getElementById('joA11yToggle');
  const a11yPanel=document.getElementById('joA11yPanel');
  const a11yClose=document.getElementById('joA11yClose');
  const searchToggle=document.getElementById('joSearchToggle');
  const searchPanel=document.getElementById('joSearchPanel');
  const searchInput=document.getElementById('joSearchInput');
  const searchForm=document.getElementById('joSearchForm');
  const searchFeedback=document.getElementById('joSearchFeedback');
  if(!a11yToggle||!a11yPanel||!a11yClose||!searchToggle||!searchPanel||!searchForm)return;
  const buttons=Array.from(a11yPanel.querySelectorAll('[data-jo-a11y]'));
  let fontSize=100;

  function closeAccessibility(focus){
    a11yPanel.hidden=true;
    a11yToggle.setAttribute('aria-expanded','false');
    if(focus)a11yToggle.focus();
  }
  function closeSearch(focus){
    searchPanel.hidden=true;
    searchToggle.setAttribute('aria-expanded','false');
    if(focus)searchToggle.focus();
  }
  a11yToggle.addEventListener('click',()=>{
    const open=a11yPanel.hidden;
    closeSearch(false);
    a11yPanel.hidden=!open;
    a11yToggle.setAttribute('aria-expanded',String(open));
    if(open)a11yClose.focus();
  });
  a11yClose.addEventListener('click',()=>closeAccessibility(true));
  searchToggle.addEventListener('click',()=>{
    const open=searchPanel.hidden;
    closeAccessibility(false);
    searchPanel.hidden=!open;
    searchToggle.setAttribute('aria-expanded',String(open));
    if(open)searchInput?.focus();
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(!a11yPanel.hidden)closeAccessibility(true);
    if(!searchPanel.hidden)closeSearch(true);
  });
  document.addEventListener('pointerdown',e=>{
    if(!a11yPanel.hidden&&!a11yPanel.contains(e.target)&&!a11yToggle.contains(e.target))closeAccessibility(false);
    if(!searchPanel.hidden&&!searchPanel.contains(e.target)&&!searchToggle.contains(e.target))closeSearch(false);
  });
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.joA11y;
    if(action==='bigger'||action==='smaller'){
      fontSize=Math.min(135,Math.max(85,fontSize+(action==='bigger'?10:-10)));
      root.style.fontSize=fontSize+'%';
      return;
    }
    if(action==='reset'){
      fontSize=100;root.style.fontSize='';
      root.classList.remove('jo-a11y-contrast','jo-a11y-gray','jo-a11y-links');
      buttons.forEach(b=>{if(b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed','false');});
      return;
    }
    const classes={contrast:'jo-a11y-contrast',grayscale:'jo-a11y-gray',links:'jo-a11y-links'};
    if(classes[action]){
      const on=root.classList.toggle(classes[action]);
      button.setAttribute('aria-pressed',String(on));
    }
  }));
  /* Búsqueda en el contenido público de este micrositio. */
  searchForm.addEventListener('submit',e=>{
    e.preventDefault();
    const q=searchInput.value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    if(!q)return;
    const norm=s=>s.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const candidates=Array.from(document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main li,main figcaption'));
    const found=candidates.find(el=>norm(el.textContent||'').includes(q));
    if(!found){
      searchFeedback.textContent='No se encontraron coincidencias en esta página.';
      return;
    }
    searchFeedback.textContent='Resultado localizado en la página.';
    closeSearch(false);
    found.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    found.setAttribute('tabindex','-1');
    found.focus({preventScroll:true});
  });
})();
