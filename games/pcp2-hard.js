(function (root, factory) {
  const families = factory();
  if (typeof module === 'object' && module.exports) module.exports = families;
  if (root) root.PCP2HardFamilies = families;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Each family eliminates two internal quotes along three structural identities.
  // The engine verifies that every displayed clue is necessary and rotates every
  // member into the unknown. Index changes and target rotations are not families.
  return [
    {
      "id": "hard-001",
      "name": "Covered butterfly and a stock anchor",
      "keys": [
        "ps:1:1",
        "conversion:1",
        "parity:1",
        "butterfly:1",
        "bw:3:1",
        "call:2:1",
        "stock",
        "strike:2"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → B/W curve reconstructs butterfly → B/W to stock"
    },
    {
      "id": "hard-002",
      "name": "Outside risky through wing calendars",
      "keys": [
        "stock",
        "strike:2",
        "rc:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "risky:1:3:2",
        "ct:1:1:2",
        "pt:3:1:2"
      ],
      "route": "Combo into stock and carry → Outside risky via middle combo → Risky transported through opposite option calendars"
    },
    {
      "id": "hard-003",
      "name": "Calendar straddle and P&S parity",
      "keys": [
        "call:1:1",
        "straddle:1:2",
        "ct:1:1:2",
        "pt:1:1:2",
        "ps:1:1",
        "stock",
        "strike:1"
      ],
      "route": "Straddle into call and put → Calendars transport straddle → P&S to stock"
    },
    {
      "id": "hard-004",
      "name": "Straddle split through a call butterfly",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "call:3:1",
        "bw:2:1",
        "stock",
        "strike:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo call split → Call wings reconstruct butterfly → B/W to stock"
    },
    {
      "id": "hard-005",
      "name": "Straddle split through a put butterfly",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "put:3:1",
        "ps:2:1",
        "stock",
        "strike:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo put split → Put wings reconstruct butterfly → P&S to stock"
    },
    {
      "id": "hard-006",
      "name": "Covered straddle through the P&S curve",
      "keys": [
        "bw:1:1",
        "straddle:1:1",
        "butterfly:1",
        "ps:3:1",
        "put:2:1",
        "stock",
        "strike:2"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → P&S curve reconstructs butterfly → P&S to stock"
    },
    {
      "id": "hard-007",
      "name": "Transported strangle and a covered call",
      "keys": [
        "bw:1:1",
        "stock",
        "strike:1",
        "risky:1:2:1",
        "strangle:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2"
      ],
      "route": "B/W to stock → Risky/strangle call split → Strangle transported through wing calendars"
    },
    {
      "id": "hard-008",
      "name": "Iron-fly transport locates a strike",
      "keys": [
        "butterfly:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "strike:2",
        "strike:3"
      ],
      "equalSpacing": true,
      "route": "Box subtracts butterfly to iron fly → Iron fly transported through wing calendars → Strike bounds of box"
    },
    {
      "id": "hard-009",
      "name": "Put-calendar risky and forward parity",
      "keys": [
        "risky:1:2:1",
        "pv:1:2:2",
        "pt:1:1:2",
        "pt:2:1:2",
        "stock",
        "strike:1",
        "reversal:1"
      ],
      "route": "High-strike combo to risky → Put vertical transported through put calendars → Combo into stock and carry"
    },
    {
      "id": "hard-010",
      "name": "Call-calendar risky and forward parity",
      "keys": [
        "risky:1:2:1",
        "cv:1:2:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "stock",
        "strike:2",
        "rc:1"
      ],
      "route": "Low-strike combo to risky → Call vertical transported through call calendars → Combo into stock and carry"
    },
    {
      "id": "hard-011",
      "name": "Covered vertical across a carry bridge",
      "keys": [
        "ps:1:1",
        "parity:1",
        "bw:2:1",
        "pv:1:2:1",
        "jelly:1:1:2",
        "rc:2"
      ],
      "route": "Carry versus parity in covered structures → B/W difference forms put vertical → Jelly reconstructs carry"
    },
    {
      "id": "hard-012",
      "name": "Swap transport and a B/W anchor",
      "keys": [
        "bw:1:2",
        "swap:1:2:1",
        "swap:1:2:2",
        "ct:2:1:2",
        "call:1:1",
        "stock",
        "strike:1"
      ],
      "route": "Call calendar transports B/W → Straddle swap transported through call calendars → B/W to stock"
    },
    {
      "id": "hard-013",
      "name": "Butterfly transport and a P&S anchor",
      "keys": [
        "ps:1:2",
        "butterfly:1",
        "butterfly:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "put:1:1",
        "stock",
        "strike:1"
      ],
      "equalSpacing": true,
      "route": "Put calendar transports P&S → Butterfly transported through three put calendars → P&S to stock"
    },
    {
      "id": "hard-014",
      "name": "Transported risky and a covered call",
      "keys": [
        "put:2:1",
        "risky:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2",
        "bw:1:1",
        "stock",
        "strike:1"
      ],
      "route": "Risky separates outside premiums → Risky transported through opposite option calendars → B/W to stock"
    },
    {
      "id": "hard-015",
      "name": "Transported strangle and protected stock",
      "keys": [
        "call:1:1",
        "strangle:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2",
        "ps:2:1",
        "stock",
        "strike:2"
      ],
      "route": "Strangle joins outside premiums → Strangle transported through wing calendars → P&S to stock"
    },
    {
      "id": "hard-016",
      "name": "Outside put split through butterfly parity",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:1",
        "butterfly:1",
        "put:1:1",
        "call:3:1",
        "stock",
        "strike:3",
        "conversion:1"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle put split → Put wings reconstruct butterfly → PCP premium reconstruction"
    },
    {
      "id": "hard-017",
      "name": "Middle risky and an outside covered call",
      "keys": [
        "call:2:1",
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "bw:1:1",
        "stock",
        "strike:1"
      ],
      "route": "Call vertical from premiums → Outside risky via middle combo → B/W to stock"
    },
    {
      "id": "hard-018",
      "name": "Covered cross-strike forward reconstruction",
      "keys": [
        "combo:1:1",
        "stock",
        "strike:1",
        "bw:2:1",
        "parity:2",
        "ps:1:1",
        "cv:1:2:1"
      ],
      "route": "Combo into stock and carry → Carry versus parity in covered structures → P&S difference forms call vertical"
    },
    {
      "id": "hard-019",
      "name": "Call-wing butterfly with mixed calendars",
      "keys": [
        "cv:1:2:1",
        "cv:2:3:1",
        "butterfly:2",
        "ct:2:1:2",
        "ct:3:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Call verticals form butterfly → Butterfly transported through three call calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-020",
      "name": "Straddle wing and a transported combo",
      "keys": [
        "strangle:1:2:1",
        "straddle:2:1",
        "risky:1:3:1",
        "pv:2:3:1",
        "combo:2:2",
        "jelly:2:1:2"
      ],
      "route": "Low-strike straddle to strangle → Outside risky via middle combo → Jelly transports combo"
    },
    {
      "id": "hard-021",
      "name": "Box conversion through mixed calendars",
      "keys": [
        "box:1:2",
        "pv:1:2:1",
        "cv:1:2:2",
        "ct:2:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "route": "Box converts call/put verticals → Call vertical transported through call calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-022",
      "name": "Swap conversion through mixed calendars",
      "keys": [
        "pv:1:2:1",
        "cv:1:2:1",
        "swap:1:2:2",
        "ct:2:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "route": "Straddle swap separates verticals → Straddle swap transported through call calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-023",
      "name": "Strangle wing through a carry bridge",
      "keys": [
        "strangle:1:2:1",
        "straddle:1:1",
        "pv:1:2:2",
        "pt:2:1:2",
        "ct:1:1:2",
        "jelly:1:1:2"
      ],
      "route": "High-strike straddle to strangle → Put vertical transported through put calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-024",
      "name": "Put-wing butterfly with mixed calendars",
      "keys": [
        "pv:1:2:1",
        "pv:2:3:1",
        "butterfly:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "ct:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Put verticals form butterfly → Butterfly transported through three put calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-025",
      "name": "Risky and combo across expirations",
      "keys": [
        "pv:1:2:1",
        "risky:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2",
        "combo:1:2",
        "jelly:1:1:2"
      ],
      "route": "High-strike combo to risky → Risky transported through opposite option calendars → Jelly transports combo"
    },
    {
      "id": "hard-026",
      "name": "Wing strangle into an iron-fly calendar",
      "keys": [
        "iron:1",
        "straddle:2:1",
        "strangle:1:3:2",
        "pt:3:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Wing strangle subtracts from middle straddle → Strangle transported through wing calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-027",
      "name": "Adjacent riskies across a carry bridge",
      "keys": [
        "iron:1",
        "risky:2:3:1",
        "risky:1:2:2",
        "pt:2:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Adjacent riskies form iron fly → Risky transported through opposite option calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-028",
      "name": "B/W butterfly through a put calendar",
      "keys": [
        "butterfly:1",
        "bw:2:1",
        "bw:3:1",
        "bw:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "B/W curve reconstructs butterfly → Call calendar transports B/W → Jelly converts call/put calendars"
    },
    {
      "id": "hard-029",
      "name": "P&S butterfly through a call calendar",
      "keys": [
        "butterfly:1",
        "ps:2:1",
        "ps:3:1",
        "ps:1:2",
        "ct:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "P&S curve reconstructs butterfly → Put calendar transports P&S → Jelly converts call/put calendars"
    },
    {
      "id": "hard-030",
      "name": "Strike width through a transported combo",
      "keys": [
        "box:1:2",
        "risky:1:3:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "combo:1:2",
        "jelly:1:1:2"
      ],
      "route": "Combos locate strike width → Outside risky via middle combo → Jelly transports combo"
    },
    {
      "id": "hard-031",
      "name": "Mixed-calendar iron-fly reconstruction",
      "keys": [
        "iron:1",
        "pv:2:3:1",
        "cv:1:2:2",
        "ct:2:1:2",
        "pt:1:1:2",
        "jelly:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Iron fly mixes adjacent verticals → Call vertical transported through call calendars → Jelly converts call/put calendars"
    },
    {
      "id": "hard-032",
      "name": "Call-premium calendar and fly carry",
      "keys": [
        "pt:1:1:2",
        "jelly:1:1:2",
        "butterfly:1",
        "butterfly:2",
        "ct:3:1:2",
        "call:2:1",
        "call:2:2"
      ],
      "equalSpacing": true,
      "route": "Jelly converts call/put calendars → Butterfly transported through three call calendars → Call calendar transports premium"
    },
    {
      "id": "hard-033",
      "name": "Carry bridge between covered structures",
      "keys": [
        "bw:1:1",
        "ps:1:1",
        "parity:1",
        "jelly:1:1:2",
        "bw:1:2",
        "put:1:2"
      ],
      "route": "Carry versus parity in covered structures → Jelly reconstructs carry → B/W and put through carry"
    },
    {
      "id": "hard-034",
      "name": "Put-premium calendar and fly carry",
      "keys": [
        "ct:1:1:2",
        "jelly:1:1:2",
        "butterfly:1",
        "butterfly:2",
        "pt:3:1:2",
        "put:2:1",
        "put:2:2"
      ],
      "equalSpacing": true,
      "route": "Jelly converts call/put calendars → Butterfly transported through three put calendars → Put calendar transports premium"
    },
    {
      "id": "hard-035",
      "name": "Straddle swap into iron-fly transport",
      "keys": [
        "strangle:1:3:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "swap:1:2:1",
        "straddle:1:1"
      ],
      "equalSpacing": true,
      "route": "Wing strangle subtracts from middle straddle → Iron fly transported through wing calendars → Straddle swap transports straddles"
    },
    {
      "id": "hard-036",
      "name": "Combo split across iron-fly transport",
      "keys": [
        "call:1:2",
        "iron:1",
        "iron:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "put:1:1",
        "combo:1:1"
      ],
      "equalSpacing": true,
      "route": "Call calendar transports premium → Iron fly transported through wing calendars → Call-put combo"
    },
    {
      "id": "hard-037",
      "name": "P&S parity across iron-fly transport",
      "keys": [
        "put:2:2",
        "iron:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:3:1:2",
        "ps:2:1",
        "parity:2"
      ],
      "equalSpacing": true,
      "route": "Put calendar transports premium → Iron fly transported through wing calendars → P&S and put through parity"
    },
    {
      "id": "hard-038",
      "name": "Moved strangle wing and calendar straddle",
      "keys": [
        "iron:1",
        "straddle:2:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "strangle:2:3:1",
        "cv:1:2:1"
      ],
      "equalSpacing": true,
      "route": "Wing strangle subtracts from middle straddle → Calendars transport straddle → Call wing moves strangle"
    },
    {
      "id": "hard-039",
      "name": "Covered carry across iron-fly transport",
      "keys": [
        "ps:2:2",
        "iron:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:3:1:2",
        "call:2:1",
        "reversal:1"
      ],
      "equalSpacing": true,
      "route": "Put calendar transports P&S → Iron fly transported through wing calendars → P&S and call through carry"
    },
    {
      "id": "hard-040",
      "name": "Call parity through a B/W butterfly",
      "keys": [
        "bw:2:1",
        "bw:3:1",
        "butterfly:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "ct:3:1:2",
        "call:1:1",
        "parity:1"
      ],
      "equalSpacing": true,
      "route": "B/W curve reconstructs butterfly → Butterfly transported through three call calendars → B/W and call through parity"
    },
    {
      "id": "hard-041",
      "name": "Put wing across iron-fly transport",
      "keys": [
        "cv:1:2:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "put:2:1",
        "put:3:1"
      ],
      "equalSpacing": true,
      "route": "Iron fly mixes adjacent verticals → Iron fly transported through wing calendars → Put vertical from premiums"
    },
    {
      "id": "hard-042",
      "name": "Transported risky into a call butterfly",
      "keys": [
        "strangle:1:2:1",
        "butterfly:1",
        "call:2:1",
        "call:3:1",
        "risky:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle call split → Call wings reconstruct butterfly → Risky transported through opposite option calendars"
    },
    {
      "id": "hard-043",
      "name": "Outside premium through adjacent-risky transport",
      "keys": [
        "risky:2:3:1",
        "iron:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "call:1:1",
        "put:2:1"
      ],
      "equalSpacing": true,
      "route": "Adjacent riskies form iron fly → Iron fly transported through wing calendars → Risky separates outside premiums"
    },
    {
      "id": "hard-044",
      "name": "Call split between straddle and fly calendars",
      "keys": [
        "combo:1:1",
        "call:1:1",
        "straddle:1:2",
        "pt:1:1:2",
        "butterfly:1",
        "butterfly:2",
        "ct:2:1:2",
        "ct:3:1:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo call split → Calendars transport straddle → Butterfly transported through three call calendars"
    },
    {
      "id": "hard-045",
      "name": "Put butterfly into a moved strangle",
      "keys": [
        "strangle:1:3:1",
        "strangle:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2",
        "butterfly:1",
        "pv:1:2:1"
      ],
      "equalSpacing": true,
      "route": "Put wing moves strangle → Strangle transported through wing calendars → Put verticals form butterfly"
    },
    {
      "id": "hard-046",
      "name": "Middle risky through a transported put wing",
      "keys": [
        "butterfly:1",
        "cv:2:3:1",
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:2",
        "pt:2:1:2",
        "pt:3:1:2"
      ],
      "equalSpacing": true,
      "route": "Call verticals form butterfly → Outside risky via middle combo → Put vertical transported through put calendars"
    },
    {
      "id": "hard-047",
      "name": "Put split between straddle and fly calendars",
      "keys": [
        "combo:1:1",
        "put:1:1",
        "straddle:1:2",
        "ct:1:1:2",
        "butterfly:1",
        "butterfly:2",
        "pt:2:1:2",
        "pt:3:1:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo put split → Calendars transport straddle → Butterfly transported through three put calendars"
    },
    {
      "id": "hard-048",
      "name": "B/W carry across iron-fly transport",
      "keys": [
        "bw:1:2",
        "iron:1",
        "iron:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "pt:3:1:2",
        "put:1:1",
        "rc:1"
      ],
      "equalSpacing": true,
      "route": "Call calendar transports B/W → Iron fly transported through wing calendars → B/W and put through carry"
    },
    {
      "id": "hard-049",
      "name": "Covered wing inside a calendar straddle",
      "keys": [
        "ps:1:1",
        "butterfly:1",
        "bw:2:1",
        "bw:3:1",
        "straddle:1:2",
        "ct:1:1:2",
        "pt:1:1:2"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → B/W curve reconstructs butterfly → Calendars transport straddle"
    },
    {
      "id": "hard-050",
      "name": "Moved risky through call-fly calendars",
      "keys": [
        "risky:1:3:1",
        "pv:2:3:1",
        "risky:1:2:2",
        "pt:2:1:2",
        "butterfly:1",
        "butterfly:2",
        "ct:2:1:2",
        "ct:3:1:2"
      ],
      "equalSpacing": true,
      "route": "Put wing moves risky → Risky transported through opposite option calendars → Butterfly transported through three call calendars"
    },
    {
      "id": "hard-051",
      "name": "Moved risky through put-fly calendars",
      "keys": [
        "risky:1:3:1",
        "cv:1:2:1",
        "risky:2:3:2",
        "ct:2:1:2",
        "butterfly:1",
        "butterfly:2",
        "pt:1:1:2",
        "pt:2:1:2"
      ],
      "equalSpacing": true,
      "route": "Call wing moves risky → Risky transported through opposite option calendars → Butterfly transported through three put calendars"
    },
    {
      "id": "hard-052",
      "name": "Outside put through strangle and fly transport",
      "keys": [
        "risky:1:2:1",
        "put:2:1",
        "strangle:1:2:2",
        "pt:2:1:2",
        "butterfly:1",
        "butterfly:2",
        "ct:2:1:2",
        "ct:3:1:2"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle put split → Strangle transported through wing calendars → Butterfly transported through three call calendars"
    },
    {
      "id": "hard-053",
      "name": "Straddle wing through strangle and fly transport",
      "keys": [
        "straddle:1:1",
        "pv:1:2:1",
        "strangle:1:2:2",
        "ct:1:1:2",
        "butterfly:1",
        "butterfly:2",
        "pt:1:1:2",
        "pt:3:1:2"
      ],
      "equalSpacing": true,
      "route": "High-strike straddle to strangle → Strangle transported through wing calendars → Butterfly transported through three put calendars"
    },
    {
      "id": "hard-054",
      "name": "Two strike parities through fly transport",
      "keys": [
        "iron:1",
        "butterfly:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "ct:3:1:2",
        "parity:2",
        "parity:3"
      ],
      "equalSpacing": true,
      "route": "Box subtracts butterfly to iron fly → Butterfly transported through three call calendars → Strike parities through box"
    },
    {
      "id": "hard-055",
      "name": "P&S curvature and a B/W calendar",
      "keys": [
        "rc:1",
        "parity:1",
        "butterfly:1",
        "ps:2:1",
        "ps:3:1",
        "bw:1:2",
        "ct:1:1:2"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → P&S curve reconstructs butterfly → Call calendar transports B/W"
    },
    {
      "id": "hard-056",
      "name": "Call butterfly into a calendar straddle",
      "keys": [
        "strangle:1:2:1",
        "straddle:2:2",
        "ct:2:1:2",
        "pt:2:1:2",
        "butterfly:1",
        "cv:2:3:1"
      ],
      "equalSpacing": true,
      "route": "Low-strike straddle to strangle → Calendars transport straddle → Call verticals form butterfly"
    },
    {
      "id": "hard-057",
      "name": "Middle combo through opposite wings",
      "keys": [
        "call:2:1",
        "put:2:1",
        "risky:1:3:1",
        "cv:1:2:1",
        "butterfly:1",
        "pv:1:2:1"
      ],
      "equalSpacing": true,
      "route": "Call-put combo → Outside risky via middle combo → Put verticals form butterfly"
    },
    {
      "id": "hard-058",
      "name": "P&S curvature into iron-fly carry",
      "keys": [
        "iron:1",
        "box:2:3",
        "ps:2:1",
        "ps:3:1",
        "call:1:1",
        "rc:1"
      ],
      "equalSpacing": true,
      "route": "Box subtracts butterfly to iron fly → P&S curve reconstructs butterfly → P&S and call through carry"
    },
    {
      "id": "hard-059",
      "name": "Outside risky through a cross-expiry box",
      "keys": [
        "cv:2:3:1",
        "risky:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "iron:2",
        "butterfly:2"
      ],
      "equalSpacing": true,
      "route": "Box converts call/put verticals → Outside risky via middle combo → Box subtracts butterfly to iron fly"
    },
    {
      "id": "hard-060",
      "name": "B/W curvature into iron-fly carry",
      "keys": [
        "iron:1",
        "box:2:3",
        "bw:2:1",
        "bw:3:1",
        "put:1:1",
        "rc:1"
      ],
      "equalSpacing": true,
      "route": "Box subtracts butterfly to iron fly → B/W curve reconstructs butterfly → B/W and put through carry"
    },
    {
      "id": "hard-061",
      "name": "Call-side straddle split and covered parity",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "call:3:1",
        "bw:2:1",
        "parity:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo call split → Call wings reconstruct butterfly → B/W and call through parity"
    },
    {
      "id": "hard-062",
      "name": "Put-side straddle split and protected parity",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "put:3:1",
        "ps:2:1",
        "parity:2"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo put split → Put wings reconstruct butterfly → P&S and put through parity"
    },
    {
      "id": "hard-063",
      "name": "P&S curvature between strike parities",
      "keys": [
        "bw:1:1",
        "rc:1",
        "butterfly:1",
        "ps:2:1",
        "ps:3:1",
        "box:1:2",
        "parity:2"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → P&S curve reconstructs butterfly → Strike parities through box"
    },
    {
      "id": "hard-064",
      "name": "Outside pair split and opposite straddle wing",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:1",
        "butterfly:1",
        "call:2:1",
        "straddle:3:1",
        "put:3:1"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle call split → Call wings reconstruct butterfly → Straddle into call and put"
    },
    {
      "id": "hard-065",
      "name": "Covered offset through an iron-fly wing",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:2:1",
        "iron:1",
        "pv:2:3:1"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → P&S difference forms call vertical → Iron fly mixes adjacent verticals"
    },
    {
      "id": "hard-066",
      "name": "Outside put split and a wing combo",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:1",
        "butterfly:1",
        "put:1:1",
        "call:3:1",
        "combo:3:1"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle put split → Put wings reconstruct butterfly → Call-put combo"
    },
    {
      "id": "hard-067",
      "name": "Covered offset through a put butterfly",
      "keys": [
        "ps:1:1",
        "rc:1",
        "parity:1",
        "bw:2:1",
        "butterfly:1",
        "pv:2:3:1"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → B/W difference forms put vertical → Put verticals form butterfly"
    },
    {
      "id": "hard-068",
      "name": "Covered straddle and a protected butterfly wing",
      "keys": [
        "bw:1:1",
        "straddle:1:1",
        "butterfly:1",
        "ps:3:1",
        "put:2:1",
        "parity:2"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → P&S curve reconstructs butterfly → P&S and put through parity"
    },
    {
      "id": "hard-069",
      "name": "Inner strangle through a butterfly risky",
      "keys": [
        "strangle:2:3:1",
        "straddle:2:1",
        "risky:1:3:1",
        "combo:2:1",
        "butterfly:1",
        "cv:2:3:1"
      ],
      "equalSpacing": true,
      "route": "High-strike straddle to strangle → Outside risky via middle combo → Call verticals form butterfly"
    },
    {
      "id": "hard-070",
      "name": "Call-side straddle split and a mixed wing",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "call:3:1",
        "strangle:2:3:1",
        "put:3:1"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo call split → Call wings reconstruct butterfly → Strangle joins outside premiums"
    },
    {
      "id": "hard-071",
      "name": "Outside premiums through middle butterfly parity",
      "keys": [
        "call:1:1",
        "put:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "butterfly:1",
        "pv:1:2:1"
      ],
      "equalSpacing": true,
      "route": "Risky separates outside premiums → Outside risky via middle combo → Put verticals form butterfly"
    },
    {
      "id": "hard-072",
      "name": "Put-side straddle split and a mixed wing",
      "keys": [
        "straddle:1:1",
        "combo:1:1",
        "butterfly:1",
        "put:2:1",
        "strangle:2:3:1",
        "call:2:1"
      ],
      "equalSpacing": true,
      "route": "Straddle/combo put split → Put wings reconstruct butterfly → Strangle joins outside premiums"
    },
    {
      "id": "hard-073",
      "name": "Swap transports a covered butterfly wing",
      "keys": [
        "ps:1:1",
        "butterfly:1",
        "bw:2:1",
        "bw:3:1",
        "swap:1:2:1",
        "straddle:2:1"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → B/W curve reconstructs butterfly → Straddle swap transports straddles"
    },
    {
      "id": "hard-074",
      "name": "Outside call split through P&S carry",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:1",
        "butterfly:1",
        "call:3:1",
        "ps:2:1",
        "rc:1"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle call split → Call wings reconstruct butterfly → P&S and call through carry"
    },
    {
      "id": "hard-075",
      "name": "Outside put split and opposite straddle wing",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:1",
        "butterfly:1",
        "put:1:1",
        "straddle:3:1",
        "call:3:1"
      ],
      "equalSpacing": true,
      "route": "Risky/strangle put split → Put wings reconstruct butterfly → Straddle into call and put"
    },
    {
      "id": "hard-076",
      "name": "Covered offset through a call butterfly",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:2:1",
        "butterfly:1",
        "cv:2:3:1"
      ],
      "equalSpacing": true,
      "route": "Carry versus parity in covered structures → P&S difference forms call vertical → Call verticals form butterfly"
    },
    {
      "id": "hard-077",
      "name": "Risky transport through a swap calendar",
      "keys": [
        "combo:2:1",
        "cv:1:2:1",
        "risky:1:2:2",
        "pt:2:1:2",
        "swap:1:2:1",
        "swap:1:2:2",
        "ct:2:1:2"
      ],
      "route": "Low-strike combo to risky → Risky transported through opposite option calendars → Straddle swap transported through call calendars"
    },
    {
      "id": "hard-078",
      "name": "Outside vertical split through a calendar wing",
      "keys": [
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "cv:1:3:1",
        "cv:2:3:2",
        "ct:2:1:2",
        "ct:3:1:2"
      ],
      "route": "Outside risky via middle combo → Split call vertical across middle strike → Call vertical transported through call calendars"
    },
    {
      "id": "hard-079",
      "name": "Swap conversion through straddle transport",
      "keys": [
        "swap:1:2:1",
        "pv:1:2:1",
        "cv:1:2:2",
        "ct:2:1:2",
        "straddle:1:1",
        "straddle:1:2",
        "pt:1:1:2"
      ],
      "route": "Straddle swap separates verticals → Call vertical transported through call calendars → Calendars transport straddle"
    },
    {
      "id": "hard-080",
      "name": "Moved strangle and outside-risky transport",
      "keys": [
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "strangle:1:3:1",
        "strangle:2:3:2",
        "ct:2:1:2",
        "pt:3:1:2"
      ],
      "route": "Outside risky via middle combo → Call wing moves strangle → Strangle transported through wing calendars"
    },
    {
      "id": "hard-081",
      "name": "Strangle wing through opposite vertical calendars",
      "keys": [
        "straddle:2:1",
        "cv:1:2:1",
        "strangle:1:2:2",
        "ct:1:1:2",
        "pv:1:2:1",
        "pv:1:2:2",
        "pt:1:1:2"
      ],
      "route": "Low-strike straddle to strangle → Strangle transported through wing calendars → Put vertical transported through put calendars"
    },
    {
      "id": "hard-082",
      "name": "Calendar straddle and a split put wing",
      "keys": [
        "strangle:1:2:1",
        "straddle:1:2",
        "ct:1:1:2",
        "pt:1:1:2",
        "pv:1:3:1",
        "pv:2:3:1"
      ],
      "route": "High-strike straddle to strangle → Calendars transport straddle → Split put vertical across middle strike"
    },
    {
      "id": "hard-083",
      "name": "Transported outside pair and a put vertical",
      "keys": [
        "strangle:1:2:1",
        "risky:1:2:2",
        "ct:1:1:2",
        "pt:2:1:2",
        "pv:1:2:1",
        "put:1:1"
      ],
      "route": "Risky/strangle put split → Risky transported through opposite option calendars → Put vertical from premiums"
    },
    {
      "id": "hard-084",
      "name": "Covered offset through put-vertical transport",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:1:2",
        "pv:1:2:1",
        "pv:1:2:2",
        "pt:2:1:2"
      ],
      "route": "Carry versus parity in covered structures → Put calendar transports P&S → Put vertical transported through put calendars"
    },
    {
      "id": "hard-085",
      "name": "Strangle wing and a risky calendar",
      "keys": [
        "strangle:1:2:1",
        "straddle:2:1",
        "cv:1:2:2",
        "ct:2:1:2",
        "risky:1:2:1",
        "risky:1:2:2",
        "pt:2:1:2"
      ],
      "route": "Low-strike straddle to strangle → Call vertical transported through call calendars → Risky transported through opposite option calendars"
    },
    {
      "id": "hard-086",
      "name": "Middle-straddle call through an outside risky",
      "keys": [
        "straddle:2:1",
        "risky:1:3:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "ct:2:1:2",
        "call:2:2"
      ],
      "route": "Straddle/combo call split → Outside risky via middle combo → Call calendar transports premium"
    },
    {
      "id": "hard-087",
      "name": "Middle-straddle put through an outside risky",
      "keys": [
        "straddle:2:1",
        "risky:1:3:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "pt:2:1:2",
        "put:2:2"
      ],
      "route": "Straddle/combo put split → Outside risky via middle combo → Put calendar transports premium"
    },
    {
      "id": "hard-088",
      "name": "Moved risky through a straddle calendar",
      "keys": [
        "risky:1:3:1",
        "risky:1:2:1",
        "pv:2:3:2",
        "pt:3:1:2",
        "straddle:2:1",
        "straddle:2:2",
        "ct:2:1:2"
      ],
      "route": "Put wing moves risky → Put vertical transported through put calendars → Calendars transport straddle"
    },
    {
      "id": "hard-089",
      "name": "Moved risky through a strangle calendar",
      "keys": [
        "risky:1:3:1",
        "risky:2:3:1",
        "cv:1:2:2",
        "ct:2:1:2",
        "strangle:1:2:1",
        "strangle:1:2:2",
        "pt:2:1:2"
      ],
      "route": "Call wing moves risky → Call vertical transported through call calendars → Strangle transported through wing calendars"
    },
    {
      "id": "hard-090",
      "name": "Moved strangle through a risky calendar",
      "keys": [
        "strangle:1:3:1",
        "strangle:1:2:1",
        "pv:2:3:2",
        "pt:3:1:2",
        "risky:1:2:1",
        "risky:1:2:2",
        "ct:1:1:2"
      ],
      "route": "Put wing moves strangle → Put vertical transported through put calendars → Risky transported through opposite option calendars"
    },
    {
      "id": "hard-091",
      "name": "Swap and strangle through a shared calendar",
      "keys": [
        "straddle:1:1",
        "straddle:2:1",
        "swap:1:2:2",
        "ct:2:1:2",
        "strangle:1:2:1",
        "strangle:1:2:2",
        "pt:2:1:2"
      ],
      "route": "Straddle swap transports straddles → Straddle swap transported through call calendars → Strangle transported through wing calendars"
    },
    {
      "id": "hard-092",
      "name": "Calendar put vertical and a combo risky",
      "keys": [
        "box:1:2",
        "pv:1:2:2",
        "pt:1:1:2",
        "pt:2:1:2",
        "risky:1:2:1",
        "combo:2:1"
      ],
      "route": "Box converts call/put verticals → Put vertical transported through put calendars → Low-strike combo to risky"
    },
    {
      "id": "hard-093",
      "name": "Covered parity across a put-vertical calendar",
      "keys": [
        "bw:2:1",
        "pv:1:2:2",
        "pt:1:1:2",
        "pt:2:1:2",
        "call:1:1",
        "parity:1"
      ],
      "route": "B/W difference forms put vertical → Put vertical transported through put calendars → B/W and call through parity"
    },
    {
      "id": "hard-094",
      "name": "Outside strangle premiums through a calendar wing",
      "keys": [
        "strangle:2:3:1",
        "cv:1:2:2",
        "ct:1:1:2",
        "ct:2:1:2",
        "call:1:1",
        "put:3:1"
      ],
      "route": "Call wing moves strangle → Call vertical transported through call calendars → Strangle joins outside premiums"
    },
    {
      "id": "hard-095",
      "name": "Swap conversion through a put-premium calendar",
      "keys": [
        "swap:1:2:1",
        "cv:1:2:1",
        "pv:1:2:2",
        "pt:2:1:2",
        "put:1:1",
        "put:1:2"
      ],
      "route": "Straddle swap separates verticals → Put vertical transported through put calendars → Put calendar transports premium"
    },
    {
      "id": "hard-096",
      "name": "Call-premium wing through a swap calendar",
      "keys": [
        "cv:1:2:2",
        "ct:1:1:2",
        "swap:2:3:1",
        "swap:2:3:2",
        "ct:3:1:2",
        "call:2:1",
        "call:1:1"
      ],
      "route": "Call vertical transported through call calendars → Straddle swap transported through call calendars → Call vertical from premiums"
    },
    {
      "id": "hard-097",
      "name": "Covered put carry through a middle risky",
      "keys": [
        "put:3:1",
        "risky:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "bw:2:1",
        "rc:1"
      ],
      "route": "Put vertical from premiums → Outside risky via middle combo → B/W and put through carry"
    },
    {
      "id": "hard-098",
      "name": "Protected put parity through a middle risky",
      "keys": [
        "ps:2:1",
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "put:1:1",
        "parity:1"
      ],
      "route": "P&S difference forms call vertical → Outside risky via middle combo → P&S and put through parity"
    },
    {
      "id": "hard-099",
      "name": "Covered straddle through a risky wing",
      "keys": [
        "bw:3:1",
        "risky:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "ps:2:1",
        "straddle:2:1"
      ],
      "route": "B/W difference forms put vertical → Outside risky via middle combo → B/W with P&S forms straddle"
    },
    {
      "id": "hard-100",
      "name": "Outside strangle split through covered parity",
      "keys": [
        "strangle:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "bw:1:1",
        "parity:1"
      ],
      "route": "Risky/strangle call split → Outside risky via middle combo → B/W and call through parity"
    },
    {
      "id": "hard-101",
      "name": "Split put wing through an outside swap",
      "keys": [
        "risky:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "pv:1:2:1",
        "swap:1:3:1",
        "cv:1:3:1"
      ],
      "route": "Outside risky via middle combo → Split put vertical across middle strike → Straddle swap separates verticals"
    },
    {
      "id": "hard-102",
      "name": "High combo through a moved strangle",
      "keys": [
        "combo:1:1",
        "pv:1:3:1",
        "combo:2:1",
        "cv:1:2:1",
        "strangle:1:3:1",
        "strangle:1:2:1"
      ],
      "route": "High-strike combo to risky → Outside risky via middle combo → Put wing moves strangle"
    },
    {
      "id": "hard-103",
      "name": "Strike-width combo into an outside pair",
      "keys": [
        "combo:1:1",
        "box:1:2",
        "cv:1:2:1",
        "pv:2:3:1",
        "strangle:1:3:1",
        "put:3:1"
      ],
      "route": "Combos locate strike width → Outside risky via middle combo → Risky/strangle put split"
    },
    {
      "id": "hard-104",
      "name": "Call wing through an outside straddle",
      "keys": [
        "call:2:1",
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "straddle:1:1",
        "put:1:1"
      ],
      "route": "Call vertical from premiums → Outside risky via middle combo → Straddle into call and put"
    },
    {
      "id": "hard-105",
      "name": "Protected call carry through a middle risky",
      "keys": [
        "put:2:1",
        "risky:1:3:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "ps:2:1",
        "rc:1"
      ],
      "route": "Call-put combo → Outside risky via middle combo → P&S and call through carry"
    },
    {
      "id": "hard-106",
      "name": "Inner strangle through a straddle swap",
      "keys": [
        "strangle:1:2:1",
        "risky:1:3:1",
        "combo:2:1",
        "pv:2:3:1",
        "swap:2:3:1",
        "straddle:3:1"
      ],
      "route": "Low-strike straddle to strangle → Outside risky via middle combo → Straddle swap transports straddles"
    },
    {
      "id": "hard-107",
      "name": "Covered put wing and an inner straddle",
      "keys": [
        "ps:2:1",
        "rc:1",
        "parity:2",
        "bw:1:1",
        "strangle:1:2:1",
        "straddle:1:1"
      ],
      "route": "Carry versus parity in covered structures → B/W difference forms put vertical → High-strike straddle to strangle"
    },
    {
      "id": "hard-108",
      "name": "Covered call wing and an inner combo",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:2:1",
        "risky:1:2:1",
        "combo:2:1"
      ],
      "route": "Carry versus parity in covered structures → P&S difference forms call vertical → Low-strike combo to risky"
    },
    {
      "id": "hard-109",
      "name": "Outside risky between two strike parities",
      "keys": [
        "combo:1:1",
        "risky:1:3:1",
        "cv:1:2:1",
        "pv:2:3:1",
        "parity:1",
        "parity:2"
      ],
      "route": "Combos locate strike width → Outside risky via middle combo → Strike parities through box"
    },
    {
      "id": "hard-110",
      "name": "Strangle wing through inner and outer combos",
      "keys": [
        "strangle:1:2:1",
        "straddle:2:1",
        "combo:2:1",
        "pv:2:3:1",
        "combo:3:1",
        "cv:1:3:1"
      ],
      "route": "Low-strike straddle to strangle → Outside risky via middle combo → Low-strike combo to risky"
    },
    {
      "id": "hard-111",
      "name": "Covered curvature between strangle and straddle",
      "keys": [
        "box:2:3",
        "bw:1:1",
        "bw:2:1",
        "bw:3:1",
        "straddle:2:1",
        "strangle:1:3:1"
      ],
      "equalSpacing": true,
      "route": "Box subtracts butterfly to iron fly → B/W curve reconstructs butterfly → Wing strangle subtracts from middle straddle"
    },
    {
      "id": "hard-112",
      "name": "Covered offset through two wing riskies",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:2:1",
        "risky:1:3:1",
        "risky:2:3:1"
      ],
      "route": "Carry versus parity in covered structures → P&S difference forms call vertical → Call wing moves risky"
    },
    {
      "id": "hard-113",
      "name": "Covered offset through synthetic verticals",
      "keys": [
        "bw:1:1",
        "ps:1:1",
        "rc:1",
        "parity:2",
        "cv:1:2:1",
        "pv:1:2:1"
      ],
      "route": "Carry versus parity in covered structures → Strike parities through box → Box converts call/put verticals"
    },
    {
      "id": "hard-114",
      "name": "Covered put wing through a straddle swap",
      "keys": [
        "ps:1:1",
        "rc:1",
        "parity:1",
        "bw:2:1",
        "swap:1:2:1",
        "cv:1:2:1"
      ],
      "route": "Carry versus parity in covered structures → B/W difference forms put vertical → Straddle swap separates verticals"
    },
    {
      "id": "hard-115",
      "name": "Covered offset through split call verticals",
      "keys": [
        "bw:1:1",
        "rc:1",
        "parity:1",
        "ps:2:1",
        "cv:1:3:1",
        "cv:2:3:1"
      ],
      "route": "Carry versus parity in covered structures → P&S difference forms call vertical → Split call vertical across middle strike"
    },
    {
      "id": "hard-116",
      "name": "Strike-width parity between covered calls",
      "keys": [
        "bw:1:1",
        "ps:1:1",
        "rc:1",
        "box:1:2",
        "bw:2:1",
        "call:2:1"
      ],
      "route": "Carry versus parity in covered structures → Strike parities through box → B/W and call through parity"
    },
    {
      "id": "hard-117",
      "name": "Covered offset through split put verticals",
      "keys": [
        "ps:1:1",
        "rc:1",
        "parity:1",
        "bw:2:1",
        "pv:1:3:1",
        "pv:2:3:1"
      ],
      "route": "Carry versus parity in covered structures → B/W difference forms put vertical → Split put vertical across middle strike"
    },
    {
      "id": "hard-118",
      "name": "Covered strike-width and protected call carry",
      "keys": [
        "bw:1:1",
        "ps:1:1",
        "box:1:2",
        "parity:2",
        "ps:2:1",
        "call:2:1"
      ],
      "route": "Carry versus parity in covered structures → Strike parities through box → P&S and call through carry"
    },
    {
      "id": "hard-119",
      "name": "Covered straddle through opposite premium curvature",
      "keys": [
        "bw:1:1",
        "straddle:1:1",
        "ps:2:1",
        "ps:3:1",
        "put:1:1",
        "put:2:1",
        "put:3:1"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → P&S curve reconstructs butterfly → Put wings reconstruct butterfly"
    },
    {
      "id": "hard-120",
      "name": "Protected straddle through opposite premium curvature",
      "keys": [
        "ps:1:1",
        "straddle:1:1",
        "bw:2:1",
        "bw:3:1",
        "call:1:1",
        "call:2:1",
        "call:3:1"
      ],
      "equalSpacing": true,
      "route": "B/W with P&S forms straddle → B/W curve reconstructs butterfly → Call wings reconstruct butterfly"
    }
  ];
}));
