const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Athletes
  getAthletes:   ()         => ipcRenderer.invoke('athletes:getAll'),
  getAthlete:    (id)       => ipcRenderer.invoke('athletes:getById', id),
  createAthlete: (data)     => ipcRenderer.invoke('athletes:create', data),
  updateAthlete: (id, data) => ipcRenderer.invoke('athletes:update', id, data),
  deleteAthlete: (id)       => ipcRenderer.invoke('athletes:delete', id),
  clearRoster:      ()         => ipcRenderer.invoke('athletes:clearAll'),
  renameTeam:       (oldName, newName) => ipcRenderer.invoke('athletes:renameTeam', { oldName, newName }),
  deduplicateAthletes: ()     => ipcRenderer.invoke('athletes:deduplicate'),
  getAthletePRs:    (id) => ipcRenderer.invoke('athletes:getPRs',    id),
  getAthleteProfile:(id) => ipcRenderer.invoke('athletes:getProfile', id),
  importTCL:     ()                => ipcRenderer.invoke('import:tcl'),

  // Teams
  getTeamProfiles: ()     => ipcRenderer.invoke('teams:getProfiles'),
  saveTeamProfile: (data) => ipcRenderer.invoke('teams:saveProfile', data),
  mergeTeam:  (fromTeam, toTeam)       => ipcRenderer.invoke('teams:merge',  { fromTeam, toTeam }),
  deleteTeam: (teamName, reassignTo)   => ipcRenderer.invoke('teams:delete', { teamName, reassignTo }),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Seasons
  getSeasons:      ()     => ipcRenderer.invoke('seasons:getAll'),
  createSeason:    (data) => ipcRenderer.invoke('seasons:create', data),
  setActiveSeason: (id)   => ipcRenderer.invoke('seasons:setActive', id),

  // T&F Events
  getTfEvents:    ()        => ipcRenderer.invoke('tfEvents:getAll'),
  createTfEvent:  (data)    => ipcRenderer.invoke('tfEvents:create', data),
  updateTfEvent:  (id, data)=> ipcRenderer.invoke('tfEvents:update', id, data),
  deleteTfEvent:  (id)      => ipcRenderer.invoke('tfEvents:delete', id),

  // Settings
  getSettings:  ()     => ipcRenderer.invoke('settings:get'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),

  // Meets
  getMeets:              ()               => ipcRenderer.invoke('meets:getAll'),
  createMeet:            (data)           => ipcRenderer.invoke('meets:create', data),
  updateMeet:            (id, data)       => ipcRenderer.invoke('meets:update', id, data),
  deleteMeet:            (id)             => ipcRenderer.invoke('meets:delete', id),
  getMeetDetail:         (id)             => ipcRenderer.invoke('meets:getDetail', id),
  addMeetEvent:          (data)           => ipcRenderer.invoke('meetEvents:add', data),
  removeMeetEvent:       (id)             => ipcRenderer.invoke('meetEvents:remove', id),
  getMeetEventEntries:   (meetEventId)    => ipcRenderer.invoke('meetEvents:getWithEntries', meetEventId),
  addEntry:              (data)           => ipcRenderer.invoke('entries:add', data),
  removeEntry:           (id)             => ipcRenderer.invoke('entries:remove', id),
  getAthleteBestMark:    (aid, evId)      => ipcRenderer.invoke('entries:getAthleteBestMark', aid, evId),
  updateEntrySeed:       (id, mark)       => ipcRenderer.invoke('entries:updateSeed', id, mark),
  scratchEntry:          (id, scratched)  => ipcRenderer.invoke('entries:scratch', id, scratched),
  saveResult:            (entryId, data)  => ipcRenderer.invoke('results:save', entryId, data),
  autoRank:              (meetEventId)    => ipcRenderer.invoke('results:autoRank',      meetEventId),
  advanceAthletes:       (data)           => ipcRenderer.invoke('meetEvents:advance',     data),
  seedEvent:             (meetEventId, heatSize) => ipcRenderer.invoke('meets:seedEvent', meetEventId, heatSize),

  // Parent Portal
  getMeetResults: () => ipcRenderer.invoke('portal:getMeetResults'),

  // Schedule
  getUpcomingSchedule: ()     => ipcRenderer.invoke('schedule:getUpcoming'),
  getPractices:        ()     => ipcRenderer.invoke('practices:getAll'),
  createPractice:      (data) => ipcRenderer.invoke('practices:create', data),
  deletePractice:      (id)   => ipcRenderer.invoke('practices:delete', id),

  // Print
  printThermal:  (opts) => ipcRenderer.invoke('print:thermal',  opts),
  printSheet:    (opts) => ipcRenderer.invoke('print:sheet',    opts),
  savePDF:       (opts) => ipcRenderer.invoke('print:savePDF',  opts),
  listPrinters:  ()     => ipcRenderer.invoke('printers:list'),

  // AI
  aiChat: (opts) => ipcRenderer.invoke('ai:chat', opts),

  // Cloud Sync
  testConnection:      (creds)           => ipcRenderer.invoke('sync:test', creds),
  setupParentAccount:  (creds)           => ipcRenderer.invoke('sync:setupParentAccount', creds),
  fullSync:            ()                => ipcRenderer.invoke('sync:fullSync'),
  publishMeet:         (id, opts)        => ipcRenderer.invoke('sync:publishMeet', id, opts),

  // Run-a-thon
  getRunathonEntries:      (meetId) => ipcRenderer.invoke('runathon:getEntries',    meetId),
  upsertRunathonEntry:     (data)   => ipcRenderer.invoke('runathon:upsertEntry',   data),
  removeRunathonEntry:     (id)     => ipcRenderer.invoke('runathon:removeEntry',   id),
  bulkAddRunathonAthletes: (data)   => ipcRenderer.invoke('runathon:bulkAddRoster', data),

  // Records
  getRecords:             (scope) => ipcRenderer.invoke('records:getAll',         scope),
  saveRecord:             (data)  => ipcRenderer.invoke('records:save',           data),
  deleteRecord:           (id)    => ipcRenderer.invoke('records:delete',         id),
  syncRecordsFromResults: ()      => ipcRenderer.invoke('records:syncFromResults'),

  // Relay legs
  getRelayLegs:        (entryId) => ipcRenderer.invoke('relay:getLegs',          entryId),
  saveRelayLeg:        (data)    => ipcRenderer.invoke('relay:saveLeg',           data),
  getRelayLegsForMeet: (meetId)  => ipcRenderer.invoke('relay:getLegsForMeet',   meetId),

  // Season scoring
  getScoreSeasons:     ()          => ipcRenderer.invoke('scores:getSeasons'),
  getSeasonScoreboard: (seasonId)  => ipcRenderer.invoke('scores:getSeasonal',   seasonId),

  // Meet templates
  getTemplates:   ()             => ipcRenderer.invoke('templates:getAll'),
  saveTemplate:   (name, events) => ipcRenderer.invoke('templates:save', { name, events }),
  deleteTemplate: (id)           => ipcRenderer.invoke('templates:delete', id),

  // Hy-tek TCL full meet import
  importTCLMeet: (filePath) => ipcRenderer.invoke('import:tclMeet', filePath),

  // Hy-Tek MDB (Access database) meet import
  importHytek: (filePath) => ipcRenderer.invoke('import:hytek', filePath),

  // FinishLynx .lif results import
  importFinishLynx:       (meetId) => ipcRenderer.invoke('import:finishlynx',        meetId),
  applyFinishLynxResults: (rows)   => ipcRenderer.invoke('import:finishlynx:apply',  rows),

  // Auth
  authGetSession:    ()       => ipcRenderer.invoke('auth:getSession'),
  authLogin:         (data)   => ipcRenderer.invoke('auth:login',         data),
  authLogout:        ()       => ipcRenderer.invoke('auth:logout'),
  authListUsers:     ()       => ipcRenderer.invoke('auth:listUsers'),
  authCreateUser:    (data)   => ipcRenderer.invoke('auth:createUser',    data),
  authUpdatePassword:(data)   => ipcRenderer.invoke('auth:updatePassword', data),
  authUpdateUser:    (data)   => ipcRenderer.invoke('auth:updateUser',    data),
  authDeleteUser:    (id)     => ipcRenderer.invoke('auth:deleteUser',    id),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),

  // Attendance
  attendanceSyncFromEntries: (meetId)       => ipcRenderer.invoke('attendance:syncFromEntries', meetId),
  attendanceGetForMeet:      (meetId)       => ipcRenderer.invoke('attendance:getForMeet',      meetId),
  attendanceSet:             (data)         => ipcRenderer.invoke('attendance:set',             data),
  attendanceClearOverride:   (data)         => ipcRenderer.invoke('attendance:clearOverride',   data),
  attendanceGetSeasonSummary:(seasonId)     => ipcRenderer.invoke('attendance:getSeasonSummary',seasonId),
})
