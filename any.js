/*
TODO: Use Angular Resource.
TODO: Group with subtasks.
TODO: Allow task editing [checking, deleting].
TODO: Display due date.
TODO: Fix animation?
*/

var any = angular.module('any', []);
any.SERVER = 'https://sm-prod.any.do'
any.LOGIN_URL = any.SERVER + '/j_spring_security_check';
any.TASKS_URL = any.SERVER + '/me/tasks';
any.TASK_URL = any.SERVER + '/me/tasks/';
any.TASK_PARAMS = '?responseType=flat&includeDeleted=false&includeDone=false';



/**
 * Controls listing and marking tasks.
 */
any.TasksCtrl = function($scope, Any) {
  $scope.tasks = Any.getTasks();
  $scope.tasks.then(function() {
    $scope.loaded = true;
  });
  $scope.markDone = function(task) {
    Any.markDone(task.globalTaskId);
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
 * Interacts with the Any.Do API server.
 */
any.Any = function($http, $q, Config) {
  this.http = $http;
  this.q = $q;
  this.config = Config;
  this.tasks = null;
  this.tasksById = {};
};
any.service('Any', any.Any);


any.Any.prototype.login = function() {
  if (this.loggedIn) {
    return this.q.when(true);
  }
  var data = ('j_username=' + this.config.email +
              '&j_password=' + this.config.password +
              '&_spring_security_remember_me=on');
  var self = this;
  return this.http({
    url: any.LOGIN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: data
  }).then(function() {
    self.loggedIn = true;
    return true;
  });

};


any.Any.prototype.markDone = function(globalTaskId, done) {
  done = angular.isDefined(done) ? done : true;
  var url = any.TASK_URL + globalTaskId + any.TASK_PARAMS;
  var task = this.tasksById[globalTaskId];
  task.status = done ? 'CHECKED' : 'UNCHECKED';
  return this.http.put(url, task);
};


any.Any.prototype.refreshTasks = function() {
  var url = any.TASKS_URL + any.TASK_PARAMS;
  var self = this;
  return this.tasks = this.http.get(url).then(function(data) {
    angular.forEach(data.data, function(task) {
      self.tasksById[task.globalTaskId] = task;
    });
    return data.data;
  }, function() {
    return self.login().then(function() {
      return self.refreshTasks();
    })
  });
};


any.Any.prototype.getTasks = function() {
  if (this.tasks) {
    return this.tasks;
  }
  return this.refreshTasks();
};
