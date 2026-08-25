import JSZip from 'jszip';
import fs from 'fs';

async function testNodeZip() {
  const zip = new JSZip();
  for (let i = 1; i <= 200; i++) {
    zip.file(`projeto/pasta/arquivo_${i}.html`, `<h1>Arquivo ${i}</h1>`);
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('Zip buffer size:', (zipBuffer.length / 1024).toFixed(1), 'KB');

  const b64 = zipBuffer.toString('base64');
  console.log('Base64 string length:', (b64.length / 1024).toFixed(1), 'KB');

  // Simular descompactação no servidor Node.js
  const serverZip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const entries = Object.keys(serverZip.files).filter(k => !serverZip.files[k].dir);
  console.log('Total entries extracted on server:', entries.length);
}

testNodeZip();
