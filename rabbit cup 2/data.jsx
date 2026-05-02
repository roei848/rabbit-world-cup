// Mock data — generic plausible national teams (no real WC fixtures)
// Group stage matchday 12 era. Teams use standard ISO codes.

const TEAMS = {
  BRA: 'Brazil', ARG: 'Argentina', FRA: 'France', ENG: 'England', GER: 'Germany',
  ESP: 'Spain', POR: 'Portugal', NED: 'Netherlands', BEL: 'Belgium', CRO: 'Croatia',
  USA: 'USA', MEX: 'Mexico', CAN: 'Canada', JPN: 'Japan', KOR: 'S. Korea',
  MAR: 'Morocco', SEN: 'Senegal', URU: 'Uruguay', COL: 'Colombia', ITA: 'Italy',
  AUS: 'Australia', DEN: 'Denmark', SUI: 'Switzerland', POL: 'Poland', GHA: 'Ghana',
};

const LEADERBOARD = [
  { name: 'Maya Okonkwo',  rank: 1,  prev: 2,  pts: 184, exact: 9, trend: 'up'   },
  { name: 'Theo Almeida',  rank: 2,  prev: 1,  pts: 178, exact: 7, trend: 'down' },
  { name: 'Priya Shah',    rank: 3,  prev: 4,  pts: 169, exact: 8, trend: 'up'   },
  { name: 'Liam Hoffmann', rank: 4,  prev: 3,  pts: 164, exact: 6, trend: 'down' },
  { name: 'You',           rank: 5,  prev: 8,  pts: 158, exact: 7, trend: 'up',   you: true },
  { name: 'Sara Tanaka',   rank: 6,  prev: 6,  pts: 154, exact: 5, trend: 'flat' },
  { name: 'Jonas Bekele',  rank: 7,  prev: 5,  pts: 150, exact: 4, trend: 'down' },
  { name: 'Emma Larsen',   rank: 8,  prev: 7,  pts: 147, exact: 6, trend: 'down' },
  { name: 'Diego Vega',    rank: 9,  prev: 11, pts: 141, exact: 5, trend: 'up'   },
  { name: 'Aisha Khan',    rank: 10, prev: 10, pts: 138, exact: 4, trend: 'flat' },
  { name: 'Marco Rossi',   rank: 11, prev: 9,  pts: 134, exact: 3, trend: 'down' },
  { name: 'Yuki Sato',     rank: 12, prev: 13, pts: 129, exact: 4, trend: 'up'   },
];

// Stages and multipliers (admin-tunable)
const STAGES = [
  { id: 'group',   label: 'Group Stage',  mult: 1 },
  { id: 'r16',     label: 'Round of 16',  mult: 2 },
  { id: 'qf',      label: 'Quarter Final',mult: 3 },
  { id: 'sf',      label: 'Semi Final',   mult: 4 },
  { id: 'final',   label: 'Final',        mult: 5 },
];

// Matches for the predictions page
const MATCHES = [
  // Today
  { id: 'm1', date: 'Today', day: 'Sat, Jun 27', kickoff: '15:00', stage: 'group', stageLabel: 'Group F · MD3',
    home: 'BRA', away: 'SUI',
    state: 'finished', actual: { h: 2, a: 1 }, pick: { h: 2, a: 1 }, points: 3 },
  { id: 'm2', date: 'Today', day: 'Sat, Jun 27', kickoff: '18:00', stage: 'group', stageLabel: 'Group D · MD3',
    home: 'ARG', away: 'POL',
    state: 'live', live: { h: 1, a: 0, minute: 67 }, pick: { h: 2, a: 0 } },
  { id: 'm3', date: 'Today', day: 'Sat, Jun 27', kickoff: '21:00', stage: 'group', stageLabel: 'Group A · MD3',
    home: 'NED', away: 'SEN',
    state: 'upcoming', pick: { h: 1, a: 1 } },

  // Tomorrow
  { id: 'm4', date: 'Tomorrow', day: 'Sun, Jun 28', kickoff: '15:00', stage: 'r16', stageLabel: 'Round of 16',
    home: 'FRA', away: 'MAR',
    state: 'upcoming', pick: { h: null, a: null } },
  { id: 'm5', date: 'Tomorrow', day: 'Sun, Jun 28', kickoff: '18:00', stage: 'r16', stageLabel: 'Round of 16',
    home: 'ENG', away: 'BEL',
    state: 'upcoming', pick: { h: 2, a: 2 } },

  // Wed
  { id: 'm6', date: 'Wed, Jul 1', day: 'Wed, Jul 1', kickoff: '20:00', stage: 'qf', stageLabel: 'Quarter Final',
    home: 'ESP', away: 'GER',
    state: 'upcoming', pick: { h: null, a: null } },
];

