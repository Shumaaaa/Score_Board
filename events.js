// ============================================================
//  EVENTS.JS — The Event Popup Chain
//  Live Correspondent v2.0
// ============================================================
'use strict';
window.LC = window.LC || {};

LC.events = {

  // ─────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────
  _commit(event) {
    LC.ui.appendEvent(event);
    LC.saveState();
  },

  _cancel() {
    LC.ui.hidePopup();
  },

  _opponent(team) {
    return team === 'home' ? 'away' : 'home';
  },

  _desc(parts) {
    return parts.filter(Boolean).join(' · ');
  },

  // ─────────────────────────────────────────────
  //  CAPTAIN TRANSFER CHAIN
  // _checkCaptain fires AFTER the event, if needed
  // ─────────────────────────────────────────────
  _checkCaptainTransfer(team, dismissedId, afterCallback) {
    if (!LC.roster.isCaptain(team, dismissedId)) {
      afterCallback();
      return;
    }

    // Captain was dismissed — find new captain from remaining active players
    const remaining = LC.roster.getActive(team).filter(p => p.id !== dismissedId);
    if (remaining.length === 0) { afterCallback(); return; }

    LC.ui.showPlayerPopup(
      'SELECT NEW CAPTAIN',
      remaining,
      (newCap) => {
        LC.roster.transferCaptain(team, newCap.id);
        const capEvent = {
          type: 'CAP_TRANSFER',
          timestamp: LC.clock.getTimestamp(),
          team,
          icon: '©️',
          player: newCap,
          description: `${LC.state[team].name} · New Captain: ${newCap.name}`,
        };
        LC._captainTransferEvent = capEvent; // attach to parent event
        afterCallback();
      },
      {
        subtitle: 'Captain was dismissed. Select new captain.',
        onCancel: () => afterCallback(),
      }
    );
  },

  // ─────────────────────────────────────────────
  //  ⚽  GOAL
  // ─────────────────────────────────────────────
  goal() {
    LC.ui.showTeamPopup((team) => {
      const players = LC.roster.getActive(team);
      LC.ui.showPlayerPopup(
        'SELECT SCORER', players,
        (scorer) => {
          const others = LC.roster.getActive(team).filter(p => p.id !== scorer.id);
          LC.ui.showPlayerPopup(
            'SELECT ASSIST', others,
            (assist) => {
              const ts = LC.clock.getTimestamp();
              LC.state[team].score++;
              LC.ui.updateScore();
              const ev = {
                type: 'GOAL',
                timestamp: ts,
                team,
                icon: '⚽',
                player: scorer,
                assist: assist,
                description: this._desc([
                  LC.state[team].name,
                  `Goal: ${scorer.name}`,
                  assist ? `Assist: ${assist.name}` : null,
                ]),
              };
              this._commit(ev);
              LC.ui.showToast(`⚽ GOAL! ${scorer.name}`);
            },
            {
              subtitle: `Scorer: ${scorer.name}`,
              noAssistOption: true,
              onCancel: () => this._cancel(),
            }
          );
        },
        { subtitle: `${LC.state[team].name}`, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  🔵  OWN GOAL
  // ─────────────────────────────────────────────
  og() {
    LC.ui.showTeamPopup((concedingTeam) => {
      const scoringTeam = this._opponent(concedingTeam);
      const concedingPlayers = LC.roster.getActive(concedingTeam);

      // Show conceding team roster + OG button at bottom
      LC.ui.showPlayerPopup(
        'SELECT OWN GOAL SCORER',
        concedingPlayers,
        (selected) => {
          let ogScorer = selected;

          const proceed = () => {
            // Now open the scoring team's roster to credit a player
            const scoringPlayers = LC.roster.getActive(scoringTeam);
            LC.ui.showPlayerPopup(
              'CREDIT TO (SCORING TEAM)',
              scoringPlayers,
              (credited) => {
                const ts = LC.clock.getTimestamp();
                LC.state[scoringTeam].score++;
                LC.ui.updateScore();
                const ev = {
                  type: 'OG',
                  timestamp: ts,
                  team: concedingTeam,
                  icon: '🔵',
                  player: ogScorer,
                  creditedPlayer: credited,
                  description: this._desc([
                    `OG by ${ogScorer ? ogScorer.name : 'Unknown'} (${LC.state[concedingTeam].name})`,
                    `Credited: ${credited.name} (${LC.state[scoringTeam].name})`,
                  ]),
                };
                this._commit(ev);
                LC.ui.showToast(`🔵 Own Goal — ${LC.state[scoringTeam].name} score`);
              },
              { subtitle: `Credit the goal to (${LC.state[scoringTeam].name})`, onCancel: () => this._cancel() }
            );
          };

          if (selected && selected._isOGGeneric) {
            ogScorer = null;
          }
          proceed();
        },
        {
          subtitle: `${LC.state[concedingTeam].name} — select player or tap Own Goal`,
          extraItems: [{
            icon: '🔵',
            label: 'OWN GOAL',
            sub: 'Player unknown / unattributed',
            special: true,
            value: { _isOGGeneric: true },
          }],
          onCancel: () => this._cancel(),
        }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  🟨  YELLOW CARD
  // ─────────────────────────────────────────────
  yc() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'YELLOW CARD', LC.roster.getActive(team),
        (player) => {
          if (LC.roster.hasYellow(team, player.id)) {
            // SECOND YELLOW → triggers red
            LC.ui.showConfirmPopup(
              '⚠️ SECOND YELLOW',
              `${player.name} already has a yellow card. This will result in a Red Card.`,
              () => this._secondYellow(team, player),
              () => this._cancel()
            );
          } else {
            // First yellow
            LC.roster.addYellow(team, player.id);
            const ts = LC.clock.getTimestamp();
            const ev = {
              type: 'YC',
              timestamp: ts,
              team,
              icon: '🟨',
              player,
              description: this._desc([LC.state[team].name, `Yellow Card: ${player.name}`]),
            };
            this._commit(ev);
            LC.ui.showToast(`🟨 Yellow Card — ${player.name}`);
          }
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  SECOND YELLOW → RED (internal)
  // ─────────────────────────────────────────────
  _secondYellow(team, player) {
    const ts = LC.clock.getTimestamp();

    // Log Second Yellow
    LC.roster.addYellow(team, player.id);
    const ycEv = {
      type: 'YC2',
      timestamp: ts,
      team,
      icon: '🟨',
      player,
      description: this._desc([LC.state[team].name, `2nd Yellow: ${player.name}`]),
    };
    this._commit(ycEv);

    // Log Red Card
    const rcEv = {
      type: 'RC',
      timestamp: ts,
      team,
      icon: '🟥',
      player,
      description: this._desc([LC.state[team].name, `Red Card (2Y): ${player.name}`]),
    };
    this._commit(rcEv);

    // Remove from pitch
    LC.roster.remove(team, player.id);
    LC.ui.showToast(`🟥 Red Card — ${player.name} dismissed`);

    // Captain transfer check
    LC._captainTransferEvent = null;
    this._checkCaptainTransfer(team, player.id, () => {
      if (LC._captainTransferEvent) {
        this._commit(LC._captainTransferEvent);
      }
    });
  },

  // ─────────────────────────────────────────────
  //  🟥  DIRECT RED CARD
  // ─────────────────────────────────────────────
  rc() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'DIRECT RED CARD', LC.roster.getActive(team),
        (player) => {
          const ts = LC.clock.getTimestamp();
          const ev = {
            type: 'RC',
            timestamp: ts,
            team,
            icon: '🟥',
            player,
            description: this._desc([LC.state[team].name, `Red Card: ${player.name}`]),
          };
          this._commit(ev);
          LC.roster.remove(team, player.id);
          LC.ui.showToast(`🟥 Red Card — ${player.name} dismissed`);

          LC._captainTransferEvent = null;
          this._checkCaptainTransfer(team, player.id, () => {
            if (LC._captainTransferEvent) this._commit(LC._captainTransferEvent);
          });
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  ✅  PENALTY SCORED
  // ─────────────────────────────────────────────
  ps() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'PENALTY SCORED — SELECT TAKER', LC.roster.getActive(team),
        (player) => {
          const ts = LC.clock.getTimestamp();
          LC.state[team].score++;
          LC.ui.updateScore();
          const ev = {
            type: 'PS',
            timestamp: ts,
            team,
            icon: '✅',
            player,
            description: this._desc([LC.state[team].name, `Penalty Scored: ${player.name}`]),
          };
          this._commit(ev);
          LC.ui.showToast(`✅ Penalty Scored — ${player.name}`);
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  ❌  PENALTY MISSED
  // ─────────────────────────────────────────────
  pm() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'PENALTY MISSED — SELECT TAKER', LC.roster.getActive(team),
        (player) => {
          const ts = LC.clock.getTimestamp();
          const ev = {
            type: 'PM',
            timestamp: ts,
            team,
            icon: '❌',
            player,
            description: this._desc([LC.state[team].name, `Penalty Missed: ${player.name}`]),
          };
          this._commit(ev);
          LC.ui.showToast(`❌ Penalty Missed — ${player.name}`);
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  // ─────────────────────────────────────────────
  //  🔄  SUBSTITUTION
  // ─────────────────────────────────────────────
  sub() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'SUBSTITUTION — PLAYER OFF', LC.roster.getActive(team),
        (playerOff) => {
          const bench = LC.roster.getBench(team);
          const benchItems = bench.map(p => ({
            icon: '↑',
            label: p.name || '(unnamed)',
            sub: [p.number ? `#${p.number}` : '', p.position || ''].filter(Boolean).join(' · '),
            value: p,
            onClick: (val) => { LC.ui.hidePopup(); this._completeSub(team, playerOff, val); }
          }));

          benchItems.push({
            icon: '➕',
            label: 'Add New Player',
            sub: 'Not pre-registered — add on the fly',
            special: true,
            value: '__new__',
            onClick: () => {
              LC.ui.hidePopup();
              LC.ui.showAddPlayerPopup(
                (newPlayer) => this._completeSub(team, playerOff, newPlayer),
                () => this._cancel()
              );
            }
          });

          LC.ui.showPopup({
            title: 'PLAYER COMING ON',
            subtitle: `${LC.state[team].name} · Off: ${playerOff.name}`,
            onCancel: () => this._cancel(),
            items: benchItems,
          });
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  _completeSub(team, playerOff, playerOn) {
    const ts = LC.clock.getTimestamp();
    LC.roster.substitute(team, playerOff.id, playerOn);
    const ev = {
      type: 'SUB',
      timestamp: ts,
      team,
      icon: '🔄',
      player: playerOff,
      playerOn,
      description: this._desc([
        LC.state[team].name,
        `Off: ${playerOff.name}`,
        `On: ${playerOn.name}`,
      ]),
    };
    this._commit(ev);
    LC.ui.showToast(`🔄 Sub — ${playerOff.name} off · ${playerOn.name} on`);
  },

  // ─────────────────────────────────────────────
  //  🩹  INJURY
  // ─────────────────────────────────────────────
  inj() {
    LC.ui.showTeamPopup((team) => {
      LC.ui.showPlayerPopup(
        'INJURY — SELECT PLAYER', LC.roster.getActive(team),
        (player) => {
          LC.ui.showConfirmPopup(
            '🩹 INJURY',
            `${player.name} is injured. Bring on a replacement?`,
            () => {
              // YES — bring on replacement
              const bench = LC.roster.getBench(team);
              const benchItems = bench.map(p => ({
                icon: '↑',
                label: p.name || '(unnamed)',
                sub: [p.number ? `#${p.number}` : '', p.position || ''].filter(Boolean).join(' · '),
                value: p,
                onClick: (val) => { LC.ui.hidePopup(); this._completeInj(team, player, val); }
              }));

              benchItems.push({
                icon: '➕',
                label: 'Add New Player',
                sub: 'Not pre-registered',
                special: true,
                value: '__new__',
                onClick: () => {
                  LC.ui.hidePopup();
                  LC.ui.showAddPlayerPopup(
                    (newP) => this._completeInj(team, player, newP),
                    () => this._cancel()
                  );
                }
              });

              LC.ui.showPopup({
                title: 'REPLACEMENT PLAYER',
                subtitle: `${LC.state[team].name} · Replacing: ${player.name}`,
                onCancel: () => this._cancel(),
                items: benchItems,
              });
            },
            () => {
              // NO — no replacement
              this._completeInj(team, player, null);
            }
          );
        },
        { subtitle: LC.state[team].name, onCancel: () => this._cancel() }
      );
    }, () => this._cancel());
  },

  _completeInj(team, player, replacement) {
    const ts = LC.clock.getTimestamp();
    LC.roster.remove(team, player.id);

    const descParts = [LC.state[team].name, `Injured Off: ${player.name}`];
    if (replacement) {
      LC.roster.substitute(team, player.id, replacement);
      descParts.push(`Replaced by: ${replacement.name}`);
    } else {
      descParts.push('No replacement');
    }

    const ev = {
      type: 'INJ',
      timestamp: ts,
      team,
      icon: '🩹',
      player,
      playerOn: replacement,
      description: this._desc(descParts),
    };
    this._commit(ev);
    LC.ui.showToast(`🩹 Injury — ${player.name} off`);
  },

  // ─────────────────────────────────────────────
  //  🏁  HALF TIME
  // ─────────────────────────────────────────────
  ht() {
    if (LC.clock.isStopped()) return;
    const ts = LC.clock.getTimestamp();
    LC.clock.pause();
    LC.ui.disableEventButtons();
    LC.ui.showSecondHalfButton();

    const ev = {
      type: 'HT',
      timestamp: ts,
      team: 'neutral',
      icon: '🏁',
      description: `HALF TIME — ${LC.state.home.name} ${LC.state.home.score} · ${LC.state.away.score} ${LC.state.away.name}`,
    };
    this._commit(ev);
    LC.ui.showToast('🏁 Half Time');
    document.getElementById('halfIndicator') && (document.getElementById('halfIndicator').textContent = 'HT');
  },

  // ─────────────────────────────────────────────
  //  2nd HALF KICK OFF
  // ─────────────────────────────────────────────
  secondHalf() {
    LC.clock.resumeSecondHalf();
    LC.ui.enableEventButtons();
    LC.ui.showFullTimeButton();

    const ts = LC.clock.getTimestamp();
    const ev = {
      type: 'SH',
      timestamp: ts,
      team: 'neutral',
      icon: '🏁',
      description: 'SECOND HALF — Kick Off',
    };
    this._commit(ev);
    LC.ui.showToast('▶️ Second Half Underway');
    document.getElementById('halfIndicator') && (document.getElementById('halfIndicator').textContent = '2ND');
  },

  // ─────────────────────────────────────────────
  //  🏆  FULL TIME
  // ─────────────────────────────────────────────
  ft() {
    if (LC.clock.isStopped()) return;
    const ts = LC.clock.getTimestamp();
    LC.clock.stop();
    LC.ui.disableEventButtons();

    const ev = {
      type: 'FT',
      timestamp: ts,
      team: 'neutral',
      icon: '🏆',
      description: `FULL TIME — ${LC.state.home.name} ${LC.state.home.score} – ${LC.state.away.score} ${LC.state.away.name}`,
    };
    this._commit(ev);
    LC.ui.showToast('🏆 Full Time!', 'success');
    LC.finaliseMatch();

    document.getElementById('halfIndicator') && (document.getElementById('halfIndicator').textContent = 'FT');

    // Navigate to report after brief delay
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '0';
      setTimeout(() => window.location.href = 'report.html', 400);
    }, 1500);
  },
};
