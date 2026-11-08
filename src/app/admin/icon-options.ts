export const iconOptions = [
  ['server', 'Server', 'сервер'], ['database', 'Database', 'база данных'],
  ['network-wired', 'Network', 'сеть роутер'], ['diagram-project', 'Proxy', 'прокси'],
  ['ethernet', 'Ethernet', 'порт кабель'], ['hard-drive', 'Storage', 'диск хранилище'],
  ['microchip', 'CPU', 'процессор'], ['memory', 'Memory', 'память'],
  ['computer', 'Computer', 'компьютер'], ['desktop', 'Desktop', 'монитор'],
  ['laptop', 'Laptop', 'ноутбук'], ['mobile-screen', 'Mobile', 'телефон'],
  ['cloud', 'Cloud', 'облако'], ['globe', 'Website', 'сайт интернет'],
  ['wifi', 'Wi-Fi', 'вайфай'], ['satellite-dish', 'Satellite', 'спутник'],
  ['tower-broadcast', 'Radio', 'радио трансляция'], ['shield-halved', 'Security', 'защита'],
  ['lock', 'Lock', 'замок'], ['gamepad', 'Game server', 'игра'],
  ['terminal', 'Terminal', 'терминал'], ['code', 'Application', 'приложение код'],
  ['cubes', 'Cluster', 'кластер'], ['cube', 'Container', 'контейнер'],
  ['box', 'Package', 'пакет'], ['folder', 'Folder', 'папка'],
  ['file', 'File', 'файл'], ['plug', 'Power', 'питание'],
  ['bolt', 'Energy', 'энергия'], ['heart-pulse', 'Health', 'здоровье'],
  ['print', 'Printer', 'принтер'], ['video', 'Camera', 'камера']
].map(([name, label, keywords]) => ({icon: `fa-solid fa-${name}`, label, keywords}));

export function iconKey(value: string): string {
  const name = value.split(/\s+/).find(part => part.startsWith('fa-') && !['fa-solid', 'fa-regular', 'fa-brands'].includes(part)) || value;
  return ({'fa-broadcast-tower': 'fa-tower-broadcast', 'fa-hdd': 'fa-hard-drive', 'fa-project-diagram': 'fa-diagram-project'} as {[key: string]: string})[name] || name;
}
