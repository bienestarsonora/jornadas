(() => {
  'use strict';
  const classify = (el) => {
    if (!el || !el.matches || !el.matches('button,a')) return;
    const text = (el.textContent || '').trim().toLowerCase();
    const attrs = ['id','class','title','aria-label','data-action','data-go','data-view']
      .map(name => el.getAttribute(name) || '').join(' ').toLowerCase();
    const all = text + ' ' + attrs;
    if (/nueva|nuevo|invitar|crear|agregar|subir|guardar/.test(all)) el.classList.add('gov-action-add');
    if (/eliminar|delete|borrar|desactivar/.test(all)) el.classList.add('gov-action-delete');
    if (/ver|abrir|visualizar/.test(all)) el.classList.add('gov-action-view');
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
      if (!table.querySelector('caption')) {
        const cap=document.createElement('caption');
        cap.textContent = i === 0 ? 'Listado administrativo de jornadas' : 'Tabla de información administrativa';
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