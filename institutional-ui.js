(() => {
  'use strict';
  const classify = (el) => {
    if (!el || !el.matches || !el.matches('button,a')) return;
    const text = (el.textContent || '').trim().toLowerCase();
    const attrs = ['id','class','title','aria-label','data-action','data-go','data-view']
      .map(name => el.getAttribute(name) || '').join(' ').toLowerCase();
    const all = text + ' ' + attrs;
    if (/\b(nueva|nuevo|invitar|crear|agregar|subir|guardar)\b/.test(all)) el.classList.add('gov-action-add');
    if (/\b(eliminar|delete|borrar|desactivar)\b/.test(all)) el.classList.add('gov-action-delete');
    if (/\b(ver|abrir|visualizar)\b/.test(all)) el.classList.add('gov-action-view');
    if (!el.getAttribute('aria-label') && el.getAttribute('title')) {
      el.setAttribute('aria-label',el.getAttribute('title'));
    }
    if (!el.getAttribute('aria-label') && !text) {
      if (/delete|eliminar|borrar/.test(all)) el.setAttribute('aria-label','Eliminar');
      else if (/edit|editar/.test(all)) el.setAttribute('aria-label','Editar');
      else if (/view|ver|abrir/.test(all)) el.setAttribute('aria-label','Ver detalle');
    }
  };
  const enhance = (root=document) => {
    root.querySelectorAll?.('button,a').forEach(classify);
    root.querySelectorAll?.('input[required],select[required],textarea[required]').forEach(el => el.setAttribute('aria-required','true'));
    root.querySelectorAll?.('.table-card table').forEach((table,i) => {
      table.querySelectorAll('thead th').forEach(th => th.setAttribute('scope','col'));
      if (!table.querySelector('caption')) {
        const cap=document.createElement('caption');
        cap.textContent = table.querySelector('#journeysTable') ? 'Listado administrativo de jornadas' : 'Bitácora de movimientos';
        table.prepend(cap);
      }
    });
  };
  enhance();
  const obs = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    classify(n);
    enhance(n);
  })));
  if (document.body) obs.observe(document.body,{childList:true,subtree:true});
})();
