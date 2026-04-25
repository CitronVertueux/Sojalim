// ═══════════════════════════════════════════════════
// js/config.js — Remplacer les 5 valeurs ci-dessous
// ═══════════════════════════════════════════════════
const SUPABASE_URL      = 'https://btdrbvbchccqjzwyhcfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ZHJidmJjaGNjcWp6d3loY2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1OTcsImV4cCI6MjA5MjUxMDU5N30.FGEwM0hz7kevHw3MM-ZQZtTLeHda4XPxvsYrr2cUcb8';
const RESEND_API_KEY    = 're_Ns2Be95p_6tQTq2zWHLj71CSy11NHTjvb';
const APP_URL           = 'https://citronvertueux.github.io/Sojalim';
const MAIL_FROM         = 'onboarding@resend.dev';

// ── CLIENT SUPABASE ──────────────────────────────────
const SB = {
  _headers() {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    };
  },
  async _req(method, path, body, qs = {}) {
    let url = SUPABASE_URL + '/rest/v1/' + path;
    const params = Object.entries(qs).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    if (params) url += '?' + params;
    const opts = { method, headers: this._headers() };
    if (body && ['POST','PATCH','PUT'].includes(method)) opts.body = JSON.stringify(body);
    const res  = await fetch(url, opts);
    const text = await res.text();
    const data = text ? JSON.parse(text) : [];
    if (!res.ok) {
      const msg = Array.isArray(data)
        ? (data[0]?.message || JSON.stringify(data))
        : (data?.message || data?.error || `HTTP ${res.status}`);
      throw new Error(msg);
    }
    return data;
  },
  async select(table, filters = {}) { return this._req('GET', table, null, filters); },
  async one(table, filters = {})    { const r = await this.select(table, {...filters, limit:'1'}); return r?.[0] || null; },
  async insert(table, body)         { const r = await this._req('POST', table, body); return Array.isArray(r) ? r[0] : r; },
  async update(table, filters, body){ return this._req('PATCH', table, body, filters); },
  async delete(table, filters)      { return this._req('DELETE', table, null, filters); },
  async rpc(fn, params = {}) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: this._headers(), body: JSON.stringify(params),
    });
    return res.text().then(t => t ? JSON.parse(t) : null);
  },
};

// ── CONSTANTES ────────────────────────────────────────
const LOAD_TYPES = ['Tourteau de soja','Huile de soja brute','Coques de soja','Soja en graines'];
const HOLIDAYS = new Set([
  '2025-01-01','2025-04-21','2025-05-01','2025-05-08','2025-05-29','2025-06-09',
  '2025-07-14','2025-08-15','2025-11-01','2025-11-11','2025-12-25',
  '2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14','2026-05-25',
  '2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25',
  '2027-01-01','2027-03-29','2027-05-01','2027-05-08','2027-05-13','2027-05-24',
  '2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25',
]);
const SLOTS = (() => {
  const s = [];
  for (let h = 5; h <= 15; h++)
    for (let m = 0; m < 60; m += 30)
      s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  return s;
})();

// ── UTILITAIRES ───────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
function fmtDate(d) {
  if (!d) return '';
  const J = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const M = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const dt = new Date(d + 'T12:00:00');
  return `${J[dt.getDay()]} ${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtShort(d) { if (!d) return ''; const dt = new Date(d+'T12:00:00'); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; }
function fmtDT(ts) { if (!ts) return ''; return new Date(ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function addMins(t, m) { if (!t) return ''; const [h,mn]=t.slice(0,5).split(':').map(Number),tot=h*60+mn+m; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`; }
function isDayOpen(date, closures = []) {
  if (!date) return false;
  const dow = new Date(date + 'T12:00:00').getDay();
  if (dow === 0 || dow === 6) return false;
  if (HOLIDAYS.has(date)) return false;
  if (closures.find(c => (c.date||c) === date)) return false;
  return true;
}
function newRdvId() { return 'RDV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(); }
function generateToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2,'0')).join(''); }
function getWeekDays(date) {
  const dt = new Date(date+'T12:00:00'), mon = new Date(dt);
  mon.setDate(dt.getDate()-((dt.getDay()||7)-1));
  return Array.from({length:5},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d.toISOString().split('T')[0];});
}

// ── DOM ───────────────────────────────────────────────
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const go = url => window.location.href = url;
function showAlert(el, msg, type='error') {
  if (!el) return;
  el.innerHTML = `<div class="al al--${type}">${msg}</div>`;
  if (type==='success') setTimeout(()=>{if(el)el.innerHTML='';},4000);
}
function btnLoading(btn, txt='…') {
  btn.disabled=true; btn._orig=btn.innerHTML; btn.textContent=txt;
  return ()=>{btn.disabled=false;btn.innerHTML=btn._orig;};
}
function toggleDetail(id) { const d=document.getElementById(id); if(d)d.style.display=d.style.display==='block'?'none':'block'; }

// ── PWA ───────────────────────────────────────────────
let _pwaPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _pwaPrompt=e; $$('.pwa-btn').forEach(b=>b.style.display='flex'); });
window.addEventListener('appinstalled', () => { _pwaPrompt=null; $$('.pwa-btn').forEach(b=>{b.textContent='✅ App installée';b.disabled=true;}); });
function installPWA(btn) {
  if (_pwaPrompt) { _pwaPrompt.prompt(); _pwaPrompt.userChoice.then(r=>{if(r.outcome==='accepted'){btn.textContent='✅ App installée';btn.disabled=true;}}); }
  else btn.nextElementSibling?.classList.toggle('open');
}
const LANG = localStorage.getItem('slm_lang') || 'fr';
function toggleLang() { localStorage.setItem('slm_lang', LANG==='fr'?'es':'fr'); location.reload(); }
