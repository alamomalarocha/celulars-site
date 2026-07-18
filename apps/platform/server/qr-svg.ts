import { qrcodegen } from './vendor/qrcodegen.js';
export function qrSvgDataUrl(value:string):string {
  const qr=qrcodegen.QrCode.encodeText(value,qrcodegen.QrCode.Ecc.MEDIUM);
  const border=4; let pathData='';
  for(let y=0;y<qr.size;y+=1) for(let x=0;x<qr.size;x+=1) if(qr.getModule(x,y)) pathData+=`M${x+border},${y+border}h1v1h-1z `;
  const size=qr.size+border*2;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${pathData.trim()}" fill="black"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
