// ============================================================
//  UI.JS — Pure Display Logic
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.ui = {

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────
  init() {
    // Set team names
    document.getElementById('homeTeamName').textContent = LC.state.home.name;
    document.getElementById('awayTeamName').textContent = LC.state.away.name;
    document.getElementById('homeRosterTitle').textContent = LC.state.home.name.toUpperCase();
    document.getElementById('awayRosterTitle').textContent = LC.state.away.name.toUpperCase();
    this.updateScore();
    this.renderRosters();
    this.updateClock('00:00');
  },

  // ─────────────────────────────────────────────
  //  CLOCK
  // ─────────────────────────────────────────────
  updateClock(display) {
    const el = document.getElementById('clockDisplay');
    if (el) el.textContent = display;
    const isStoppage = display.includes('+');
    el && el.classList.toggle('stoppage', isStoppage);
  },

  setClockRunning(running) {
    const el = document.getElementById('clockDisplay');
    if (el) el.classList.toggle('running', running);
    const dot = document.getElementById('clockDot');
    if (dot) dot.classList.toggle('active', running);
  },

  // ─────────────────────────────────────────────
  //  SCOREBOARD
  // ─────────────────────────────────────────────
  updateScore() {
    const hEl = document.getElementById('homeScore');
    const aEl = document.getElementById('awayScore');
    if (hEl) hEl.textContent = LC.state.home.score;
    if (aEl) aEl.textContent = LC.state.away.score;

    // Pulse animation
    [hEl, aEl].forEach(el => {
      if (!el) return;
      el.classList.remove('score-pulse');
      void el.offsetWidth;
      el.classList.add('score-pulse');
    });
  },

  // ─────────────────────────────────────────────
  //  ROSTERS
  // ─────────────────────────────────────────────
  renderRosters() {
    this._renderTeamRoster('home');
    this._renderTeamRoster('away');
  },

  _renderTeamRoster(team) {
    const container = document.getElementById(`${team}RosterPlayers`);
    if (!container) return;
    const active = LC.roster.getActive(team);
    container.innerHTML = '';

    if (active.length === 0) {
      container.innerHTML = `<div class="roster-empty">No active players</div>`;
      return;
    }

    active.forEach(p => {
      const card = document.createElement('div');
      card.className = 'roster-player';
      if (p.isGK)      card.classList.add('is-gk');
      if (p.isCaptain) card.classList.add('is-captain');

      const yellows = p.yellowCount || 0;
      const cardBadges = yellows >= 1
        ? `<span class="p-badge yellow-badge">🟨</span>`
        : '';
      const gkBadge  = p.isGK      ? `<span class="p-badge gk-tag">GK</span>`  : '';
      const capBadge = p.isCaptain ? `<span class="p-badge cap-tag">C</span>` : '';

      card.innerHTML = `
        <span class="p-num">${p.number || '—'}</span>
        <span class="p-name">${p.name}</span>
        <span class="p-badges">${gkBadge}${capBadge}${cardBadges}</span>
      `;
      container.appendChild(card);
    });

    // Count display
    const countEl = document.getElementById(`${team}RosterCount`);
    if (countEl) countEl.textContent = active.length;
  },

  // ─────────────────────────────────────────────
  //  EVENT LOG
  // ─────────────────────────────────────────────
  appendEvent(ev) {
    LC.state.events.push(ev);
    const strip = document.getElementById('eventLogStrip');
    if (!strip) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${ev.team || 'neutral'}`;
    entry.innerHTML = `
      <span class="log-icon">${ev.icon}</span>
      <span class="log-time">${ev.timestamp}</span>
      <span class="log-desc">${ev.description}</span>
    `;
    strip.prepend(entry);

    // Animate in
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
      entry.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      entry.style.opacity = '1';
      entry.style.transform = 'translateY(0)';
    });

    LC.saveState();
  },

  // ─────────────────────────────────────────────
  //  TOAST
  // ─────────────────────────────────────────────
  showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  },

  // ─────────────────────────────────────────────
  //  HALF TIME / FULL TIME BUTTONS
  // ─────────────────────────────────────────────
  showHalfTimeButton() {
    document.getElementById('btnHT')?.classList.remove('hidden');
    document.getElementById('btnFT')?.classList.add('hidden');
    document.getElementById('btn2ndHalf')?.classList.add('hidden');
  },

  showSecondHalfButton() {
    document.getElementById('btnHT')?.classList.add('hidden');
    document.getElementById('btn2ndHalf')?.classList.remove('hidden');
    document.getElementById('btnFT')?.classList.add('hidden');
  },

  showFullTimeButton() {
    document.getElementById('btn2ndHalf')?.classList.add('hidden');
    document.getElementById('btnHT')?.classList.add('hidden');
    document.getElementById('btnFT')?.classList.remove('hidden');
  },

  showSecondHalfStarted() {
    document.getElementById('btn2ndHalf')?.classList.add('hidden');
    document.getElementById('btnFT')?.classList.remove('hidden');
    document.getElementById('halfIndicator') && (document.getElementById('halfIndicator').textContent = '2ND');
  },

  disableEventButtons() {
    document.querySelectorAll('.qp-btn:not(.time-btn)').forEach(b => b.disabled = true);
  },

  enableEventButtons() {
    document.querySelectorAll('.qp-btn:not(.time-btn)').forEach(b => b.disabled = false);
  },

  // ─────────────────────────────────────────────
  //  POPUP SYSTEM
  // ─────────────────────────────────────────────
  _popupCancelCallback: null,

  showPopup(config) {
    // config: { title, subtitle, items, onCancel }
    // Each item: { label, sub, value, icon, extra, onClick }
    this._popupCancelCallback = config.onCancel || null;

    const overlay = document.getElementById('popupOverlay');
    const titleEl = document.getElementById('popupTitle');
    const subEl   = document.getElementById('popupSubtitle');
    const bodyEl  = document.getElementById('popupBody');

    titleEl.textContent = config.title || '';
    subEl.textContent   = config.subtitle || '';
    bodyEl.innerHTML    = '';

    (config.items || []).forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'popup-item' + (item.special ? ' popup-item-special' : '') + (item.danger ? ' popup-item-danger' : '');

      btn.innerHTML = `
        <span class="pi-icon">${item.icon || ''}</span>
        <span class="pi-text">
          <span class="pi-label">${item.label}</span>
          ${item.sub ? `<span class="pi-sub">${item.sub}</span>` : ''}
        </span>
        <span class="pi-extra">${item.extra || ''}</span>
      `;

      btn.addEventListener('click', () => {
        if (item.onClick) item.onClick(item.value);
      });
      bodyEl.appendChild(btn);
    });

    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    bodyEl.scrollTop = 0;
  },

  hidePopup() {
    const overlay = document.getElementById('popupOverlay');
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    this._popupCancelCallback = null;
  },

  cancelPopup() {
    const cb = this._popupCancelCallback;
    this.hidePopup();
    if (cb) cb();
  },

  // ─────────────────────────────────────────────
  //  TEAM POPUP
  // ─────────────────────────────────────────────
  showTeamPopup(callback, cancelCb) {
    this.showPopup({
      title: 'SELECT TEAM',
      subtitle: 'Which team does this event belong to?',
      onCancel: cancelCb,
      items: [
        {
          icon: '🏠',
          label: LC.state.home.name,
          sub: 'Home Team',
          extra: `${LC.state.home.score}`,
          onClick: () => { this.hidePopup(); callback('home'); }
        },
        {
          icon: '✈️',
          label: LC.state.away.name,
          sub: 'Away Team',
          extra: `${LC.state.away.score}`,
          onClick: () => { this.hidePopup(); callback('away'); }
        },
      ]
    });
  },

  // ─────────────────────────────────────────────
  //  PLAYER POPUP
  // ─────────────────────────────────────────────
  showPlayerPopup(title, players, callback, options = {}) {
    const items = players.map(p => ({
      icon: p.isGK ? '🧤' : (p.isCaptain ? '©️' : '👤'),
      label: p.name || '(unnamed)',
      sub: [p.number ? `#${p.number}` : '', p.position || ''].filter(Boolean).join(' · '),
      extra: (p.yellowCount >= 1 ? '🟨' : ''),
      value: p,
      onClick: (val) => { this.hidePopup(); callback(val); }
    }));

    if (options.extraItems) {
      options.extraItems.forEach(ei => {
        items.push({
          icon: ei.icon || '',
          label: ei.label,
          sub: ei.sub || '',
          extra: '',
          special: ei.special,
          value: ei.value,
          onClick: (val) => { this.hidePopup(); callback(val); }
        });
      });
    }

    if (options.noAssistOption) {
      items.push({
        icon: '—',
        label: 'No Assist',
        sub: 'Unassisted goal',
        extra: '',
        special: true,
        value: null,
        onClick: (val) => { this.hidePopup(); callback(val); }
      });
    }

    this.showPopup({
      title,
      subtitle: options.subtitle || '',
      onCancel: options.onCancel,
      items
    });
  },

  // ─────────────────────────────────────────────
  //  CONFIRM POPUP
  // ─────────────────────────────────────────────
  showConfirmPopup(title, message, onYes, onNo) {
    this.showPopup({
      title,
      subtitle: message,
      onCancel: onNo,
      items: [
        {
          icon: '✅',
          label: 'Yes — Proceed',
          special: false,
          onClick: () => { this.hidePopup(); onYes(); }
        },
        {
          icon: '✕',
          label: 'No — Cancel',
          special: true,
          onClick: () => { this.hidePopup(); if (onNo) onNo(); }
        },
      ]
    });
  },

  // ─────────────────────────────────────────────
  //  ADD NEW PLAYER POPUP (on-the-fly)
  // ─────────────────────────────────────────────
  showAddPlayerPopup(callback, onCancel) {
    const overlay = document.getElementById('popupOverlay');
    const titleEl = document.getElementById('popupTitle');
    const subEl   = document.getElementById('popupSubtitle');
    const bodyEl  = document.getElementById('popupBody');

    titleEl.textContent = 'ADD NEW PLAYER';
    subEl.textContent   = 'Register a player on the fly';
    this._popupCancelCallback = onCancel;

    bodyEl.innerHTML = `
      <div class="add-player-form">
        <div class="apf-field">
          <label>Jersey Number</label>
          <input type="number" id="apfNum" placeholder="e.g. 23" min="1" max="99">
        </div>
        <div class="apf-field">
          <label>Player Name</label>
          <input type="text" id="apfName" placeholder="Full name" maxlength="40">
        </div>
        <div class="apf-field">
          <label>Position (optional)</label>
          <input type="text" id="apfPos" placeholder="e.g. ST" maxlength="4">
        </div>
        <button class="apf-submit" onclick="LC.ui._submitAddPlayer()">
          ADD PLAYER →
        </button>
      </div>
    `;

    this._addPlayerCallback = callback;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    document.getElementById('apfName')?.focus();
  },

  _submitAddPlayer() {
    const num  = document.getElementById('apfNum')?.value.trim() || '';
    const name = document.getElementById('apfName')?.value.trim() || '';
    const pos  = document.getElementById('apfPos')?.value.trim()  || '';

    if (!name) { LC.ui.showToast('Player name is required', 'error'); return; }

    this.hidePopup();
    if (this._addPlayerCallback) {
      this._addPlayerCallback({ id: `fly_${Date.now()}`, name, number: num, position: pos });
    }
  },
};
