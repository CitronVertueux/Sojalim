// js/utils.js — Utilitaires partagés + helpers Supabase

const todayStr = () => new Date().toISOString().split('T')[0];

function fmtDate(d) {
  if (!d) return '';
  const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const dt = new Date(d + 'T12:00:00');
  return jours[dt.getDay()] + ' ' + dt.getDate() + ' ' + mois[dt.getMonth()] + ' ' + dt.getFullYear();
}

function fmtShort(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0');
}

function fmtDT(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function addMins(t, m) {
  if (!t) return '';
  const [h, mn] = t.split(':').map(Number);
  const tot = h * 60 + mn + m;
  return String(Math.floor(tot/60)).padStart(2,'0') + ':' + String(tot%60).padStart(2,'0');
}

function slotEnd(s) { return addMins(s, 30); }

function isDayOpen(date, closures) {
  closures = closures || [];
  if (!date) return false;
  const dow = new Date(date + 'T12:00:00').getDay();
  if (dow === 0 || dow === 6) return false;
  if (HOLIDAYS.has(date)) return false;
  if (closures.find(function(c){ return c.date === date; })) return false;
  return true;
}

function getWeekDays(date) {
  const dt = new Date(date + 'T12:00:00');
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - ((dt.getDay() || 7) - 1));
  return Array.from({ length: 5 }, function(_, i) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function newRdvId() {
  return 'RDV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

function newToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

const $  = function(s, ctx) { return (ctx||document).querySelector(s); };
const $$ = function(s, ctx) { return [...(ctx||document).querySelectorAll(s)]; };

function go(url) { window.location.href = url; }

function showMsg(el, msg, type) {
  if (!el) return;
  type = type || 'error';
  var cls = type === 'success' ? 's' : type === 'info' ? 'i' : type === 'warning' ? 'w' : 'e';
  el.innerHTML = '<div class="al al--' + cls + '">' + msg + '</div>';
  if (type === 'success') setTimeout(function(){ if(el) el.innerHTML = ''; }, 4000);
}

function btnLoading(btn, txt) {
  txt = txt || '…';
  btn.disabled = true;
  btn._orig = btn.innerHTML;
  btn.textContent = txt;
  return function() { btn.disabled = false; btn.innerHTML = btn._orig; };
}

// Supabase helpers
async function dbSelect(table, filters, cols, opts) {
  filters = filters || {};
  cols = cols || '*';
  opts = opts || {};
  let q = sb.from(table).select(cols);
  for (const [k, v] of Object.entries(filters)) {
    q = v === null ? q.is(k, null) : q.eq(k, v);
  }
  if (opts.order) q = q.order(opts.order, { ascending: opts.asc !== false });
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.gte)   for (const [k,v] of Object.entries(opts.gte)) q = q.gte(k, v);
  if (opts.lte)   for (const [k,v] of Object.entries(opts.lte)) q = q.lte(k, v);
  if (opts.ilike) for (const [k,v] of Object.entries(opts.ilike)) q = q.ilike(k, '%'+v+'%');
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function dbOne(table, filters, cols) {
  const rows = await dbSelect(table, filters, cols, { limit: 1 });
  return rows[0] || null;
}

async function dbInsert(table, data) {
  const { data: row, error } = await sb.from(table).insert(data).select().single();
  if (error) throw error;
  return row;
}

async function dbUpdate(table, filters, data) {
  let q = sb.from(table).update(data);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw error;
}

async function dbDelete(table, filters) {
  let q = sb.from(table).delete();
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw error;
}

async function dbSetting(key, def) {
  const row = await dbOne('settings', { key: key });
  return (row && row.value) ? row.value : (def || '');
}

// Session
let _currentUser = null;

async function getSession() {
  if (_currentUser) return _currentUser;
  const stored = sessionStorage.getItem('slm_user');
  if (stored) {
    try { _currentUser = JSON.parse(stored); return _currentUser; } catch(e) {}
  }
  return null;
}

function setSession(user) {
  _currentUser = user;
  sessionStorage.setItem('slm_user', JSON.stringify(user));
}

function clearSession() {
  _currentUser = null;
  sessionStorage.removeItem('slm_user');
}

// PWA
let _pwaPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  _pwaPrompt = e;
  $$('.pwa-btn').forEach(function(b){ b.style.display = ''; });
});
window.addEventListener('appinstalled', function() {
  _pwaPrompt = null;
  $$('.pwa-btn').forEach(function(b){ b.textContent = '✅ App installée'; b.disabled = true; });
});

function installPWA(btn) {
  if (_pwaPrompt) {
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') { btn.textContent = '✅ App installée'; btn.disabled = true; }
    });
  } else {
    const tip = btn.nextElementSibling;
    if (tip) tip.classList.toggle('open');
  }
}

// Langue
const LANG = localStorage.getItem('slm_lang') || 'fr';
function toggleLang() {
  localStorage.setItem('slm_lang', LANG === 'fr' ? 'es' : 'fr');
  location.reload();
}

// Emails
async function sendEmail(type, to, payload) {
  payload = payload || {};
  try {
    if (payload.token) {
      const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      payload.url = base + 'index.html?token=' + payload.token + '&type=' + (payload.type || 'transporteur') + '&email=' + encodeURIComponent(to);
    }
    await sb.functions.invoke('send-email', { body: { type: type, to: to, payload: payload } });
  } catch(e) {
    console.warn('Email non envoyé:', e.message);
  }
}
