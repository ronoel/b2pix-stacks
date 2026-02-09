import { create } from 'qrcode';

export interface QRCodeOptions {
  ecl?: 'L' | 'M' | 'Q' | 'H';
}

export function qrcode(data: string, options?: QRCodeOptions): string {
  const ecl = options?.ecl || 'M';
  const qr = create(data, { errorCorrectionLevel: ecl });

  const modules = qr.modules;
  const size = modules.size;
  const moduleData = modules.data;
  const cellSize = 4;
  const margin = 16;
  const totalSize = size * cellSize + margin * 2;

  let paths = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (moduleData[y * size + x]) {
        paths += `<rect x="${x * cellSize + margin}" y="${y * cellSize + margin}" width="${cellSize}" height="${cellSize}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><rect width="${totalSize}" height="${totalSize}" fill="#fff"/><g fill="#000">${paths}</g></svg>`;
}
