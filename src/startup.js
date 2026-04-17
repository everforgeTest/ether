const HotPocket = require('hotpocket-nodejs-contract');
const { Controller } = require('./controller');
const { DBInitializer } = require('./Data.Deploy/initDB');
const { SharedService } = require('./Services/Common.Services/SharedService');
const Tables = require('./Constants/Tables');
const settings = require('./settings.json').settings;
const { default: DB } = require('./Services/Common.Services/dbHandler');

const contract = async (ctx) => {
  console.log('Contract is running.');
  SharedService.context = ctx;

  if (!ctx.readonly) {
    ctx.unl.onMessage((node, msg) => {
      try {
        const obj = JSON.parse(msg.toString());
        if (obj && obj.type) {
          SharedService.nplEventEmitter.emit(obj.type, node, msg);
        }
      } catch (e) {
        // ignore malformed npl messages
      }
    });
  }

  try {
    await DBInitializer.init();
  } catch (e) {
    console.error('DB init error:', e);
  }

  const db = new DB.SqliteDatabase(settings.dbPath);
  try {
    db.open();
    let row = await db.getLastRecord(Tables.CONTRACTVERSION);
    row = row || { Version: 1.0 };
    console.log('Current contract version:', row.Version);
  } catch (e) {
    console.log('Error while getting contract version', e);
  } finally { db.close(); }

  const controller = new Controller();

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try { message = JSON.parse(buf); } catch (e) {
        try { message = JSON.parse(buf.toString('utf8')); } catch (_) { message = {}; }
      }
      await controller.handleRequest(user, message, ctx.readonly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract);
