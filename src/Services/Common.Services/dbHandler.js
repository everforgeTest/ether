const sqlite3 = require('sqlite3').verbose();
const { SharedService } = require('./SharedService');

const DataTypes = { TEXT: 'TEXT', INTEGER: 'INTEGER', NULL: 'NULL' };

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.openConnections = 0;
    this.db = null;
  }

  open() {
    if (this.openConnections <= 0) {
      this.db = new sqlite3.Database(this.dbFile);
      this.openConnections = 1;
    } else this.openConnections++;
  }

  close() {
    if (this.openConnections <= 1) {
      if (this.db) this.db.close();
      this.db = null;
      this.openConnections = 0;
    } else this.openConnections--;
  }

  runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  runSelectQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  async getLastRecord(tableName) {
    const q = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(q, (err, row) => {
        if (err) return reject(err.message);
        resolve(row);
      });
    });
  }

  async insertValue(table, value) { return this.insertValues(table, [value]); }

  async insertValues(tableName, values) {
    if (!values.length) return { lastId: 0, changes: 0 };
    const columns = Object.keys(values[0]);
    let rowValueStr = '';
    const params = [];
    for (const row of values) {
      rowValueStr += '(' + columns.map(() => '?').join(',') + '),';
      columns.forEach(c => params.push(row[c] ?? null));
    }
    rowValueStr = rowValueStr.slice(0, -1);
    const q = `INSERT INTO ${tableName}(${columns.join(',')}) VALUES ${rowValueStr}`;
    return this.runQuery(q, params);
  }

  async updateValue(tableName, value, filter = null) {
    const setCols = Object.keys(value);
    const setStr = setCols.map(c => `${c} = ?`).join(',');
    const vals = setCols.map(c => value[c] ?? null);
    let filStr = '1';
    if (filter) {
      const fCols = Object.keys(filter);
      filStr = fCols.map(c => `${c} = ?`).join(' AND ');
      fCols.forEach(c => vals.push(filter[c] ?? null));
    }
    const q = `UPDATE ${tableName} SET ${setStr} WHERE ${filStr}`;
    return this.runQuery(q, vals);
  }

  async deleteValues(tableName, filter = null) {
    let vals = [];
    let filStr = '1';
    if (filter) {
      const fCols = Object.keys(filter);
      filStr = fCols.map(c => `${c} = ?`).join(' AND ');
      fCols.forEach(c => vals.push(filter[c] ?? null));
    }
    const q = `DELETE FROM ${tableName} WHERE ${filStr}`;
    return this.runQuery(q, vals);
  }

  async findById(tableName, id) {
    const q = `SELECT * FROM ${tableName} WHERE Id = ?`;
    return new Promise((resolve, reject) => {
      this.db.get(q, [id], (err, row) => {
        if (err) return reject(err.message);
        resolve(row);
      });
    });
  }
}

module.exports = { default: { SqliteDatabase, DataTypes }, SqliteDatabase, DataTypes };
