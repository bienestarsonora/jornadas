(() => {
  'use strict';

  const cfg = window.JORNADAS_CONFIG;
  document.querySelectorAll('[data-logo]').forEach(img => { img.src = cfg.LOGO_DATA_URI; });
  const inviteFlow = /type=invite/.test(location.hash) || /type=invite/.test(location.search);
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.sessionStorage }
  });

  const $ = id => document.getElementById(id);
  const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = n => new Intl.NumberFormat('es-MX').format(Number(n)||0);
  const split = s => String(s||'').split(',').map(x=>x.trim()).filter(Boolean);
  const dateLabel = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
  const fullDate = iso => new Date(iso).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});

  let currentUser = null;
  let profile = null;
  let jornadas = [];
  let evidencias = [];
  let profiles = [];
  let audit = [];
  let formMap = null;
  let formMarker = null;
  let existingEvidence = [];
  let pendingFlyer = null;
  let pendingPhotos = [];
  const objectUrls = new Map();

  function toast(msg,type=''){
    const el=$('toast'); el.textContent=msg; el.className=`toast show ${type}`;
    clearTimeout(toast.t); toast.t=setTimeout(()=>el.className='toast',3000);
  }
  function authMessage(msg,type=''){$('authMessage').textContent=msg;$('authMessage').className=`auth-message ${type}`}
  function showAuthView(id){['loginView','setupView','recoveryView','newPasswordView'].forEach(x=>$(x).hidden=x!==id);authMessage('')}
  function setBusy(btn,busy,label){if(!btn)return;btn.disabled=busy;if(busy){btn.dataset.label=btn.textContent;btn.textContent=label||'Procesando…'}else if(btn.dataset.label){btn.textContent=btn.dataset.label;delete btn.dataset.label}}

  async function bootstrapAdminIfEligible(user){
    if (!user || String(user.email||'').toLowerCase()!==String(cfg.ADMIN_EMAIL).toLowerCase()) return null;
    const payload={user_id:user.id,email:user.email,full_name:user.user_metadata?.full_name||'Administrador',role:'admin',active:true};
    const {data,error}=await db.from('jornadas_profiles').insert(payload).select().single();
    if(error){console.info('Bootstrap admin no aplicado:',error.message);return null}
    return data;
  }

  async function ensureAccess(){
    const {data:{user},error}=await db.auth.getUser();
    if(error||!user){showLogin();return false}
    currentUser=user;

    let {data:p,error:pe}=await db.from('jornadas_profiles').select('*').eq('user_id',user.id).maybeSingle();
    if((pe||!p) && user.email?.toLowerCase()===cfg.ADMIN_EMAIL.toLowerCase()){
      p=await bootstrapAdminIfEligible(user);
    }
    if(!p || p.active!==true){
      authMessage('Tu identidad fue autenticada, pero esta cuenta no tiene acceso activo al panel.','');
      await db.auth.signOut();
      showLogin();
      return false;
    }
    profile=p;
    if(inviteFlow){showAuthView('newPasswordView');$('authScreen').hidden=false;$('appShell').hidden=true;return true}
    openApp();
    return true;
  }

  function showLogin(){
    $('authScreen').hidden=false;$('appShell').hidden=true;
    const params=new URLSearchParams(location.search);
    showAuthView(params.get('setup')==='1'?'setupView':'loginView');
    if(params.get('setup')==='1')$('setupEmail').value=cfg.ADMIN_EMAIL;
  }

  function openApp(){
    $('authScreen').hidden=true;$('appShell').hidden=false;
    $('userName').textContent=profile.full_name||currentUser.email||'Usuario';
    $('userRole').textContent=profile.role;
    $('userInitial').textContent=(profile.full_name||currentUser.email||'U').trim().charAt(0).toUpperCase();
    document.querySelectorAll('.admin-only').forEach(el=>el.hidden=profile.role!=='admin');
    loadAll();
  }

  async function loadAll(){
    const [jr,ev]=await Promise.all([
      db.from('jornadas').select('*').order('event_date',{ascending:false}),
      db.from('jornadas_evidencias').select('*').order('sort_order',{ascending:true})
    ]);
    if(jr.error){toast('No se pudieron cargar las jornadas.','error');console.error(jr.error);return}
    jornadas=jr.data||[];evidencias=ev.data||[];
    if(profile.role==='admin'){
      const [pr,au]=await Promise.all([
        db.from('jornadas_profiles').select('*').order('created_at',{ascending:true}),
        db.from('jornadas_audit_log').select('*').order('created_at',{ascending:false}).limit(200)
      ]);
      profiles=pr.data||[];audit=au.data||[];
    }
    renderAll();
  }

  function renderAll(){renderOverview();renderJourneysTable();renderUsers();renderAudit()}

  function renderOverview(){
    const pub=jornadas.filter(j=>j.status==='published');
    $('kpiPublished').textContent=fmt(pub.length);
    $('kpiDrafts').textContent=fmt(jornadas.filter(j=>j.status==='draft').length);
    $('kpiServices').textContent=fmt(pub.reduce((a,j)=>a+(+j.services_count||0),0));
    $('kpiEvidence').textContent=fmt(evidencias.length);
    $('recentJourneys').innerHTML=jornadas.slice(0,6).map(j=>`<div class="recent-item"><div class="recent-date">${esc(new Date(`${j.event_date}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}))}</div><div><b>${esc(j.title)}</b><span>${esc(j.neighborhood)} · ${fmt(j.services_count)} servicios</span></div><span class="state-pill ${j.status}">${j.status==='published'?'Publicada':'Borrador'}</span></div>`).join('')||'<div class="table-empty">Aún no hay jornadas registradas.</div>';
  }

  function filteredAdmin(){
    const q=($('adminSearch').value||'').trim().toLowerCase(),s=$('adminStatus').value;
    return jornadas.filter(j=>(s==='all'||j.status===s)&&(!q||[j.title,j.neighborhood,j.place].join(' ').toLowerCase().includes(q)));
  }

  function renderJourneysTable(){
    const list=filteredAdmin();$('journeysTableEmpty').hidden=!!list.length;
    $('journeysTable').innerHTML=list.map(j=>{
      const canDelete=profile.role==='admin';
      const canEdit=profile.role==='admin'||j.status==='draft';
      return `<tr><td><div class="journey-cell"><b>${esc(j.title)}</b><span>${esc(j.place)}</span></div></td><td>${esc(dateLabel(j.event_date))}</td><td>${esc(j.neighborhood)}</td><td>${fmt(j.services_count)}</td><td><span class="state-pill ${j.status}">${j.status==='published'?'Publicada':'Borrador'}</span></td><td><div class="row-actions">${canEdit?`<button class="icon-action" data-edit="${j.id}" title="Editar">✎</button>`:''}${canDelete?`<button class="icon-action delete" data-delete="${j.id}" title="Eliminar">×</button>`:''}</div></td></tr>`;
    }).join('');
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openJourney(b.dataset.edit));
    document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteJourney(b.dataset.delete));
  }

  function renderUsers(){
    if(profile.role!=='admin')return;
    $('usersGrid').innerHTML=profiles.map(p=>`<article class="user-card"><div class="user-card-head"><div class="user-avatar">${esc((p.full_name||p.email||'U').charAt(0).toUpperCase())}</div><div><b>${esc(p.full_name||'Usuario')}</b><small>${esc(p.email||'')}</small></div></div><div class="user-role-line"><span class="role-badge ${p.role}">${esc(p.role)}</span>${p.role==='capturista'?`<button class="toggle-btn ${p.active?'active':'inactive'}" data-toggle-user="${p.user_id}" data-active="${p.active?'0':'1'}">${p.active?'Activo':'Inactivo'}</button>`:`<span class="toggle-btn active">Activo</span>`}</div></article>`).join('');
    document.querySelectorAll('[data-toggle-user]').forEach(b=>b.onclick=()=>toggleUser(b.dataset.toggleUser,b.dataset.active==='1'));
  }

  function renderAudit(){
    if(profile.role!=='admin')return;
    $('auditEmpty').hidden=!!audit.length;
    $('auditTable').innerHTML=audit.map(a=>`<tr><td>${esc(fullDate(a.created_at))}</td><td>${esc(String(a.action||'').replaceAll('_',' '))}</td><td>${esc(a.entity||'')}</td><td>${esc(a.user_id?String(a.user_id).slice(0,8)+'…':'Sistema')}</td></tr>`).join('');
  }

  function switchView(name){
    if((name==='usuarios'||name==='bitacora')&&profile.role!=='admin')return;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(v=>v.classList.remove('active'));
    $(`view-${name}`).classList.add('active');
    document.querySelector(`[data-view="${name}"]`)?.classList.add('active');
    const titles={overview:['Operación territorial','Resumen ejecutivo'],jornadas:['Gestión de información','Jornadas registradas'],usuarios:['Seguridad y acceso','Usuarios autorizados'],bitacora:['Trazabilidad','Bitácora de actividad']};
    $('viewKicker').textContent=titles[name][0];$('viewTitle').textContent=titles[name][1];
  }

  async function ensureMap(lat=29.0892,lng=-110.9613){
    if(!formMap){
      formMap=L.map('formMap',{zoomControl:true}).setView([lat,lng],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(formMap);
      formMap.on('click',e=>setFormPoint(e.latlng.lat,e.latlng.lng));
    }else formMap.setView([lat,lng],13);
    setFormPoint(lat,lng);
    setTimeout(()=>formMap.invalidateSize(),160);
  }
  function setFormPoint(lat,lng){
    $('fLat').value=Number(lat).toFixed(6);$('fLng').value=Number(lng).toFixed(6);
    if(formMarker)formMarker.setLatLng([lat,lng]);else formMarker=L.marker([lat,lng],{draggable:true}).addTo(formMap).on('dragend',e=>{const p=e.target.getLatLng();$('fLat').value=p.lat.toFixed(6);$('fLng').value=p.lng.toFixed(6)});
  }

  async function blobUrl(path){
    if(objectUrls.has(path))return objectUrls.get(path);
    const {data,error}=await db.storage.from(cfg.STORAGE_BUCKET).download(path);
    if(error||!data)return '';
    const url=URL.createObjectURL(data);objectUrls.set(path,url);return url;
  }

  async function openJourney(id=null){
    const j=id?jornadas.find(x=>x.id===id):null;
    if(j&&profile.role!=='admin'&&j.status!=='draft'){toast('Solo el administrador puede modificar una jornada publicada.','error');return}
    $('journeyForm').reset();pendingFlyer=null;pendingPhotos=[];existingEvidence=j?evidencias.filter(e=>e.jornada_id===j.id):[];
    $('fId').value=j?.id||'';$('formHeading').textContent=j?'Editar jornada':'Nueva jornada';
    $('fTitle').value=j?.title||'';$('fDate').value=j?.event_date||'';$('fPlace').value=j?.place||'';$('fNeighborhood').value=j?.neighborhood||'';
    $('fServicesCount').value=j?.services_count||0;$('fDoorDays').value=j?.door_days||0;$('fSpeakerDays').value=j?.speaker_days||0;
    $('fServices').value=(j?.services||[]).join(', ');$('fAgencies').value=(j?.agencies||[]).join(', ');$('fSummary').value=j?.summary||'';
    $('fStatus').value=j?.status||'draft';
    if(profile.role!=='admin'){$('fStatus').value='draft';$('fStatus').disabled=true}else $('fStatus').disabled=false;
    $('journeyDialog').showModal();document.body.classList.add('modal-open');
    await ensureMap(Number(j?.lat)||29.0892,Number(j?.lng)||-110.9613);renderEvidencePreview();
  }

  async function renderEvidencePreview(){
    const wrap=$('evidencePreview');wrap.innerHTML='';
    for(const e of existingEvidence){
      const url=await blobUrl(e.storage_path);if(!url)continue;
      const d=document.createElement('div');d.className='evidence-thumb';d.innerHTML=`<img src="${url}" alt="Evidencia"><button type="button" data-remove-evidence="${e.id}" title="Eliminar">×</button>`;wrap.appendChild(d);
    }
    document.querySelectorAll('[data-remove-evidence]').forEach(b=>b.onclick=()=>removeEvidence(b.dataset.removeEvidence));
  }

  function validateFile(file){
    if(!file)return true;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Solo se permiten JPG, PNG o WebP.','error');return false}
    if(file.size>8*1024*1024){toast('Cada imagen debe pesar máximo 8 MB.','error');return false}
    return true;
  }

  async function uploadEvidence(jornadaId,file,kind,sortOrder=0){
    if(!validateFile(file))throw new Error('Archivo inválido');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path=`${jornadaId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const {error:upErr}=await db.storage.from(cfg.STORAGE_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(upErr)throw upErr;
    const {error:dbErr}=await db.from('jornadas_evidencias').insert({jornada_id:jornadaId,kind,storage_path:path,caption:'',sort_order:sortOrder,created_by:currentUser.id});
    if(dbErr){await db.storage.from(cfg.STORAGE_BUCKET).remove([path]);throw dbErr}
  }

  async function saveJourney(ev){
    ev.preventDefault();const btn=$('saveJourney');setBusy(btn,true,'Guardando…');
    try{
      const id=$('fId').value||null;
      const status=profile.role==='admin'?$('fStatus').value:'draft';
      const payload={title:$('fTitle').value.trim(),event_date:$('fDate').value,place:$('fPlace').value.trim(),neighborhood:$('fNeighborhood').value.trim(),lat:+$('fLat').value,lng:+$('fLng').value,services_count:+$('fServicesCount').value||0,door_days:+$('fDoorDays').value||0,speaker_days:+$('fSpeakerDays').value||0,services:split($('fServices').value),agencies:split($('fAgencies').value),summary:$('fSummary').value.trim(),status,updated_by:currentUser.id};
      let jornadaId=id;
      if(id){const {error}=await db.from('jornadas').update(payload).eq('id',id);if(error)throw error}
      else{payload.created_by=currentUser.id;const {data,error}=await db.from('jornadas').insert(payload).select('id').single();if(error)throw error;jornadaId=data.id}

      if(pendingFlyer){
        const oldFlyer=existingEvidence.find(e=>e.kind==='flyer');
        const ext=(pendingFlyer.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
        const path=`${jornadaId}/flyer-${crypto.randomUUID()}.${ext}`;
        if(!validateFile(pendingFlyer))throw new Error('Flyer inválido');
        const {error:upErr}=await db.storage.from(cfg.STORAGE_BUCKET).upload(path,pendingFlyer,{contentType:pendingFlyer.type});if(upErr)throw upErr;
        if(oldFlyer){await db.from('jornadas_evidencias').delete().eq('id',oldFlyer.id);await db.storage.from(cfg.STORAGE_BUCKET).remove([oldFlyer.storage_path])}
        const {error:insErr}=await db.from('jornadas_evidencias').insert({jornada_id:jornadaId,kind:'flyer',storage_path:path,caption:'',sort_order:0,created_by:currentUser.id});if(insErr)throw insErr;
      }
      for(let i=0;i<pendingPhotos.length;i++)await uploadEvidence(jornadaId,pendingPhotos[i],'photo',i+1);
      $('journeyDialog').close();document.body.classList.remove('modal-open');toast('Jornada guardada correctamente.','success');await loadAll();
    }catch(err){console.error(err);toast(err.message||'No fue posible guardar la jornada.','error')}finally{setBusy(btn,false)}
  }

  async function removeEvidence(id){
    const e=existingEvidence.find(x=>x.id===id);if(!e)return;
    const ok=await confirmAction('Eliminar evidencia','La imagen se eliminará de Storage y dejará de estar disponible.');if(!ok)return;
    const {error}=await db.from('jornadas_evidencias').delete().eq('id',id);if(error){toast(error.message,'error');return}
    await db.storage.from(cfg.STORAGE_BUCKET).remove([e.storage_path]);existingEvidence=existingEvidence.filter(x=>x.id!==id);toast('Evidencia eliminada.','success');renderEvidencePreview();
  }

  async function deleteJourney(id){
    if(profile.role!=='admin')return;
    const j=jornadas.find(x=>x.id===id);if(!j)return;
    const ok=await confirmAction('Eliminar jornada',`Se eliminará “${j.title}” junto con sus evidencias. Esta acción no se puede deshacer.`);if(!ok)return;
    const paths=evidencias.filter(e=>e.jornada_id===id).map(e=>e.storage_path);
    const {error}=await db.from('jornadas').delete().eq('id',id);if(error){toast(error.message,'error');return}
    if(paths.length)await db.storage.from(cfg.STORAGE_BUCKET).remove(paths);
    toast('Jornada eliminada.','success');await loadAll();
  }

  async function inviteUser(ev){
    ev.preventDefault();const btn=ev.submitter;setBusy(btn,true,'Enviando…');
    try{
      const {data,error}=await db.functions.invoke('jornadas-manage-users',{body:{action:'invite_capturista',email:$('inviteEmail').value.trim(),full_name:$('inviteName').value.trim()}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      $('userDialog').close();$('userForm').reset();toast('Invitación enviada.','success');await loadAll();
    }catch(err){console.error(err);toast(err.message||'No fue posible enviar la invitación.','error')}finally{setBusy(btn,false)}
  }

  async function toggleUser(userId,active){
    const ok=await confirmAction(active?'Activar capturista':'Desactivar capturista',active?'La cuenta recuperará acceso al panel.':'La cuenta ya no podrá acceder al panel ni modificar información.');if(!ok)return;
    const {data,error}=await db.functions.invoke('jornadas-manage-users',{body:{action:'set_active',user_id:userId,active}});
    if(error||data?.error){toast(data?.error||error?.message||'No fue posible actualizar el usuario.','error');return}
    toast('Acceso actualizado.','success');await loadAll();
  }

  function confirmAction(title,text){
    return new Promise(resolve=>{
      $('confirmTitle').textContent=title;$('confirmText').textContent=text;$('confirmDialog').showModal();
      const done=v=>{$('confirmDialog').close();$('confirmAccept').onclick=null;$('confirmCancel').onclick=null;resolve(v)};
      $('confirmAccept').onclick=()=>done(true);$('confirmCancel').onclick=()=>done(false);
    });
  }

  function bindUI(){
    $('loginForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;setBusy(btn,true,'Verificando…');authMessage('');const {error}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){authMessage('Correo o contraseña incorrectos.');setBusy(btn,false);return}await ensureAccess();setBusy(btn,false)};
    $('setupForm').onsubmit=async e=>{e.preventDefault();if($('setupPassword').value!==$('setupPassword2').value){authMessage('Las contraseñas no coinciden.');return}if($('setupEmail').value.trim().toLowerCase()!==cfg.ADMIN_EMAIL.toLowerCase()){authMessage('Ese correo no está autorizado para la activación inicial.');return}const btn=e.submitter;setBusy(btn,true,'Creando…');const {data,error}=await db.auth.signUp({email:$('setupEmail').value.trim(),password:$('setupPassword').value,options:{emailRedirectTo:location.origin+location.pathname,data:{full_name:'Administrador'}}});if(error){authMessage(error.message);setBusy(btn,false);return}if(data.session){await ensureAccess()}else authMessage('Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión.','success');setBusy(btn,false)};
    $('forgotPassword').onclick=()=>showAuthView('recoveryView');$('recoveryBack').onclick=()=>showAuthView('loginView');$('backToLogin').onclick=()=>showAuthView('loginView');
    $('recoveryForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;setBusy(btn,true,'Enviando…');const {error}=await db.auth.resetPasswordForEmail($('recoveryEmail').value.trim(),{redirectTo:location.origin+location.pathname});if(error)authMessage(error.message);else authMessage('Enlace enviado. Revisa tu correo.','success');setBusy(btn,false)};
    $('newPasswordForm').onsubmit=async e=>{e.preventDefault();if($('newPassword').value!==$('newPassword2').value){authMessage('Las contraseñas no coinciden.');return}const btn=e.submitter;setBusy(btn,true,'Guardando…');const {error}=await db.auth.updateUser({password:$('newPassword').value});if(error){authMessage(error.message);setBusy(btn,false);return}history.replaceState({},'',location.pathname);authMessage('Contraseña actualizada.','success');setTimeout(()=>{openApp()},600);setBusy(btn,false)};
    $('signOut').onclick=async()=>{await db.auth.signOut();location.reload()};
    document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));
    $('quickNew').onclick=()=>openJourney();$('newJourney').onclick=()=>openJourney();$('adminSearch').oninput=renderJourneysTable;$('adminStatus').onchange=renderJourneysTable;
    $('journeyForm').onsubmit=saveJourney;$('fLat').onchange=()=>{if(formMap)setFormPoint(+$('fLat').value,+$('fLng').value)};$('fLng').onchange=()=>{if(formMap)setFormPoint(+$('fLat').value,+$('fLng').value)};
    $('fFlyer').onchange=e=>{const f=e.target.files[0];if(f&&validateFile(f))pendingFlyer=f};$('fPhotos').onchange=e=>{pendingPhotos=[...e.target.files].filter(validateFile)};
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const d=$(b.dataset.close);d.close();document.body.classList.remove('modal-open')});
    $('inviteUser').onclick=()=>$('userDialog').showModal();$('userForm').onsubmit=inviteUser;$('refreshAudit').onclick=loadAll;
  }

  db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){showAuthView('newPasswordView');$('authScreen').hidden=false;$('appShell').hidden=true}});
  window.addEventListener('beforeunload',()=>objectUrls.forEach(u=>URL.revokeObjectURL(u)));

  bindUI();
  db.auth.getSession().then(async({data})=>{if(data.session)await ensureAccess();else showLogin()});
})();
