// js/rdv.js — Logique RDV partagée

const RDV = {

  async getClosures() {
    return await SB.select('closures', { select: 'date,reason', order: 'date.asc' }) || [];
  },

  async getSettings() {
    const rows = await SB.select('settings') || [];
    const s = {};
    rows.forEach(r => s[r.key] = r.value);
    return { maxTrucks: parseInt(s.max_trucks_per_day||'20'), maxTonnage: parseInt(s.max_tonnage_per_day||'500') };
  },

  async getDayAppts(date) {
    return await SB.select('appointments', {
      date: `eq.${date}`,
      select: 'id,slot,status,driver_name,driver_phone,truck_plate,company_name,load_type,tonnage,order_number,notes,user_id,transporter_id,created_at',
    }) || [];
  },

  async getUserAppts(userId) {
    return await SB.select('appointments', {
      user_id: `eq.${userId}`,
      select: '*',
      order: 'date.desc,slot.asc',
    }) || [];
  },

  async getTransporterAppts(transporterId) {
    // RDV du transporteur + ses chauffeurs
    return await SB.select('appointments', {
      transporter_id: `eq.${transporterId}`,
      select: '*',
      order: 'date.desc,slot.asc',
    }) || [];
  },

  async getAllAppts() {
    return await SB.select('appointments', {
      select: '*',
      order: 'date.desc,slot.asc',
    }) || [];
  },

  async create(user, data) {
    const { date, slot } = data;

    // Vérifie jour ouvrable
    const closures = await this.getClosures();
    if (!isDayOpen(date, closures)) throw new Error("Ce jour n'est pas ouvrable.");

    // Vérifie créneau disponible
    const dayAppts = await this.getDayAppts(date);
    const slotNorm = slot.slice(0,5);
    const slotTaken = dayAppts.find(a => a.slot.slice(0,5) === slotNorm && a.status !== 'cancelled');
    if (slotTaken) throw new Error('Ce créneau est déjà pris.');

    // Vérifie capacité
    const settings = await this.getSettings();
    const confirmed = dayAppts.filter(a => a.status === 'confirmed').length;
    const status = confirmed >= settings.maxTrucks ? 'waitlist' : 'confirmed';

    // Détermine le transporter_id
    let transporter_id = null;
    if (user.role === 'transporter') transporter_id = user.id;
    else if (user.role === 'driver') transporter_id = user.parent_id;

    const appt = await SB.insert('appointments', {
      id: newRdvId(),
      user_id: user.id,
      transporter_id,
      date,
      slot: slotNorm,
      driver_name:  data.driver_name.trim(),
      driver_phone: data.driver_phone.trim(),
      truck_plate:  data.truck_plate.trim().toUpperCase(),
      company_name: data.company_name || user.company,
      load_type:    data.load_type,
      tonnage:      parseFloat(data.tonnage) || 0,
      order_number: data.order_number.trim(),
      notes:        data.notes?.trim() || '',
      status,
    });
    return { appt: Array.isArray(appt)?appt[0]:appt, status };
  },

  async cancel(apptId) {
    await SB.update('appointments', { id: `eq.${apptId}` }, {
      status: 'cancelled', updated_at: new Date().toISOString()
    });
  },

  async updateStatus(apptId, status) {
    await SB.update('appointments', { id: `eq.${apptId}` }, {
      status, updated_at: new Date().toISOString()
    });
  },

  async deleteAppt(apptId) {
    await SB.delete('appointments', { id: `eq.${apptId}` });
  },

  async update(apptId, data) {
    const allowed = ['slot','driver_name','driver_phone','truck_plate','load_type','tonnage','order_number','notes','status'];
    const update = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (data[k] !== undefined) update[k] = data[k]; });
    if (update.slot) update.slot = update.slot.slice(0,5);
    await SB.update('appointments', { id: `eq.${apptId}` }, update);
  },
};
