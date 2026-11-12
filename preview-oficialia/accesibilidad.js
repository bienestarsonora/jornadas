/* Jornadas del Bienestar: controles de acceso y herramientas de accesibilidad */
(function(){
  'use strict';

  const root=document.documentElement;
  const panel=document.getElementById('joA11yPanel');
  const toggle=document.getElementById('joA11yToggle');
  const closeButton=document.getElementById('joA11yClose');
  const resetButton=document.getElementById('joA11yReset');
  const status=document.getElementById('joA11yStatus');
  const readingGuide=document.getElementById('joReadingGuide');
  const dictationPanel=document.getElementById('joA11yDictation');
  const transcript=document.getElementById('joA11yTranscript');
  const copyButton=document.getElementById('joA11yCopy');
  const searchToggle=document.getElementById('joSearchToggle');
  const searchPanel=document.getElementById('joSearchPanel');
  const searchInput=document.getElementById('joSearchInput');
  const searchForm=document.getElementById('joSearchForm');
  const searchFeedback=document.getElementById('joSearchFeedback');

  if(!panel||!toggle||!closeButton||!resetButton||!searchPanel||!searchToggle||!searchForm)return;
  const options=Array.from(panel.querySelectorAll('[data-jo-a11y]'));
  const flags={invert:false,grayscale:false,links:false,cursor:false,guide:false,speech:false,dictation:false};
  let textSize=100;
  let letterSpacing=0;
  let recognition=null;
  let utterance=null;
  let speechToken=0;

  function message(value){
    if(status)status.textContent=value||'';
  }
  function setPressed(name,on){
    const button=options.find(b=>b.dataset.joA11y===name);
    if(button&&button.hasAttribute('aria-pressed'))button.setAttribute('aria-pressed',String(!!on));
  }
  function closeAccessibility(returnFocus){
    panel.hidden=true;
    toggle.setAttribute('aria-expanded','false');
    if(returnFocus)toggle.focus();
  }
  function closeSearch(returnFocus){
    searchPanel.hidden=true;
    searchToggle.setAttribute('aria-expanded','false');
    if(returnFocus)searchToggle.focus();
  }

  toggle.addEventListener('click',()=>{
    const open=panel.hidden;
    closeSearch(false);
    panel.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    if(open)closeButton.focus();
  });
  closeButton.addEventListener('click',()=>closeAccessibility(true));
  searchToggle.addEventListener('click',()=>{
    const open=searchPanel.hidden;
    closeAccessibility(false);
    searchPanel.hidden=!open;
    searchToggle.setAttribute('aria-expanded',String(open));
    if(open&&searchInput)searchInput.focus();
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(!panel.hidden)closeAccessibility(true);
    else if(!searchPanel.hidden)closeSearch(true);
  });

  function updateText(){
    root.style.fontSize=textSize===100?'':textSize+'%';
  }
  function updateSpacing(){
    root.classList.toggle('jo-a11y-spacing',letterSpacing!==0);
    root.style.setProperty('--jo-letter-spacing',letterSpacing.toFixed(2)+'em');
  }
  function toggleFlag(name){
    flags[name]=!flags[name];
    const className={
      invert:'jo-a11y-invert',
      grayscale:'jo-a11y-gray',
      links:'jo-a11y-links',
      cursor:'jo-a11y-cursor'
    }[name];
    if(className)root.classList.toggle(className,flags[name]);
    if(name==='guide'&&readingGuide)readingGuide.hidden=!flags.guide;
    setPressed(name,flags[name]);
    message('');
  }
  function stopSpeaking(){
    speechToken++;
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    utterance=null;
    flags.speech=false;
    setPressed('speech',false);
  }
  function stopDictation(){
    if(recognition){
      const active=recognition;
      recognition=null;
      try{active.abort();}catch(error){}
    }
    flags.dictation=false;
    setPressed('dictation',false);
  }
  function resetAll(){
    textSize=100;
    letterSpacing=0;
    root.style.fontSize='';
    root.style.removeProperty('--jo-letter-spacing');
    root.classList.remove('jo-a11y-spacing','jo-a11y-invert','jo-a11y-gray','jo-a11y-links','jo-a11y-cursor');
    ['invert','grayscale','links','cursor','guide'].forEach(name=>{
      flags[name]=false;setPressed(name,false);
    });
    if(readingGuide)readingGuide.hidden=true;
    stopSpeaking();
    stopDictation();
    if(dictationPanel)dictationPanel.hidden=true;
    if(transcript)transcript.value='';
    message('Opciones restablecidas.');
  }
  resetButton.addEventListener('click',resetAll);

  function readAloud(){
    if(flags.speech){stopSpeaking();message('Lectura detenida.');return;}
    if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){
      message('La lectura de texto no está disponible en este navegador.');return;
    }
    const selection=window.getSelection()?window.getSelection().toString().trim():'';
    const main=document.querySelector('main');
    const content=selection||(main?main.innerText.trim():'');
    if(!content){message('No hay texto disponible para leer.');return;}
    stopSpeaking();
    flags.speech=true;setPressed('speech',true);
    const currentToken=++speechToken;
    utterance=new window.SpeechSynthesisUtterance(content.slice(0,12000));
    utterance.lang='es-MX';utterance.rate=1;
    utterance.onend=()=>{
      if(currentToken===speechToken){
        flags.speech=false;setPressed('speech',false);
        message('Lectura finalizada.');
      }
    };
    utterance.onerror=()=>{
      if(currentToken===speechToken){
        flags.speech=false;setPressed('speech',false);
        message('No fue posible completar la lectura.');
      }
    };
    message(selection?'Leyendo el texto seleccionado. Presiona de nuevo para detener.':'Leyendo el contenido de Jornadas. Presiona de nuevo para detener.');
    window.speechSynthesis.speak(utterance);
  }

  function startDictation(){
    if(flags.dictation){stopDictation();message('Dictado detenido.');return;}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){message('El reconocimiento de voz no está disponible en este navegador.');return;}
    try{
      recognition=new Recognition();
      recognition.lang='es-MX';
      recognition.continuous=false;
      recognition.interimResults=false;
      recognition.maxAlternatives=1;
      const current=recognition;
      current.onresult=event=>{
        const text=Array.from(event.results).map(res=>res[0].transcript).join(' ').trim();
        if(transcript)transcript.value=text;
        if(dictationPanel)dictationPanel.hidden=false;
        message(text?'Texto reconocido. Puedes copiarlo.':'No se reconoció texto.');
      };
      current.onerror=event=>{
        message(event.error==='not-allowed'?'No se concedió permiso para usar el micrófono.':'No se pudo reconocer la voz: '+event.error);
      };
      current.onend=()=>{
        if(recognition===current)recognition=null;
        flags.dictation=false;setPressed('dictation',false);
      };
      recognition.start();
      flags.dictation=true;setPressed('dictation',true);
      message('Escuchando. Habla para convertir tu voz en texto.');
    }catch(error){
      recognition=null;flags.dictation=false;setPressed('dictation',false);
      message('No fue posible iniciar el micrófono.');
    }
  }
  if(copyButton){
    copyButton.addEventListener('click',async()=>{
      if(!transcript||!transcript.value)return;
      try{
        await navigator.clipboard.writeText(transcript.value);
        message('Texto copiado.');
      }catch(error){
        transcript.focus();transcript.select();message('Selecciona el texto para copiarlo.');
      }
    });
  }

  options.forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.joA11y;
    if(action==='bigger'||action==='smaller'){
      textSize=Math.min(150,Math.max(75,textSize+(action==='bigger'?10:-10)));
      updateText();
      message('Tamaño del texto: '+textSize+'%.');
    }else if(action==='spacing-up'||action==='spacing-down'){
      letterSpacing=Math.round(Math.max(0,Math.min(0.20,letterSpacing+(action==='spacing-up'?.02:-.02)))*100)/100;
      updateSpacing();
      message('Espaciado del texto: '+Math.round(letterSpacing*100)+'%.');
    }else if(['invert','grayscale','links','cursor','guide'].includes(action)){
      toggleFlag(action);
    }else if(action==='speech'){
      readAloud();
    }else if(action==='dictation'){
      startDictation();
    }
  }));

  if(readingGuide){
    document.addEventListener('pointermove',event=>{
      if(flags.guide&&event.pointerType!=='touch'){
        readingGuide.style.top=Math.max(0,Math.min(window.innerHeight-42,event.clientY-21))+'px';
      }
    },{passive:true});
  }

  /* Lupa: búsqueda dentro del micrositio */
  searchForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!searchInput)return;
    const normalize=text=>text.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const q=normalize(searchInput.value).trim();
    if(!q)return;
    const candidates=Array.from(document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main li,main figcaption'));
    const found=candidates.find(node=>normalize(node.textContent||'').includes(q));
    if(!found){
      if(searchFeedback)searchFeedback.textContent='No se encontraron coincidencias en esta página.';
      return;
    }
    if(searchFeedback)searchFeedback.textContent='Resultado localizado en la página.';
    closeSearch(false);
    found.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    found.tabIndex=-1;found.focus({preventScroll:true});
  });
})();