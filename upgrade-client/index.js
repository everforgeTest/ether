/*
Usage:
node index.js wss://localhost:8081 ./path/to/upgrade.zip <privateKey-not-used> <version> "description"
Note: Private key arg is kept for compatibility but client keypair is generated automatically.
*/
const fs = require('fs');
const path = require('path');
const ContractService = require('./contract-service');

const contractUrl = process.argv[2];
const filepath = process.argv[3];
const version = process.argv[5] || process.argv[4];
const description = process.argv[6] || '';

(async () => {
  if (!contractUrl || !filepath || !version) {
    console.error('Usage: node index.js <contractUrl> <zipFilePath> <privateKey-ignored> <version> <description>');
    process.exit(1);
  }
  const abs = path.resolve(filepath);
  if (!fs.existsSync(abs)) { console.error('File not found:', abs); process.exit(1); }

  const svc = new ContractService([contractUrl]);
  await svc.init();

  const zipBuf = fs.readFileSync(abs);
  const sig = await svc.sign(zipBuf); // Ed25519 detached signature

  const payload = {
    Service: 'Upgrade',
    Action: 'UpgradeContract',
    data: {
      version: parseFloat(version),
      description: description,
      zipBase64: zipBuf.toString('base64'),
      zipSignatureHex: Buffer.from(sig).toString('hex')
    }
  };

  await svc.submitInput(payload);
  console.log('Upgrade submission sent.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
