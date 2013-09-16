/*
TODO: Group with subtasks.
TODO: Allow task editing [checking, deleting].
TODO: Display due date.
TODO: Fix animation?
*/

var any = angular.module('any', ['ngAnimate', 'ngResource']);
any.SERVER = 'https://sm-prod.any.do'
any.LOGIN_URL = any.SERVER + '/j_spring_security_check';
any.USER_URL = any.SERVER + '/me';
any.TASKS_URL = any.SERVER + '/me/tasks';
any.TASK_URL = any.SERVER + '/me/tasks/';
any.TASK_PARAMS = '?responseType=flat&includeDeleted=false&includeDone=false';


any.Status = {
  DONE: 'CHECKED',
  NOT_DONE: 'UNCHECKED'
};


any.isTaskDone = function(task) {
  return task.status == any.Status.DONE;
};



/**
 * Controls listing and marking tasks.
 */
any.TasksCtrl = function($scope, Any) {
  $scope.tasks = Any.getTasks();
  $scope.tasks.then(function() {
    $scope.loaded = true;
  });
  $scope.toggleDone = function(task) {
    if (any.isTaskDone(task)) {
      task.$uncheck();
    } else {
      task.$check();
    }
  };
};
any.controller('TasksCtrl', any.TasksCtrl);



/**
 * Controls login information.
 */
any.ConfigCtrl = function($scope, $window, Config, Any) {
  $scope.config = Config;
  $scope.login = function() {
    Config.save();
    Any.login().then(function() {
      $window.location.reload();
    });
  }
};
any.controller('ConfigCtrl', any.ConfigCtrl);



/**
 * Stores login information in the local store.
 */
any.Config = function() {
  this.email = localStorage.getItem('email');
  this.password = localStorage.getItem('password');
};
any.service('Config', any.Config);


any.Config.prototype.save = function() {
  localStorage.setItem('email', this.email);
  localStorage.setItem('password', this.password);
};



/**
 * User interface for the Any.Do API server.
 */
any.User = function($resource, Config) {
  var User = $resource(any.USER_URL, {}, {
    get: {
      method: 'GET',
      params: {}
    },
    login: {
      method: 'POST',
      url: any.LOGIN_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        j_username: '@email',
        j_password: '@password',
        _spring_security_remember_me: 'on'
      }
    }
  });
  this.me = new User({
    email: Config.email,
    password: Config.password
  });
};
any.service('User', any.User);


any.User.prototype.login = function() {
  return this.me.$login(function(user) {
    user.loggedIn = true;
    user.$get().then(function() {
      console.log(user);
    });
  });
};



/**
 * Task interface for the Any.Do API server.
 */
any.Any = function($resource, User) {
  this.user = User;
  this.tasks = null;
  this.tasksById = {};
  this.Task = $resource(any.TASK_URL + ':id', {
    id: '@globalTaskId',
    responseType: 'flat',
    includeDeleted: false,
    includeDone: false
  }, {
    save: {method: 'PUT'},
    check: {
      method: 'PUT',
      transformRequest: function(task) {
        task.status = any.Status.DONE;
        return angular.toJson(task);
      }
    },
    uncheck: {
      method: 'PUT',
      transformRequest: function(task) {
        task.status = any.Status.NOT_DONE;
        return angular.toJson(task);
      }
    }
  });
};
any.service('Any', any.Any);


any.Any.prototype.refreshTasks = function() {
  this.tasks = this.Task.query();
  var self = this;
  return this.tasks.$promise.then(function(tasks) {
    angular.forEach(tasks, function(task) {
      self.tasksById[task.globalTaskId] = task;
    });
    return tasks;
  }, function() {
    // Failed: login and try again.
    return self.user.login().then(function() {
      return self.refreshTasks();
    });
  });
};


any.Any.prototype.getTasks = function() {
  return this.tasks || this.refreshTasks();
};
