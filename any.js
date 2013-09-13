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
any.TASK_URL = any.SERVER + '/me/tasks';
any.TASK_PARAMS = '?responseType=flat&includeDeleted=false&includeDone=false';



any.TasksCtrl = function($scope, Any) {
  $scope.tasks = Any.getTasks();
  $scope.tasks.then(function() {
    $scope.loaded = true;
  });
};
any.controller('TasksCtrl', any.TasksCtrl);



any.ConfigCtrl = function($scope, Config, Any) {
  $scope.config = Config;
  $scope.login = function() {
    Config.save();
    Any.login();
  }
};
any.controller('ConfigCtrl', any.ConfigCtrl);



any.Config = function() {
  this.email = localStorage.getItem('email');
  this.password = localStorage.getItem('password');
};
any.service('Config', any.Config);


any.Config.prototype.save = function() {
  localStorage.setItem('email', this.email);
  localStorage.setItem('password', this.password);
};



any.Any = function($http, $q, Config) {
  this.http = $http;
  this.q = $q;
  this.config = Config;
};
any.service('Any', any.Any);


any.Any.prototype.login = function() {
  if (this.loggedIn) {
    return this.q.when(true);
  }
  data = ('j_username=' + this.config.email +
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

}


any.Any.prototype.getTasks = function() {
  this.login();
  var url = any.TASK_URL + any.TASK_PARAMS;
  return this.http.get(url).then(function(data) {
    return data.data;
  });
};
