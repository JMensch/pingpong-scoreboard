var myApp = angular.module('myApp', ['ngRoute', 'ngResource']).
	config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
		$routeProvider.
			when('/singles', {
				templateUrl: 'partials/singles',
				controller: 'singlesCtrl'
			}).
			when('/doubles', {
				templateUrl: 'partials/doubles',
				controller: 'doublesCtrl'
			}).
			otherwise({
				redirectTo: '/'
			});
	$locationProvider.html5Mode(true);
	}]);

myApp.controller('singlesCtrl', function($scope) {
	console.log('singles');
});

myApp.controller('doublesCtrl', function($scope) {
	console.log('doubles');

});