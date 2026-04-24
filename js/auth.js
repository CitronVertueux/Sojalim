// js/auth.js — Authentification

const Auth = {
  user() {
    try { return JSON.parse(sessionStorage.getItem('slm_user')); } catch { return null; }
  },
  setUser(u) {
    if (u) sessionStorage.setItem('slm_user', JSON.stringify(u));
    else { sessionStorage.removeItem('slm_user'); sessionStorage.removeItem('slm_token'); }
  },
  require(roles=null) {
    const u = this.user();
    if (!u) { go('index.html'); return null; }
    if (roles && !roles.includes(u.role)) { go('index.html'); return null; }
    return u;
  },

 async login(email, password) {
    const rows = await SB.select('users', {
      email: `eq.${email.toLowerCase().trim()}`,
      select: 'id,email,role,first_name,last_name,company,phone,siret,address,status,parent_id,password_hash'
    });
    if (!rows?.length) throw new Error('Email ou mot de passe incorrect.');
    const u = rows[0];
    if (u.status === 'disabled') throw new Error('Compte désactivé. Contactez l\'administrateur.');
    if (u.status === 'pending')  throw new Error('Compte en attente d\'activation.');

    // Vérification mot de passe via RPC
    const result = await SB.rpc('check_password', {
      input_password: password,
      hashed_password: u.password_hash
    });
    
    if (!result) throw new Error('Email ou mot de passe incorrect.');

    await SB.update('users', { id: `eq.${u.id}` }, { last_login: new Date().toISOString() });
    delete u.password_hash;
    this.setUser(u);
    return u;
  },

  async register(data, inviteToken=null) {
    const email = data.email.toLowerCase().trim();
    const exists = await SB.one('users', { email: `eq.${email}`, select: 'id' });
    if (exists) throw new Error('Cet email est déjà utilisé.');

    // Vérifie invitation
    let invite = null;
    if (inviteToken) {
      const invs = await SB.select('invitations', {
        token: `eq.${inviteToken}`, status: 'eq.pending', select: 'id,role,invited_by,expires_at'
      });
      invite = invs?.[0] || null;
      if (!invite) throw new Error('Lien d\'invitation invalide ou expiré.');
      if (new Date(invite.expires_at) < new Date()) throw new Error('Lien d\'invitation expiré.');
    } else {
      // Vérifie si invitation en attente par email
      const invs = await SB.select('invitations', {
        email: `eq.${email}`, status: 'eq.pending', select: 'id,role,invited_by'
      });
      invite = invs?.[0] || null;
    }

    const status = invite ? 'pending' : 'active';
    const role   = invite?.role || data.role || 'transporter';
    const pwHash = await SB.rpc('hash_password', { password: data.password });

    const user = await SB.insert('users', {
      email,
      password_hash: pwHash,
      role,
      first_name: data.first_name.trim(),
      last_name:  data.last_name.trim(),
      company:    data.company.trim(),
      phone:      data.phone.trim(),
      siret:      data.siret?.trim() || '',
      address:    data.address?.trim() || '',
      parent_id:  invite?.invited_by || null,
      status,
    });

    if (invite) {
      await SB.update('invitations', { id: `eq.${invite.id}` }, {
        status: 'used', used_at: new Date().toISOString()
      });
    }

    const u = Array.isArray(user) ? user[0] : user;
    if (u) { delete u.password_hash; }
    return { user: u, status, role };
  },

  async updateProfile(userId, data) {
    const allowed = ['first_name','last_name','company','phone','siret','address','email'];
    const update = {};
    allowed.forEach(k => { if (data[k] !== undefined) update[k] = data[k]; });
    if (data.password) {
      if (data.password.length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
      update.password_hash = await SB.rpc('hash_password', { password: data.password });
    }
    if (!Object.keys(update).length) throw new Error('Aucune donnée à mettre à jour.');
    const rows = await SB.update('users', { id: `eq.${userId}` }, update);
    const u = Array.isArray(rows) ? rows[0] : rows;
    if (u) { delete u.password_hash; this.setUser({...this.user(), ...u}); }
    return u;
  },

  logout() { this.setUser(null); go('index.html'); },

  async createInvitation(email, role, invitedBy, note='') {
    email = email.toLowerCase().trim();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new Error('Email invalide.');
    const exists = await SB.one('users', { email: `eq.${email}`, select: 'id' });
    if (exists) throw new Error('Un compte existe déjà avec cet email.');
    const pend = await SB.one('invitations', { email: `eq.${email}`, status: 'eq.pending', select: 'id' });
    if (pend) throw new Error('Une invitation est déjà en attente pour cet email.');
    const token = generateToken();
    const inv = await SB.insert('invitations', {
      email, token, role,
      invited_by: invitedBy,
      note: note || '',
      status: 'pending',
      expires_at: new Date(Date.now() + 7*86400000).toISOString(),
    });
    return { ...(Array.isArray(inv)?inv[0]:inv), token };
  },
};
