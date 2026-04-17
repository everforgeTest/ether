const HotPocket = require('hotpocket-js-client');

class ContractService {
  constructor(servers) {
    this.servers = servers;
    this.userKeyPair = null;
    this.client = null;
  }

  async init() {
    if (!this.userKeyPair) this.userKeyPair = await HotPocket.generateKeys();
    if (!this.client) this.client = await HotPocket.createClient(this.servers, this.userKeyPair, { protocol: HotPocket.protocols.json });
    if (!await this.client.connect()) throw new Error('Connection failed.');
    return true;
  }

  async sign(buffer) {
    // HotPocket client provides a sign helper using the client's Ed25519 key
    return this.client.sign(buffer);
  }

  async submitInput(payload) {
    const buf = Buffer.from(JSON.stringify(payload));
    const input = await this.client.submitContractInput(buf);
    await input?.submissionStatus;
    return true;
  }

  async read(payload) {
    const buf = Buffer.from(JSON.stringify(payload));
    const out = await this.client.submitContractReadRequest(buf);
    return JSON.parse(out.toString());
  }
}

module.exports = ContractService;
