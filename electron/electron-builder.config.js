/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.pwscho.vaultapp',
  productName: 'VaultApp 2.0',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  win: {
    target: [
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
    artifactName: 'VaultApp-2.0-windows-portable-${arch}.${ext}',
  },
  files: [
    'build/**/*',
    'app/**/*',
    'generated/**/*',
    // `assets` is also the electron-builder `buildResources` directory, whose
    // contents are NOT packaged by default. Include it explicitly so the
    // splash screen (and any other runtime assets) ship in the app.
    'assets/**/*',
    'package.json',
    // Platform runtime + plugins, prepared by `capacitor-electron vendor`.
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
};
