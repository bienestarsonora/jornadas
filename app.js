(() => {
  'use strict';

  if (/type=(invite|recovery)/.test(location.hash)) { location.replace(`admin/${location.hash}`); return; }

  const cfg = window.JORNADAS_CONFIG;
  document.querySelectorAll('[data-logo]').forEach(img => { img.src = cfg.LOGO_DATA_URI; });
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => new Intl.NumberFormat('es-MX').format(Number(n) || 0);
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const dateLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });
  const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });

  let jornadas = [];
  let evidencias = [];
  let selectedId = null;
  let map;
  let markerLayer;
  const objectUrls = new Map();

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function initMap() {
    if (!window.L) {
      $('map').innerHTML = '<div class="panel-empty"><h3>No fue posible cargar el mapa</h3><p>Verifica la conexión e intenta nuevamente.</p></div>';
      return;
    }
    map = L.map('map', { scrollWheelZoom: true, zoomControl: true, preferCanvas: true }).setView([29.0892, -110.9613], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 10, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  async function loadData() {
    try {
      const { data: js, error: je } = await client
        .from('jornadas')
        .select('*')
        .eq('status', 'published')
        .order('event_date', { ascending: false });
      if (je) throw je;
      jornadas = js || [];

      if (jornadas.length) {
        const ids = jornadas.map(j => j.id);
        const { data: ev, error: ee } = await client
          .from('jornadas_evidencias')
          .select('*')
          .in('jornada_id', ids)
          .order('sort_order', { ascending: true });
        if (ee) throw ee;
        evidencias = ev || [];
      } else {
        evidencias = [];
      }

      renderAll();
      hydrateVisibleImages();
    } catch (err) {
      console.error(err);
      toast('No fue posible consultar la información.');
      renderAll();
    }
  }

  function evidenceFor(id, kind) {
    return evidencias.filter(e => e.jornada_id === id && (!kind || e.kind === kind));
  }

  async function blobUrl(path) {
    if (!path) return '';
    if (objectUrls.has(path)) return objectUrls.get(path);
    const { data, error } = await client.storage.from(cfg.STORAGE_BUCKET).download(path);
    if (error || !data) return '';
    const url = URL.createObjectURL(data);
    objectUrls.set(path, url);
    return url;
  }

  function filtered() {
    const q = ($('searchInput')?.value || '').trim().toLowerCase();
    const y = $('yearFilter')?.value || 'all';
    return jornadas.filter(j => {
      const text = [j.title, j.place, j.neighborhood, ...(j.services || []), ...(j.agencies || [])].join(' ').toLowerCase();
      return (y === 'all' || String(j.event_date).startsWith(y)) && (!q || text.includes(q));
    });
  }

  function renderAll() {
    renderStats();
    renderYears();
    renderMap();
    renderJourneys();
    renderGallery();
  }

  function renderStats() {
    const services = jornadas.reduce((a, j) => a + (Number(j.services_count) || 0), 0);
    const outreach = jornadas.reduce((a, j) => a + (Number(j.door_days) || 0) + (Number(j.speaker_days) || 0), 0);
    const neighborhoods = new Set(jornadas.map(j => j.neighborhood).filter(Boolean)).size;
    const agencies = new Set(jornadas.flatMap(j => j.agencies || [])).size;

    [['heroEvents', jornadas.length], ['heroServices', services], ['heroNeighborhoods', neighborhoods],
     ['heroAgencies', agencies], ['heroOutreach', outreach], ['statEvents', jornadas.length],
     ['statServices', services], ['statNeighborhoods', neighborhoods], ['statOutreach', outreach]]
      .forEach(([id, value]) => { const el = $(id); if (el) el.textContent = fmt(value); });
  }

  function renderYears() {
    const select = $('yearFilter');
    if (!select) return;
    const current = select.value || 'all';
    const years = [...new Set(jornadas.map(j => String(j.event_date).slice(0,4)))].sort().reverse();
    select.innerHTML = '<option value="all">Todos los años</option>' + years.map(y => `<option value="${esc(y)}">${esc(y)}</option>`).join('');
    select.value = years.includes(current) ? current : 'all';
  }

  function renderMap() {
    const list = filtered();
    $('visibleCount').textContent = list.length;
    if (!markerLayer) return;
    markerLayer.clearLayers();
    const icon = L.divIcon({ className:'', html:'<div class="custom-marker"></div>', iconSize:[30,30], iconAnchor:[15,30] });

    list.forEach(j => {
      if (!Number.isFinite(Number(j.lat)) || !Number.isFinite(Number(j.lng))) return;
      L.marker([Number(j.lat), Number(j.lng)], { icon })
        .addTo(markerLayer)
        .bindTooltip(`${esc(j.neighborhood)} · ${fmt(j.services_count)} servicios`)
        .on('click', () => showEvent(j.id));
    });

    if (list.length > 1) {
      const pts = list.filter(j => Number.isFinite(Number(j.lat)) && Number.isFinite(Number(j.lng))).map(j => [Number(j.lat), Number(j.lng)]);
      if (pts.length > 1) map.fitBounds(pts, { padding:[45,45], maxZoom:14 });
    } else if (list.length === 1) {
      map.setView([Number(list[0].lat), Number(list[0].lng)], 14);
    } else {
      map.setView([29.0892, -110.9613], 12);
    }
  }

  async function showEvent(id) {
    const j = jornadas.find(x => x.id === id);
    if (!j) return;
    selectedId = id;
    if (map && Number.isFinite(Number(j.lat))) map.flyTo([Number(j.lat), Number(j.lng)], 14, { duration:.8 });

    const flyer = evidenceFor(id, 'flyer')[0];
    const photos = evidenceFor(id, 'photo');
    const coverEvidence = photos[0] || flyer;
    const coverUrl = coverEvidence ? await blobUrl(coverEvidence.storage_path) : '';
    const flyerUrl = flyer ? await blobUrl(flyer.storage_path) : '';
    const photoUrls = await Promise.all(photos.slice(0,6).map(async p => ({ ...p, url: await blobUrl(p.storage_path) })));

    $('eventPanel').innerHTML = `
      <div class="event-cover">${coverUrl ? `<img src="${coverUrl}" alt="${esc(j.title)}">` : ''}<span class="event-date">${esc(dateLabel(j.event_date))}</span></div>
      <div class="event-body">
        <span class="event-kicker">Jornada del Bienestar</span>
        <h3>${esc(j.title)}</h3>
        <div class="event-place">${esc(j.place)} · Col. ${esc(j.neighborhood)}</div>
        <div class="event-metrics">
          <div><b>${fmt(j.services_count)}</b><small>Servicios</small></div>
          <div><b>${fmt((j.services || []).length)}</b><small>Tipos</small></div>
          <div><b>${fmt((j.door_days || 0) + (j.speaker_days || 0))}</b><small>Días difusión</small></div>
        </div>
        ${j.summary ? `<p class="event-summary">${esc(j.summary)}</p>` : ''}
        ${(j.services || []).length ? `<div class="detail-block"><h4>Servicios ofrecidos</h4><div class="tag-list">${j.services.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>` : ''}
        ${(j.agencies || []).length ? `<div class="detail-block"><h4>Dependencias participantes</h4><div class="agency-list">${j.agencies.map(x => `<div class="agency">${esc(x)}</div>`).join('')}</div></div>` : ''}
        <div class="detail-block"><h4>Difusión territorial</h4><div class="agency-list"><div class="agency">Casa por casa: ${fmt(j.door_days)} día(s)</div><div class="agency">Perifoneo: ${fmt(j.speaker_days)} día(s)</div></div></div>
        ${flyerUrl ? `<div class="detail-block"><h4>Flyer de la jornada</h4><img class="flyer-thumb zoomable" src="${flyerUrl}" data-caption="Flyer · ${esc(j.title)}" alt="Flyer de ${esc(j.title)}"></div>` : ''}
        ${photoUrls.some(p => p.url) ? `<div class="detail-block"><h4>Galería fotográfica</h4><div class="panel-gallery">${photoUrls.filter(p => p.url).map((p,i) => `<img class="zoomable" src="${p.url}" data-caption="${esc(p.caption || `${j.title} · Evidencia ${i+1}`)}" alt="Evidencia ${i+1}">`).join('')}</div></div>` : ''}
      </div>`;
    bindZoomables();
  }

  function renderJourneys() {
    const grid = $('journeyGrid');
    const empty = $('journeyEmpty');
    if (!jornadas.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = jornadas.map(j => {
      const cover = evidenceFor(j.id, 'photo')[0] || evidenceFor(j.id, 'flyer')[0];
      return `<article class="journey-card" data-open-event="${j.id}">
        <div class="journey-media" ${cover ? `data-image-path="${esc(cover.storage_path)}"` : ''}><span>${esc(shortDate(j.event_date))}</span></div>
        <div class="journey-card-body"><small>${esc(j.neighborhood)}</small><h3>${esc(j.title)}</h3><p>${esc(j.place)}${j.summary ? ` · ${esc(j.summary).slice(0,105)}${j.summary.length > 105 ? '…' : ''}` : ''}</p>
        <div class="journey-card-foot"><span>Servicios brindados</span><b>${fmt(j.services_count)}</b></div></div>
      </article>`;
    }).join('');
    document.querySelectorAll('[data-open-event]').forEach(card => card.addEventListener('click', () => {
      document.querySelector('#mapa').scrollIntoView({ behavior:'smooth', block:'start' });
      setTimeout(() => showEvent(card.dataset.openEvent), 500);
    }));
  }

  function renderGallery() {
    const gallery = $('globalGallery');
    const empty = $('galleryEmpty');
    const photos = evidencias.filter(e => e.kind === 'photo').slice(0,12);
    if (!photos.length) {
      gallery.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    gallery.innerHTML = photos.map(p => {
      const j = jornadas.find(x => x.id === p.jornada_id);
      return `<figure class="gallery-item" data-image-path="${esc(p.storage_path)}" data-caption="${esc(p.caption || (j ? `${j.neighborhood} · ${j.title}` : 'Evidencia'))}"><figcaption>${esc(p.caption || (j ? `${j.neighborhood} · ${j.title}` : 'Evidencia'))}</figcaption></figure>`;
    }).join('');
  }

  async function hydrateVisibleImages() {
    const mediaEls = [...document.querySelectorAll('[data-image-path]')];
    await Promise.all(mediaEls.map(async el => {
      const url = await blobUrl(el.dataset.imagePath);
      if (!url) return;
      if (el.classList.contains('gallery-item')) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = el.dataset.caption || 'Evidencia';
        el.prepend(img);
        el.classList.add('zoomable');
        el.dataset.src = url;
      } else if (el.classList.contains('journey-media')) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Evidencia de jornada';
        el.prepend(img);
      }
    }));
    bindZoomables();
  }

  function bindZoomables() {
    document.querySelectorAll('.zoomable').forEach(el => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const src = el.dataset.src || el.src || el.querySelector('img')?.src;
        if (!src) return;
        $('lightboxImage').src = src;
        $('lightboxCaption').textContent = el.dataset.caption || '';
        $('lightbox').showModal();
      };
    });
  }

  function setupUI() {
    $('searchInput').addEventListener('input', renderMap);
    $('yearFilter').addEventListener('change', renderMap);
    $('closeLightbox').addEventListener('click', () => $('lightbox').close());
    $('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) $('lightbox').close(); });

    const menu = $('menuToggle');
    menu.addEventListener('click', () => {
      const nav = document.querySelector('.site-header nav');
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? '×' : '☰';
    });
    document.querySelectorAll('.site-header nav a').forEach(a => a.addEventListener('click', () => {
      document.querySelector('.site-header nav').classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
    }));

    const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold:.11 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  window.addEventListener('beforeunload', () => objectUrls.forEach(url => URL.revokeObjectURL(url)));

  setupUI();
  initMap();
  loadData();
  setTimeout(() => map?.invalidateSize(), 350);
})();
