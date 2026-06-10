const { dialog, app } = require('electron')

let autoUpdater

function getUpdater() {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('update-available', info => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Pegasus Track ${info.version} is available`,
        detail: 'Download it now? The app will restart to install.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.downloadUpdate()
      })
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Pegasus Track update downloaded',
        detail: 'Restart now to install the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall(false, true)
      })
    })

    autoUpdater.on('error', err => {
      console.error('Auto-updater error:', err?.message ?? err)
    })
  }
  return autoUpdater
}

function checkForUpdates() {
  if (!app.isPackaged) return
  setTimeout(() => {
    try {
      getUpdater().checkForUpdates().catch(err => {
        console.error('Update check failed:', err?.message ?? err)
      })
    } catch (err) {
      console.error('Update check failed:', err?.message ?? err)
    }
  }, 6000)
}

module.exports = { checkForUpdates }
