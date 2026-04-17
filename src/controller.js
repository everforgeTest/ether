const ServiceTypes = require('./Constants/ServiceTypes');
const { ToDoController } = require('./Controllers/ToDo.Controller');
const { UpgradeController } = require('./Controllers/Upgrade.Controller');

class Controller {
  async handleRequest(user, message, isReadOnly) {
    let result = {};
    try {
      const service = message.Service || message.service;
      if (service === ServiceTypes.UPGRADE) {
        message.userPubKey = user.pubKey;
        const up = new UpgradeController(message);
        result = await up.handleRequest();
      } else if (service === ServiceTypes.TODO) {
        const td = new ToDoController(message);
        result = await td.handleRequest();
      } else {
        result = { error: { code: 400, message: 'Unknown service.' } };
      }
    } catch (e) {
      result = { error: { code: 500, message: e.message || 'Server error.' } };
    }

    if (isReadOnly) {
      await user.send(result);
    } else {
      const out = message.promiseId ? { promiseId: message.promiseId, ...result } : result;
      await user.send(out);
    }
  }
}

module.exports = { Controller };
