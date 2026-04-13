// ============================================================
//  REPORT.JS — Report Builder
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.report = {

  _state: null,

  init() {
    const idx = localStorage.getItem('lcLastMatchIndex');
    const matches = JSON.parse(localStorage.getItem('liveCorrespondentMatches')) || [];
    if (idx !== null && matches[idx]) {
      this._state = matches[idx];
    } else {
      const raw = localStorage.getItem('lcMatchState');
      this._state = raw ? JSON.parse(raw) : null;
    }
    if (!this._state) {
      document.getElementById('reportContainer').innerHTML =
        '<p style="color:#ff4d6d;text-align:center;padding:40px;">No match data found.</p>';
      return;
    }
    this.render();
  },

  render() {
    const s = this._state;
    document.getElementById('reportContainer').innerHTML =
      this._buildHTML(s, s.meta || {}, s.home, s.away, s.events || []);
  },

  _buildHTML(s, meta, home, away, events) {
    return `
      ${this._sectionHeader()}
      ${this._sectionMatchInfo(meta)}
      ${this._sectionScoreline(home, away)}
      ${this._sectionOfficials(meta)}
      ${this._sectionLineups(home, away)}
      ${this._sectionTimeline(home, away, events)}
      ${this._sectionSummary(home, away, events)}
      ${this._sectionFooter()}
    `;
  },

  _sectionHeader() {
    return `
      <div class="rpt-header">
        <div class="rpt-app-name">LIVE CORRESPONDENT</div>
        <div class="rpt-doc-title">OFFICIAL MATCH REPORT</div>
        <div class="rpt-rule"></div>
      </div>`;
  },

  _sectionMatchInfo(meta) {
    const lines = [];
    if (meta.competition) lines.push(`<div class="rpt-info-competition">${meta.competition}</div>`);
    if (meta.round)       lines.push(`<div class="rpt-info-round">${meta.round}</div>`);
    if (meta.date)        lines.push(`<div class="rpt-info-line">${this._fmtDate(meta.date)}</div>`);
    if (meta.venue)       lines.push(`<div class="rpt-info-line">📍 ${meta.venue}${meta.attendance ? ' &nbsp;·&nbsp; ' + Number(meta.attendance).toLocaleString() + ' Attendance' : ''}</div>`);
    else if (meta.attendance) lines.push(`<div class="rpt-info-line">${Number(meta.attendance).toLocaleString()} Attendance</div>`);
    return lines.length ? `<div class="rpt-match-info">${lines.join('')}</div>` : '';
  },

  _sectionScoreline(home, away) {
    return `
      <div class="rpt-scoreline-block">
        <div class="rpt-score-rule"></div>
        <div class="rpt-scoreline">
          <span class="rpt-score-team rpt-home-team">${home.name}</span>
          <span class="rpt-score-nums">
            <span class="rpt-score-digit">${home.score}</span>
            <span class="rpt-score-dash">—</span>
            <span class="rpt-score-digit">${away.score}</span>
          </span>
          <span class="rpt-score-team rpt-away-team">${away.name}</span>
        </div>
        <div class="rpt-score-rule"></div>
      </div>`;
  },

  _sectionOfficials(meta) {
    if (!meta.referee && !meta.assistant1 && !meta.assistant2) return '';
    const lines = [];
    if (meta.referee)    lines.push(`<div class="rpt-official-line"><span class="rpt-off-label">Referee</span><span class="rpt-off-val">${meta.referee}</span></div>`);
    if (meta.assistant1) lines.push(`<div class="rpt-official-line"><span class="rpt-off-label">Assistant 1</span><span class="rpt-off-val">${meta.assistant1}</span></div>`);
    if (meta.assistant2) lines.push(`<div class="rpt-official-line"><span class="rpt-off-label">Assistant 2</span><span class="rpt-off-val">${meta.assistant2}</span></div>`);
    return `<div class="rpt-officials"><div class="rpt-section-title">MATCH OFFICIALS</div>${lines.join('')}</div>`;
  },

  _sectionLineups(home, away) {
    const playerRow = (p) => `
      <div class="rpt-player-row">
        <span class="rpt-p-num">${p.number || '—'}</span>
        <span class="rpt-p-name">${p.name || '(unnamed)'}${p.isCaptain ? ' <span class="rpt-badge-c">C</span>' : ''}${p.isGK ? ' <span class="rpt-badge-gk">GK</span>' : ''}</span>
        <span class="rpt-p-pos">${p.position || ''}</span>
      </div>`;

    const hStarters = (home.starters || []).map(playerRow).join('');
    const aStarters = (away.starters || []).map(playerRow).join('');
    const hBench    = (home.bench    || []).filter(p => p.name).map(playerRow).join('');
    const aBench    = (away.bench    || []).filter(p => p.name).map(playerRow).join('');

    return `
      <div class="rpt-lineups">
        <div class="rpt-section-title">STARTING LINEUPS</div>
        <div class="rpt-team-block"><div class="rpt-team-title rpt-home-col">${home.name}</div>${hStarters}</div>
        <div class="rpt-divider-thin"></div>
        <div class="rpt-team-block"><div class="rpt-team-title rpt-away-col">${away.name}</div>${aStarters}</div>
      </div>
      ${(hBench || aBench) ? `
      <div class="rpt-lineups">
        <div class="rpt-section-title">SUBSTITUTES</div>
        ${hBench ? `<div class="rpt-team-block"><div class="rpt-team-title rpt-home-col">${home.name}</div>${hBench}</div>` : ''}
        ${hBench && aBench ? '<div class="rpt-divider-thin"></div>' : ''}
        ${aBench ? `<div class="rpt-team-block"><div class="rpt-team-title rpt-away-col">${away.name}</div>${aBench}</div>` : ''}
      </div>` : ''}`;
  },

  _sectionTimeline(home, away, events) {
    const rows = events.map(ev => {
      if (ev.team === 'neutral' || !ev.team) {
        return `
          <div class="rpt-tl-row">
            <div class="rpt-tl-neutral">
              <span class="rpt-tl-icon">${ev.icon || ''}</span>
              <span class="rpt-tl-neutral-text">${ev.description || ''}</span>
            </div>
          </div>`;
      }
      const isHome = ev.team === 'home';
      const cell = this._buildEventCell(ev);
      return `
        <div class="rpt-tl-row">
          <div class="rpt-tl-home">${isHome ? cell : ''}</div>
          <div class="rpt-tl-spine"></div>
          <div class="rpt-tl-away">${!isHome ? cell : ''}</div>
        </div>`;
    }).join('');

    return `
      <div class="rpt-timeline">
        <div class="rpt-section-title">FULL MATCH TIMELINE</div>
        <div class="rpt-tl-headers">
          <div class="rpt-tl-home-hdr">${home.name}</div>
          <div class="rpt-tl-spine-hdr"></div>
          <div class="rpt-tl-away-hdr">${away.name}</div>
        </div>
        <div class="rpt-tl-divider"></div>
        ${rows}
      </div>`;
  },

  _buildEventCell(ev) {
    const lines = [];
    lines.push(`<div class="rpt-ev-top"><span class="rpt-ev-icon">${ev.icon||''}</span><span class="rpt-ev-time">${ev.timestamp||''}</span><span class="rpt-ev-type">${this._typeLabel(ev.type)}</span></div>`);
    if (ev.player?.name)         lines.push(`<div class="rpt-ev-player">${ev.player.name}</div>`);
    if (ev.assist?.name)         lines.push(`<div class="rpt-ev-detail">Assist: ${ev.assist.name}</div>`);
    if (ev.playerOn?.name)       lines.push(`<div class="rpt-ev-detail">On: ${ev.playerOn.name}</div>`);
    if (ev.creditedPlayer?.name) lines.push(`<div class="rpt-ev-detail">Credited: ${ev.creditedPlayer.name}</div>`);
    return `<div class="rpt-ev-cell">${lines.join('')}</div>`;
  },

  _typeLabel(type) {
    const map = { GOAL:'GOAL', OG:'OWN GOAL', YC:'YELLOW', YC2:'2ND YELLOW',
      RC:'RED CARD', PS:'PEN SCORED', PM:'PEN MISSED', SUB:'SUBSTITUTION',
      INJ:'INJURY', CAP_TRANSFER:'NEW CAPTAIN', KO:'KICK OFF', HT:'HALF TIME',
      SH:'2ND HALF', FT:'FULL TIME' };
    return map[type] || type;
  },

  _sectionSummary(home, away, events) {
    const calc = (team) => {
      const evs = events.filter(e => e.team === team);
      return {
        goals:   evs.filter(e => ['GOAL','PS'].includes(e.type)).length,
        og:      evs.filter(e => e.type === 'OG').length,
        assists: evs.filter(e => e.assist).length,
        yellow:  evs.filter(e => e.type === 'YC').length,
        red:     evs.filter(e => e.type === 'RC').length,
        ps:      evs.filter(e => e.type === 'PS').length,
        pm:      evs.filter(e => e.type === 'PM').length,
        sub:     evs.filter(e => e.type === 'SUB').length,
      };
    };
    const hS = calc('home'), aS = calc('away');
    const block = (name, st, cls) => `
      <div class="rpt-team-block">
        <div class="rpt-team-title ${cls}">${name}</div>
        <div class="rpt-summary-grid">
          ${this._sumRow('Goals',           st.goals + st.og)}
          ${this._sumRow('Assists',          st.assists)}
          ${this._sumRow('Yellow Cards',     st.yellow)}
          ${this._sumRow('Red Cards',        st.red)}
          ${this._sumRow('Penalties Scored', st.ps)}
          ${this._sumRow('Penalties Missed', st.pm)}
          ${this._sumRow('Substitutions',    st.sub)}
        </div>
      </div>`;
    return `
      <div class="rpt-summary">
        <div class="rpt-section-title">MATCH SUMMARY</div>
        ${block(home.name, hS, 'rpt-home-col')}
        <div class="rpt-divider-thin"></div>
        ${block(away.name, aS, 'rpt-away-col')}
      </div>`;
  },

  _sumRow(label, val) {
    return `<div class="rpt-sum-row"><span class="rpt-sum-label">${label}</span><span class="rpt-sum-val">${val}</span></div>`;
  },

  _sectionFooter() {
    const now = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    return `
      <div class="rpt-footer">
        <div class="rpt-footer-rule"></div>
        <div class="rpt-footer-text">Generated by Live Correspondent v2.0</div>
        <div class="rpt-footer-date">${now}</div>
        <div class="rpt-footer-copy">Live Correspondent © 2026</div>
      </div>`;
  },

  _fmtDate(str) {
    try { return new Date(str).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
    catch { return str; }
  },

  print() { window.print(); },

  share() {
    const s = this._state;
    if (!s) return;
    const text = `${s.home.name} ${s.home.score} – ${s.away.score} ${s.away.name}\n${s.meta?.competition||''} ${s.meta?.date||''}\nGenerated by Live Correspondent v2.0`;
    if (navigator.share) { navigator.share({ title: 'Match Report', text }); }
    else { navigator.clipboard?.writeText(text); alert('Match summary copied!'); }
  },
};
