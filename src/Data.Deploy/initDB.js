const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { SharedService } = require('../Services/Common.Services/SharedService');
const Tables = require('../Constants/Tables');
const settings = require('../settings.json').settings;

class DBInitializer {
  static #db = null;

  static async init() {
    if (!fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);
      await this.#runQuery('PRAGMA foreign_keys = ON');

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
        Id INTEGER,
        Version FLOAT NOT NULL,
        Description TEXT,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.SQLSCRIPTMIGRATIONS} (
        Id INTEGER,
        Sprint TEXT NOT NULL,
        ScriptName TEXT NOT NULL,
        ExecutedTimestamp TEXT,
        ConcurrencyKey TEXT,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.TODO} (
        Id INTEGER,
        Title TEXT NOT NULL,
        Description TEXT,
        Status TEXT DEFAULT 'Pending',
        Priority TEXT DEFAULT 'Medium',
        DueDate DATETIME,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        ConcurrencyKey TEXT,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      this.#db.close();
    }

    if (fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);
      const scriptRoot = path.join(process.cwd(), 'dist', 'dbScripts');
      if (fs.existsSync(scriptRoot)) {
        const sprintFolders = fs.readdirSync(scriptRoot).filter(f => f.startsWith('Sprint_')).sort();
        for (const folder of sprintFolders) {
          const folderPath = path.join(scriptRoot, folder);
          const sqlFiles = fs.readdirSync(folderPath).filter(f => /^\d+_.+\.sql$/.test(f)).sort();
          for (const file of sqlFiles) {
            const exists = await this.#getRecord(`SELECT 1 FROM ${Tables.SQLSCRIPTMIGRATIONS} WHERE Sprint = ? AND ScriptName = ?`, [folder, file]);
            if (!exists) {
              const src = fs.readFileSync(path.join(folderPath, file), 'utf8');
              const stmts = src.split(';').map(s => s.trim()).filter(s => s);
              for (const s of stmts) await this.#runQuery(s);
              await this.#runQuery(`INSERT INTO ${Tables.SQLSCRIPTMIGRATIONS}(Sprint, ScriptName, ExecutedTimestamp, ConcurrencyKey) VALUES (?,?,?,?)`, [folder, file, SharedService.getCurrentTimestamp(), SharedService.generateConcurrencyKey()]);
            }
          }
        }
      }
      this.#db.close();
    }
  }

  static #runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.#db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  static #getRecord(query, filters = []) {
    return new Promise((resolve, reject) => {
      this.#db.get(query, filters, (err, row) => {
        if (err) return reject(err.message);
        resolve(row);
      });
    });
  }
}

module.exports = { DBInitializer };
