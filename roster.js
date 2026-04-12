// ============================================================
//  ROSTER.JS — Dynamic Roster Management
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.roster = {

  // ── GET ACTIVE PLAYERS (on the pitch) ──
  getActive(team) {
    return LC.getAllPlayers(team).filter(p => p.isActive);
  },

  // ── GET BENCH PLAYERS (available to come on) ──
  getBench(team) {
    return LC.getAllPlayers(team).filter(p => !p.isActive);
  },

  // ── GET PLAYER ──
  get(team, id) {
    return LC.getAllPlayers(team).find(p => p.id === id);
  },

  // ── REMOVE FROM PITCH (red card / injury) ──
  remove(team, id) {
    const p = this.get(team, id);
    if (!p) return;
    p.isActive = false;
    LC.ui.renderRosters();
    LC.saveState();
  },

  // ── ADD YELLOW CARD ──
  addYellow(team, id) {
    const p = this.get(team, id);
    if (!p) return;
    p.yellowCount = (p.yellowCount || 0) + 1;
    LC.ui.renderRosters();
    LC.saveState();
  },

  // ── CHECK IF PLAYER HAS YELLOW ──
  hasYellow(team, id) {
    const p = this.get(team, id);
    return p ? (p.yellowCount || 0) >= 1 : false;
  },

  // ── SUBSTITUTE: player off → player on ──
  substitute(team, offId, onPlayer) {
    // onPlayer is either an existing bench player object OR a new {name, number, position} object
    const off = this.get(team, offId);
    if (off) off.isActive = false;

    let onP = LC.getAllPlayers(team).find(p => p.id === onPlayer.id);
    if (onP) {
      onP.isActive = true;
    } else {
      // On-the-fly addition
      const newPlayer = {
        id: Date.now(),
        name: onPlayer.name,
        number: onPlayer.number,
        position: onPlayer.position || '',
        isGK: false,
        isCaptain: false,
        isActive: true,
        yellowCount: 0,
        addedMidMatch: true,
      };
      LC.state[team].bench.push(newPlayer);
    }
    LC.ui.renderRosters();
    LC.saveState();
  },

  // ── TRANSFER CAPTAIN ──
  transferCaptain(team, newId) {
    LC.getAllPlayers(team).forEach(p => { p.isCaptain = false; });
    const np = this.get(team, newId);
    if (np) np.isCaptain = true;
    LC.ui.renderRosters();
    LC.saveState();
  },

  // ── GET CAPTAIN ──
  getCaptain(team) {
    return LC.getAllPlayers(team).find(p => p.isCaptain && p.isActive);
  },

  // ── IS CAPTAIN ──
  isCaptain(team, id) {
    const p = this.get(team, id);
    return p ? p.isCaptain : false;
  },
};
