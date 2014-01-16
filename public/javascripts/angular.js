var myApp = angular.module('myApp', ['ngRoute', 'ngResource']).
	config(['$routeProvider', function($routeProvider) {
		$routeProvider.
			when('/', {
				templateUrl: '/partials/singles.html',
				controller: 'singlesCtrl'
			}).
			when('/doubles', {
				templateUrl: 'partials/doubles.html',
				controller: 'doublesCtrl'
			}).
			otherwise({
				redirectTo: '/'
			});
	}]);


myApp.controller('singlesCtrl', function($scope) {
	console.log('singles');
});

myApp.controller('doublesCtrl', function($scope) {
	console.log('doubles');

});