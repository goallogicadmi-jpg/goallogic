import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const html = await get('https://goallogic.vercel.app/');
const match = html.match(/assets\/index-[^"']+\.js/);
if (!match) {
  console.log('No index bundle found');
  process.exit(1);
}
const js = await get(`https://goallogic.vercel.app/${match[0]}`);
console.log('bundle:', match[0]);
console.log('pago-exitoso:', js.includes('pago-exitoso'));
console.log('pago-cancelado:', js.includes('pago-cancelado'));
