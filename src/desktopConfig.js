// Apps that can run as windows on the Cola OS desktop.
// Sizes are in desktop units: the desktop lays out at ~1097×793 (1920×1440 at 175% scaling, minus the taskbar).
// chrome: window frame ('classic' = Cola OS default; apps may bring their own, e.g. 'xp').
export const desktopConfig = [
  {
    id: 'riftbound', label: 'Riftbound', title: 'Riftbound Companion',
    icon: 'cards', appName: 'RiftboundCompanion',
    defaultSize: { width: 900, height: 710 }, minSize: { width: 420, height: 340 },
  },
  {
    id: 'portfolio',
    label: 'Internet Explorer',
    title: 'Zachary Siegel — Internet Explorer',
    chrome: 'xp',
    icon: 'browser',
    appName: 'RetroBrowser',
    defaultSize: { width: 940, height: 720 },
    minSize: { width: 420, height: 300 },
  },
  {
    id: 'games',
    label: 'Steam.exe',
    title: 'Steam',
    chrome: 'steam',
    icon: 'gamepad',
    appName: 'RetroSteam',
    defaultSize: { width: 720, height: 520 },
    minSize: { width: 420, height: 300 },
    defaultPosition: { x: 150, y: 70 },
  },
  {
    id: 'readme',
    label: 'READ_ME_FIRST.txt',
    title: 'READ_ME_FIRST.txt - Notepad',
    icon: 'notepad',
    appName: 'Notepad',
    defaultSize: { width: 460, height: 440 },
    minSize: { width: 260, height: 160 },
    defaultPosition: { x: 600, y: 40 },
  },
];

export const appById = id => desktopConfig.find(app => app.id === id);

// Desktop icons and Start menu entries. `request` asks the target app to open a specific page,
// every time it's launched (so Internet Explorer always lands on the homepage, Résumé on the résumé).
export const shortcuts = [
  { key: 'riftbound', label: 'Riftbound', icon: 'cards', app: 'riftbound' },
  { key: 'portfolio', label: 'Internet Explorer', icon: 'browser', app: 'portfolio', request: { path: 'home' } },
  { key: 'games', label: 'Steam.exe', icon: 'gamepad', app: 'games' },
  { key: 'readme', label: 'READ_ME_FIRST.txt', icon: 'notepad', app: 'readme' },
  { key: 'resume', label: 'Résumé', icon: 'resume', app: 'portfolio', request: { path: 'resume' } },
  { key: 'contact', label: 'Contact', icon: 'mail', app: 'portfolio', request: { path: 'contact' } },
];
