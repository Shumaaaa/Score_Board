// ============================================================
//  CLOCK.JS — All Timing Logic
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.clock = {
  _interval:          null,
  _elapsed:           0,      // total seconds ticking since match start
  _halfTimeElapsed:   0,      // elapsed at moment HT was pressed
  _secondHalfStart:   0,      // elapsed when 2nd half resumed
  _half:              1,
  _running:           false,
  _lastTick:          null,
  _stopped:           false,

  // ── INIT ──
  init() {
    const cs = LC.state.clockState;
    this._elapsed          = cs.elapsed          || 0;
    this._half             = cs.half             || 1;
    this._halfTimeElapsed  = cs.halfTimeElapsed  || 0;
    this._secondHalfStart  = cs.secondHalfStart  || 0;
    this._stopped          = cs.stopped          || false;
    LC.ui.updateClock(this.getDisplay());
  },

  // ── START (first whistle) ──
  start() {
    if (this._running || this._stopped) return;
    this._running  = true;
    this._lastTick = Date.now();
    this._interval = setInterval(() => this._tick(), 500);
    LC.ui.setClockRunning(true);
    LC.state.clockState.running = true;
    LC.saveState();
  },

  // ── INTERNAL TICK ──
  _tick() {
    if (!this._running) return;
    const now   = Date.now();
    const delta = Math.floor((now - this._lastTick) / 1000);
    if (delta > 0) {
      this._elapsed += delta;
      this._lastTick = now;
      LC.ui.updateClock(this.getDisplay());
      LC.state.clockState.elapsed = this._elapsed;
    }
  },

  // ── PAUSE (HT whistle) ──
  pause() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._interval);
    this._interval          = null;
    this._halfTimeElapsed   = this._elapsed;
    LC.state.clockState.running          = false;
    LC.state.clockState.halfTimeElapsed  = this._halfTimeElapsed;
    LC.ui.setClockRunning(false);
    LC.saveState();
  },

  // ── RESUME SECOND HALF ──
  resumeSecondHalf() {
    if (this._running || this._stopped) return;
    this._half            = 2;
    this._secondHalfStart = this._elapsed;
    this._running         = true;
    this._lastTick        = Date.now();
    this._interval        = setInterval(() => this._tick(), 500);
    LC.state.clockState.half             = 2;
    LC.state.clockState.secondHalfStart  = this._secondHalfStart;
    LC.state.clockState.running          = true;
    LC.ui.setClockRunning(true);
    LC.saveState();
  },

  // ── STOP (FT whistle) ──
  stop() {
    this._running = false;
    this._stopped = true;
    clearInterval(this._interval);
    this._interval = null;
    LC.state.clockState.running = false;
    LC.state.clockState.stopped = true;
    LC.ui.setClockRunning(false);
    LC.ui.updateClock(this.getDisplay());
    LC.saveState();
  },

  // ── GET DISPLAY STRING ──
  getDisplay() {
    if (this._half === 1) {
      const threshold = 45 * 60;
      if (this._elapsed <= threshold) return this._fmt(this._elapsed);
      const x = Math.ceil((this._elapsed - threshold) / 60);
      return `45+${x}`;
    } else {
      const s2       = this._elapsed - this._secondHalfStart;
      const matchSec = 45 * 60 + s2;
      const threshold = 90 * 60;
      if (matchSec <= threshold) return this._fmt(matchSec);
      const x = Math.ceil((matchSec - threshold) / 60);
      return `90+${x}`;
    }
  },

  // ── GET TIMESTAMP FOR EVENT LOG ──
  getTimestamp() {
    return this.getDisplay();
  },

  // ── FORMAT SECONDS ──
  _fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  isRunning()  { return this._running; },
  getHalf()    { return this._half; },
  isStopped()  { return this._stopped; },
};
