// js/email.js — Emails via Resend

const Email = {
  async _send(to, subject, body) {
    if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('votre')) {
      console.log(`📧 [SIMULÉ] → ${to} | ${subject}`);
      return true;
    }
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Sojalim RDV <${MAIL_FROM}>`,
          to: [to], subject,
          text: body,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;padding:2rem;font-size:14px;line-height:1.7;color:#1a1a14"><pre style="white-space:pre-wrap;font-family:inherit">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></div>`,
        }),
      });
    } catch(e) { console.error('Email error:', e); }
    return true;
  },

  welcome(u) {
    return this._send(u.email, 'Bienvenue sur Sojalim RDV',
      `Bonjour ${u.first_name},\n\nVotre compte Sojalim a été créé avec succès.\n\nConnectez-vous sur : ${APP_URL}/index.html\n\nCordialement,\nL'équipe Sojalim — Sanders Euralis\n193 Impasse Lautrec, 65500 Vic-en-Bigorre · 05 62 96 00 00`
    );
  },

  pending(u) {
    return this._send(u.email, '⏳ Compte créé — en attente de validation',
      `Bonjour ${u.first_name},\n\nVotre compte est en attente de validation par l'équipe Sojalim.\nVous recevrez un email dès l'activation (sous 24h).\n\nContact : 05 62 96 00 00 · contact@sojalim.fr\n\nCordialement,\nL'équipe Sojalim — Sanders Euralis`
    );
  },

  approved(u) {
    return this._send(u.email, '✅ Votre compte Sojalim a été activé',
      `Bonjour ${u.first_name},\n\nVotre compte a été approuvé ! Connectez-vous :\n${APP_URL}/index.html\n\nCordialement,\nL'équipe Sojalim — Sanders Euralis`
    );
  },

  confirmed(u, a) {
    return this._send(u.email, `✅ Confirmation RDV — ${a.id}`,
      `Bonjour ${u.first_name},\n\nVotre rendez-vous est confirmé.\n\n📋 Référence    : ${a.id}\n📅 Date         : ${fmtDate(a.date)}\n🕐 Créneau      : ${a.slot} – ${addMins(a.slot,30)}\n🚛 Immatriculation : ${a.truck_plate}\n🫘 Chargement   : ${a.load_type}\n⚖️ Tonnage       : ${a.tonnage}T\n📋 Bon de cmd   : ${a.order_number}\n\nPrésentez-vous à l'heure avec cette référence.\nAdresse : 193 Impasse Lautrec, 65500 Vic-en-Bigorre\n\nCordialement,\nL'équipe Sojalim — Sanders Euralis`
    );
  },

  cancelled(u, a) {
    return this._send(u.email, `❌ Annulation RDV — ${a.id}`,
      `Bonjour ${u.first_name},\n\nVotre RDV ${a.id} du ${fmtDate(a.date)} à ${a.slot} a été annulé.\n\nNouvel RDV : ${APP_URL}/dashboard.html\n\nCordialement,\nL'équipe Sojalim — Sanders Euralis`
    );
  },

  reminder(u, a) {
    return this._send(u.email, `📅 Rappel RDV demain — ${a.id}`,
      `Bonjour ${u.first_name},\n\nRappel : vous avez un rendez-vous demain.\n\n📋 ${a.id} · 📅 ${fmtDate(a.date)} · 🕐 ${a.slot} · 🚛 ${a.truck_plate}\n\n193 Impasse Lautrec, 65500 Vic-en-Bigorre\n\nCordialement,\nL'équipe Sojalim`
    );
  },

  // Invitation admin → transporteur
  inviteTransporter(to, token, admin, note='') {
    const link = `${APP_URL}/index.html?token=${token}&role=transporter`;
    return this._send(to, '✉️ Invitation Sojalim RDV — Créez votre compte transporteur',
      `Bonjour,\n\n${admin.first_name} ${admin.last_name} (Sojalim) vous invite à créer votre compte transporteur.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 Lien d'inscription (7 jours) :\n${link}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${note?`Note : ${note}\n\n`:''}Après inscription, votre compte sera activé sous 24h.\n\nSojalim — Sanders Euralis · 05 62 96 00 00`
    );
  },

  // Invitation transporteur → chauffeur
  inviteDriver(to, token, transporter, note='') {
    const link = `${APP_URL}/index.html?token=${token}&role=driver`;
    return this._send(to, `✉️ ${transporter.company} vous invite sur Sojalim RDV`,
      `Bonjour,\n\n${transporter.company} vous invite à créer votre compte chauffeur pour prendre des rendez-vous de chargement chez Sojalim.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 Lien d'inscription (7 jours) :\n${link}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${note?`Note : ${note}\n\n`:''}Sojalim — Sanders Euralis\n193 Impasse Lautrec, 65500 Vic-en-Bigorre`
    );
  },
};
