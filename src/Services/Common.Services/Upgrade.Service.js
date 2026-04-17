const fs = require('fs');
const ContractResponseTypes = require('../../Constants/ContractResponseTypes');
const Tables = require('../../Constants/Tables');
const { SharedService } = require('./SharedService');
const { default: DB } = require('./dbHandler');
const settings = require('../../settings.json').settings;

class UpgradeService {
  constructor(message) {
    this.message = message;
    this.db = new DB.SqliteDatabase(settings.dbPath);
  }

  async upgradeContract() {
    const resObj = {};
    try {
      const payload = this.message.data || {};
      const version = parseFloat(payload.version);
      const description = payload.description || '';
      const zipBase64 = payload.zipBase64;

      this.db.open();
      let current = await this.db.getLastRecord(Tables.CONTRACTVERSION);
      const currentVersion = current ? parseFloat(current.Version) : 1.0;
      if (!(version > currentVersion)) {
        return { error: { code: ContractResponseTypes.FORBIDDEN, message: 'Incoming version must be greater than current version.' } };
      }

      // Write zip file
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

      // Create post_exec.sh
      const script = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(settings.postExecutionScriptName, script);
      fs.chmodSync(settings.postExecutionScriptName, 0o777);

      // Record version
      const data = {
        Version: version,
        Description: description,
        CreatedOn: SharedService.getCurrentTimestamp(),
        LastUpdatedOn: SharedService.getCurrentTimestamp()
      };
      const inserted = await this.db.insertValue(Tables.CONTRACTVERSION, data);

      resObj.success = { message: 'Contract upgraded', id: inserted.lastId, version };
      return resObj;
    } catch (e) {
      return { error: { code: ContractResponseTypes.INTERNAL_SERVER_ERROR, message: e.message || 'Failed to upgrade contract.' } };
    } finally {
      this.db.close();
    }
  }
}

module.exports = { UpgradeService };
