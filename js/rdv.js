// js/rdv.js — Logique RDV
const RDV = {
  async getClosures()  { return await SB.select('closures',{select:'date,reason',order:'date.asc'})||[]; },
  async getSettings()  {
    const rows = await SB.select('settings')||[];
    const s = {}; rows.forEach(r=>s[r.key]=r.value);
    return { maxTrucks:parseInt(s.max_trucks_per_day||'20'), maxTonnage:parseInt(s.max_tonnage_per_day||'500'),
             penaltyNoShow:parseFloat(s.penalty_no_show||'2'), penaltyLate30:parseFloat(s.penalty_late_30||'0.5'),
             penaltyLate60:parseFloat(s.penalty_late_60||'1'), threshWarn:parseFloat(s.penalty_threshold_warning||'3'),
             threshDanger:parseFloat(s.penalty_threshold_danger||'5') };
  },
  async getDayAppts(date) { return await SB.select('appointments',{date:`eq.${date}`,select:'*'})||[]; },
  async getUserAppts(uid) { return await SB.select('appointments',{user_id:`eq.${uid}`,select:'*',order:'date.desc,slot.asc'})||[]; },
  async getTransporterAppts(tid) { return await SB.select('appointments',{transporter_id:`eq.${tid}`,select:'*',order:'date.desc,slot.asc'})||[]; },
  async getAllAppts()    { return await SB.select('appointments',{select:'*',order:'date.desc,slot.asc'})||[]; },
  async getUserScore(uid) {
    const rows = await SB.select('transporter_scores',{id:`eq.${uid}`,select:'*'});
    return rows?.[0] || null;
  },
  async getAllScores()   { return await SB.select('transporter_scores',{select:'*',order:'total_penalty.desc'})||[]; },
  async getIncidents(uid) { return await SB.select('incidents',{user_id:`eq.${uid}`,select:'*',order:'created_at.desc'})||[]; },
  async getAllIncidents()  { return await SB.select('incidents',{select:'*',order:'created_at.desc'})||[]; },

  async create(user, data) {
    const {date, slot} = data;
    const closures = await this.getClosures();
    if (!isDayOpen(date, closures)) throw new Error("Ce jour n'est pas ouvrable.");
    const dayAppts = await this.getDayAppts(date);
    const slotNorm = slot.slice(0,5);
    if (dayAppts.find(a=>a.slot.slice(0,5)===slotNorm&&a.status!=='cancelled')) throw new Error('Ce créneau est déjà pris.');
    const settings = await this.getSettings();
    const confirmed = dayAppts.filter(a=>a.status==='confirmed').length;
    const status = confirmed >= settings.maxTrucks ? 'waitlist' : 'confirmed';
    let transporter_id = null;
    if (user.role==='transporter') transporter_id = user.id;
    else if (user.role==='driver') transporter_id = user.parent_id;
    const appt = await SB.insert('appointments', {
      id: newRdvId(), user_id: user.id, transporter_id, date, slot: slotNorm,
      driver_name:  data.driver_name.trim(),
      driver_phone: data.driver_phone.trim(),
      truck_plate:  data.truck_plate.trim().toUpperCase(),
      company_name: data.company_name || user.company,
      load_type:    data.load_type,
      tonnage:      parseFloat(data.tonnage)||0,
      order_number: data.order_number.trim(),
      notes:        data.notes?.trim()||'', status,
    });
    return {appt: Array.isArray(appt)?appt[0]:appt, status};
  },

  async cancel(id)              { await SB.update('appointments',{id:`eq.${id}`},{status:'cancelled',updated_at:new Date().toISOString()}); },
  async updateStatus(id,status) { await SB.update('appointments',{id:`eq.${id}`},{status,updated_at:new Date().toISOString()}); },
  async deleteAppt(id)          { await SB.delete('appointments',{id:`eq.${id}`}); },

  async addIncident(apptId, userId, type, lateMinutes, note, penalty, createdBy) {
    const inc = await SB.insert('incidents',{
      appointment_id: apptId, user_id: userId, type,
      late_minutes: lateMinutes||0, penalty: penalty||0,
      note: note||'', created_by: createdBy,
    });
    return Array.isArray(inc)?inc[0]:inc;
  },

  async deleteIncident(id) { await SB.delete('incidents',{id:`eq.${id}`}); },
};
