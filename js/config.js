const SUPABASE_URL      = 'https://btdrbvbchccqjzwyhcfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ZHJidmJjaGNjcWp6d3loY2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1OTcsImV4cCI6MjA5MjUxMDU5N30.FGEwM0hz7kevHw3MM-ZQZtTLeHda4XPxvsYrr2cUcb8';
const RESEND_API_KEY    = 're_Ns2Be95p_6tQTq2zWHLj71CSy11NHTjvb';
const APP_URL           = 'https://citronvertueux.github.io/Sojalim';
const MAIL_FROM         = 'onboarding@resend.dev';

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
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    Object.entries(qs).forEach(([k,v]) => url.searchParams.set(k, v));
    const opts = { method, headers: this._headers() };
    if (body && ['POST','PATCH','PUT'].includes(method)) opts.body = JSON.stringify(body);
    const res  = await fetch(url.toString(), opts);
    const text = await res.text();
    const data = text ? JSON.parse(text) : [];
    if (!res.ok) throw new Error(Array.isArray(data) ? (data[0]?.message || JSON.stringify(data)) : (data?.message || data?.error || `HTTP ${res.status}`));
    return data;
  },
  async select(table, filters={}) { return this._req('GET', table, null, filters); },
  async one(table, filters={}) { const r=await this.select(table,{...filters,limit:'1'}); return r?.[0]||null; },
  async insert(table, body) { const r=await this._req('POST',table,body); return Array.isArray(r)?r[0]:r; },
  async update(table, filters, body) { return this._req('PATCH',table,body,filters); },
  async delete(table, filters) { return this._req('DELETE',table,null,filters); },
  async rpc(fn, params={}) {
    const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:this._headers(),body:JSON.stringify(params)});
    return r.text().then(t=>t?JSON.parse(t):null);
  },
};
