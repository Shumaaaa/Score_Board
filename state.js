// ============================================================
//  STATE.JS — Single Source of Truth
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.initState = function () {
  const raw = localStorage.getItem('lcMatchState');
  if (!raw) {
    alert('No match data found. Returning to home.');
    window.location.href = 'home.html';
    return;
  }
  LC.state = JSON.parse(raw);
  // Ensure all required fields exist
  if (!LC.state.events)      LC.state.events = [];
  if (!LC.state.clockState)  LC.state.clockState = { running: false, elapsed: 0, half: 1 };
  if (!LC.state.home.score)  LC.state.home.score = 0;
  if (!LC.state.away.score)  LC.state.away.score = 0;
};

LC.saveState = function () {
  localStorage.setItem('lcMatchState', JSON.stringify(LC.state));
};

LC.finaliseMatch = function () {
  LC.state.finishedAt = new Date().toISOString();
  const matches = JSON.parse(localStorage.getItem('liveCorrespondentMatches')) || [];
  matches.push(JSON.parse(JSON.stringify(LC.state)));
  localStorage.setItem('liveCorrespondentMatches', JSON.stringify(matches));
  localStorage.setItem('lcLastMatchIndex', String(matches.length - 1));
  LC.saveState();
};

// Helper: get all players from a team (starters + bench)
LC.getAllPlayers = function (team) {
  return [...(LC.state[team].starters || []), ...(LC.state[team].bench || [])];
};

// Helper: find a player by id across both arrays
LC.findPlayer = function (team, id) {
  return LC.getAllPlayers(team).find(p => p.id === id);
};
