const { ToDoService } = require('../Services/Domain.Services/ToDo.Service');

class ToDoController {
  constructor(message) {
    this.message = message;
    this.service = new ToDoService(message);
  }

  async handleRequest() {
    try {
      switch (this.message.Action) {
        case 'CreateToDo':
          return await this.service.createToDo();
        case 'GetToDoById':
          return await this.service.getToDoById();
        case 'GetAllToDos':
          return await this.service.getAllToDos();
        case 'UpdateToDo':
          return await this.service.updateToDo();
        case 'DeleteToDo':
          return await this.service.deleteToDo();
        default:
          return { error: { code: 400, message: 'Invalid action.' } };
      }
    } catch (e) {
      return { error: { code: 500, message: e.message || 'Server error.' } };
    }
  }
}

module.exports = { ToDoController };