// Leagues
const LEAGUES = [
  { id: 'office',  name: 'Black Rabbit HQ',     members: 84, rank: 5,   pts: 158, color: 'yellow', code: 'BR-HQ-2026' },
  { id: 'design',  name: 'Design Squad',        members: 12, rank: 2,   pts: 158, color: 'pink' },
  { id: 'eng',     name: 'Engineering League',  members: 31, rank: 14,  pts: 158, color: 'teal' },
  { id: 'mates',   name: 'Old Friends',         members: 7,  rank: 1,   pts: 158, color: 'orange' },
  { id: 'public',  name: 'BR Worldwide',        members: 312, rank: 47, pts: 158, color: 'purple' },
];

// Users for admin panel
const ADMIN_USERS = [
  { name: 'Maya Okonkwo',  email: 'maya@blackrabbit.co',   role: 'Member', joined: 'Jun 1', status: 'active' },
  { name: 'Theo Almeida',  email: 'theo@blackrabbit.co',   role: 'Member', joined: 'Jun 1', status: 'active' },
  { name: 'Priya Shah',    email: 'priya@blackrabbit.co',  role: 'Admin',  joined: 'May 28', status: 'active' },
  { name: 'Liam Hoffmann', email: 'liam@blackrabbit.co',   role: 'Member', joined: 'Jun 2', status: 'active' },
  { name: 'Sara Tanaka',   email: 'sara@blackrabbit.co',   role: 'Member', joined: 'Jun 3', status: 'active' },
  { name: 'Jonas Bekele',  email: 'jonas@blackrabbit.co',  role: 'Member', joined: 'Jun 1', status: 'active' },
  { name: 'Emma Larsen',   email: 'emma@blackrabbit.co',   role: 'Member', joined: 'Jun 4', status: 'active' },
  { name: 'Diego Vega',    email: 'diego@blackrabbit.co',  role: 'Member', joined: 'Jun 5', status: 'banned' },
];

const ADJUSTMENT_LOG = [
  { when: 'Jun 26, 14:02', who: 'Priya Shah', target: 'Diego Vega',   delta: -5, reason: 'Duplicate account merge' },
  { when: 'Jun 25, 09:18', who: 'Priya Shah', target: 'Maya Okonkwo', delta: +2, reason: 'Late-submission grace (kickoff bug)' },
  { when: 'Jun 24, 16:40', who: 'Priya Shah', target: 'All',           delta: +1, reason: 'Bonus pt — group-stage bonus matchday' },
];

const BONUS = [
  { id: 'streak', title: 'Hot Streak', subtitle: '4 exact scores in a row', reward: '+10 pts', state: 'progress', progress: 3, total: 5 },
  { id: 'underdog', title: 'Underdog Caller', subtitle: 'Predict a non-favorite winner correctly', reward: '+5 pts', state: 'available' },
  { id: 'perfect-md', title: 'Perfect Matchday', subtitle: 'All 4 matches: winner correct', reward: '+15 pts', state: 'completed' },
  { id: 'top-scorer', title: 'Pick the Top Scorer', subtitle: 'Closes after Group Stage', reward: '+25 pts', state: 'available' },
  { id: 'final-four', title: 'Final Four', subtitle: 'All 4 SF teams correct', reward: '+50 pts', state: 'locked', unlocks: 'After Round of 16' },
];

Object.assign(window, {
  TEAMS, LEADERBOARD, STAGES, MATCHES, LEAGUES, ADMIN_USERS, ADJUSTMENT_LOG, BONUS,
});
