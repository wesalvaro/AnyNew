/*
TODO: Group with subtasks.
TODO: Allow task editing [checking, deleting].
TODO: Display due date.
TODO: Fix animation?
*/

var any = angular.module('any', ['ngResource']);
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
any.Do = function(Any) {
  return {
    restrict: 'E',
    replace: true,
    scope: {},
    templateUrl: 'do.html',
    link: function($scope) {
      Any.getTasks().then(function(tasks) {
        $scope.loaded = true;
        $scope.tasks = tasks;
      });
    }
  };
};
any.directive('anyDo', any.Do);



any.Task = function() {
  return {
    restrict: 'E',
    templateUrl: 'task.html',
    replace: true,
    scope: {
      task: '=value'
    },
    link: function($scope) {
      $scope.$watch('task.status', function(status) {
        $scope.done = status == 'CHECKED';
      });
      $scope.$watch('task.priority', function(priority) {
        $scope.priority = priority == 'High';
      });
      $scope.toggleDone = function(task) {
        if (any.isTaskDone(task)) {
          task.$uncheck();
        } else {
          task.$check();
        }
      };
    }
  };
};
any.directive('task', any.Task);



/**
 * Controls login information.
 */
any.Config = function($window, Config, User) {
  return {
    restrict: 'E',
    templateUrl: 'config.html',
    scope: {},
    link: function($scope) {
      $scope.config = Config;
      $scope.login = function() {
        Config.save();
        User.login($scope.config).then(function() {
          $window.location.reload();
        });
      };
    }
  };
};
any.directive('config', any.Config);



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
  this.User = $resource(any.USER_URL, {}, {
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
  this.me = new this.User({
    email: Config.email,
    password: Config.password
  });
};
any.service('User', any.User);


any.User.prototype.login = function(config) {
  if (config) {
    this.me = new this.User(config);
  }
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
