const { UpgradeService } = require('../Services/Common.Services/Upgrade.Service');
const ContractResponseTypes = require('../Constants/ContractResponseTypes');
const nacl = require('tweetnacl');

function isMaintainer(userPubKeyHex) {
  const expected = (process.env.MAINTAINER_PUBKEY || '').toLowerCase();
  if (!expected || expected.length === 0) return false;
  return (userPubKeyHex || '').toLowerCase() === expected;
}

class UpgradeController {
  constructor(message) {
    this.message = message;
    this.service = new UpgradeService(message);
  }

  async handleRequest() {
    try {
      switch (this.message.Action) {
        case 'UpgradeContract':
          return await this.#handleUpgrade();
        default:
          return { error: { code: ContractResponseTypes.BAD_REQUEST, message: 'Invalid action.' } };
      }
    } catch (err) {
      return { error: { code: err.code || ContractResponseTypes.INTERNAL_SERVER_ERROR, message: err.message || 'Upgrade failed.' } };
    }
  }

  async #handleUpgrade() {
    const userPubKey = this.message.userPubKey;
    if (!isMaintainer(userPubKey)) {
      return { error: { code: ContractResponseTypes.UNAUTHORIZED, message: 'Unauthorized' } };
    }

    const payload = this.message.data || {};
    const { version, description, zipBase64, zipSignatureHex } = payload;
    if (!version || !zipBase64 || !zipSignatureHex) {
      return { error: { code: ContractResponseTypes.BAD_REQUEST, message: 'Missing upgrade data.' } };
    }

    // Verify Ed25519 detached signature
    const zipBuf = Buffer.from(zipBase64, 'base64');
    const sigBuf = Buffer.from(zipSignatureHex, 'hex');
    const pubBuf = Buffer.from(userPubKey, 'hex');

    const ok = nacl.sign.detached.verify(new Uint8Array(zipBuf), new Uint8Array(sigBuf), new Uint8Array(pubBuf));
    if (!ok) {
      return { error: { code: ContractResponseTypes.UNAUTHORIZED, message: 'Invalid signature.' } };
    }

    return await this.service.upgradeContract();
  }
}

module.exports = { UpgradeController };
