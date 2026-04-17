const Tables = require('../../Constants/Tables');
const { default: DB } = require('../Common.Services/dbHandler');
const settings = require('../../settings.json').settings;

class ToDoService {
  constructor(message) {
    this.message = message;
    this.db = new DB.SqliteDatabase(settings.dbPath);
  }

  async createToDo() {
    const res = {};
    try {
      this.db.open();
      const d = this.message.data || {};
      const todo = {
        Title: d.title,
        Description: d.description || '',
        Status: d.status || 'Pending',
        Priority: d.priority || 'Medium',
        DueDate: d.dueDate || null,
        ConcurrencyKey: '0x' + Math.random().toString(16).slice(2, 10)
      };
      const r = await this.db.insertValue(Tables.TODO, todo);
      res.success = { id: r.lastId };
      return res;
    } finally {
      this.db.close();
    }
  }

  async getToDoById() {
    const res = {};
    try {
      this.db.open();
      const id = this.message.data && this.message.data.id;
      const row = await this.db.findById(Tables.TODO, id);
      if (!row) return { error: { code: 404, message: 'Not found.' } };
      res.success = {
        id: row.Id,
        title: row.Title,
        description: row.Description,
        status: row.Status,
        priority: row.Priority,
        dueDate: row.DueDate,
        createdOn: row.CreatedOn,
        lastUpdatedOn: row.LastUpdatedOn
      };
      return res;
    } finally { this.db.close(); }
  }

  async getAllToDos() {
    const res = {};
    try {
      this.db.open();
      const rows = await this.db.runSelectQuery(`SELECT * FROM ${Tables.TODO}`);
      res.success = rows.map(r => ({
        id: r.Id,
        title: r.Title,
        description: r.Description,
        status: r.Status,
        priority: r.Priority,
        dueDate: r.DueDate,
        createdOn: r.CreatedOn,
        lastUpdatedOn: r.LastUpdatedOn
      }));
      return res;
    } finally { this.db.close(); }
  }

  async updateToDo() {
    const res = {};
    try {
      this.db.open();
      const d = this.message.data || {};
      const id = d.id;
      const toUpdate = {};
      if (d.title !== undefined) toUpdate.Title = d.title;
      if (d.description !== undefined) toUpdate.Description = d.description;
      if (d.status !== undefined) toUpdate.Status = d.status;
      if (d.priority !== undefined) toUpdate.Priority = d.priority;
      if (d.dueDate !== undefined) toUpdate.DueDate = d.dueDate;
      if (Object.keys(toUpdate).length === 0) return { error: { code: 400, message: 'No fields to update.' } };
      const r = await this.db.updateValue(Tables.TODO, toUpdate, { Id: id });
      res.success = { changes: r.changes };
      return res;
    } finally { this.db.close(); }
  }

  async deleteToDo() {
    const res = {};
    try {
      this.db.open();
      const id = this.message.data && this.message.data.id;
      const r = await this.db.deleteValues(Tables.TODO, { Id: id });
      res.success = { changes: r.changes };
      return res;
    } finally { this.db.close(); }
  }
}

module.exports = { ToDoService };
