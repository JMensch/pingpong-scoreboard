/*==============================
=            CONFIG            =
==============================*/
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
			when('/login', {
				templateUrl: 'partials/login',
				controller: 'loginCtrl'
			}).
			otherwise({
				redirectTo: '/login'
			});
	$locationProvider.html5Mode(true);
	}])
	.run(function ($rootScope, authService, $location) {   
		if (authService.auth()) {
			$location.path('/singles');
		}
	});
/*===================================
=            CONTROLLERS            =
===================================*/
myApp.controller('mainCtrl', function($scope, $location) {
    $scope.isActive = function(route) {
        return route === $location.path();
    };
});
myApp.controller('singlesCtrl', function($scope, $http, $location, chartFactory) {
	var json_data = JSON.stringify({user_id: JSON.parse(localStorage['user_id'])});
	$http({
    	method: 'POST',
    	data: json_data,
      	url: '/api/user_info'
    }).
    success(function (data, status, headers, config) {
    	if (!$.isEmptyObject(data)) {
	      	var user_data = data.data.user_data;
	      	var games = data.data.games;
	      	var index,
	      		chart_data = [],
	      		bar_data = [];
    			$scope.chart = [],
    			$scope.chart_error,
	      		user_id = localStorage['user_id'];
	      	$scope.total_players = user_data.length;
	      	var total_games = games.length;
	      	/**
	      	* Build sparkline data
	      	**/
	      	for (var x=0, y=games.length; /*x < y &&*/ x < 20; x++) {
	      		if (games[x]) {
		      		var outcome = (games[x].outcome) ? 1 : -1;
		      		var outcome_text = (games[x].outcome) ? 'Win' : 'Loss';
		      		bar_data.push([""+outcome_text+"<br/>vs "+games[x].opponent+"<br/>"+games[x].timestamp, outcome]);
		      	//for testing
	      		} else {
	      			if (x % 2) {
	      				var outcome = 1,
	      					outcome_text = "Win";
	      			} else {
	      				var outcome = -1,
	      					outcome_text = "Loss";
	      			}
	      			bar_data.push([""+outcome_text+"<br/>vs "+bar_data[x-1].opponent+"<br/>"+bar_data[x-1].timestamp, outcome]);
	      		}
	      	}
	      	chartFactory.insertBars(bar_data);
	      	/**
	      	* Build table
	      	**/
	  		for(var i=0, j=user_data.length; i < j; i++) {
	  			if (JSON.stringify(user_data[i]._id) == user_id) {
	  				index = i;
	  				//user is ranked first
	  				if (index == 0) {
						//user data
	  					$scope.chart[0] = user_data[i];
	  					$scope.chart[0]['rank'] = i+1;
		  				$scope.chart[0]['highlight_me'] = true;
		  				$scope.rank = i+1;
						$scope.total_wins = user_data[i].total_wins;
	      				$scope.total_losses = user_data[i].total_losses;
	      				$scope.total_win_pct = user_data[i].total_win_pct.toPrecision(3);

	      				//1 rank below user
	      				$scope.chart[1] = user_data[i+1];
	      				$scope.chart[1]['rank'] = i+2;

	      				//2 ranks below user
	      				$scope.chart[2] = user_data[i+2];
	      				$scope.chart[2]['rank'] = i+3;	  					
	  				//if user is last
	  				} else if (index == j-1) {
	  					//user data
	  					$scope.chart[2] = user_data[i];
	  					$scope.chart[2]['rank'] = i+1;
		  				$scope.chart[2]['highlight_me'] = true;
		  				$scope.rank = i+1;
						$scope.total_wins = user_data[i].total_wins;
	      				$scope.total_losses = user_data[i].total_losses;
	      				$scope.total_win_pct = user_data[i].total_win_pct.toPrecision(3);

	      				//1 rank above user
	      				$scope.chart[1] = user_data[i-1];
	      				$scope.chart[1]['rank'] = i;

	      				//2 ranks above user
	      				$scope.chart[0] = user_data[i-2];
	      				$scope.chart[0]['rank'] = i-1;
	  				} else {
						//player 1 rank ahead of user
		  				$scope.chart[0] = user_data[i-1];
		  				$scope.chart[0]['rank'] = i;

		  				//user
		  				$scope.chart[1] = user_data[i];
		  				$scope.chart[1]['rank'] = i+1;
		  				$scope.chart[1]['highlight_me'] = true;
		  				$scope.rank = i+1;
						$scope.total_wins = user_data[i].total_wins;
	      				$scope.total_losses = user_data[i].total_losses;
	      				$scope.total_win_pct = user_data[i].total_win_pct.toPrecision(3);
	      		
		  				//previous rank player
		  				$scope.chart[2] = user_data[i+1];
		  				$scope.chart[2]['rank'] = i+2;
	  				}
	  			} 
	  		}
	  		if (isNaN(index)) {
	  			$scope.chart_error = 'There was an error loading score data.';	
	  		}
	  		console.log($scope.chart);
	  		/**
	      	* Build pie chart data
	      	**/
	      	var opponents = _.uniq(_.pluck(games, 'opponent'));
	      	_.each(opponents, function (opponent) { chart_data.push({ name: opponent, wins: 0, losses: 0 })});
	      	_.each(games, function (game) {
	      		var index = _.find(chart_data, function (player) { return player.name == game.opponent });
	      		//if game was a win
	      		if (game.outcome) {
	      			index.wins = index.wins + 1;
	      		} else {
	      			index.losses = index.losses + 1;
	      		}
	      	});
	      	//calculate win percentage
	      	_.each(chart_data, function (opponent) { 
	      		for (var a=0,b=$scope.chart.length; a < b; a++) {
	      			if ($scope.chart[a]['username'] == opponent.name) {
	      				var win_pct = opponent.wins / (opponent.wins + opponent.losses);
	      				$scope.chart[a]['win_pct'] = win_pct.toPrecision(3);
	      			}
	      		}
	      		opponent.y = opponent.wins / total_games;
	      	});
	      	var max = _.max(chart_data, function (opponent) { return opponent.y });
	      		max.sliced = true,
	      		max.selected = true;
	      		console.log(chart_data);
	      	chartFactory.insertPie(chart_data);
    	} else {
    		$scope.total_wins = 'Error!';
    	}
    }).
    error(function (data, status, headers, config) {
      	$scope.total_wins = 'Error!'
    });
});

myApp.controller('doublesCtrl', function($scope, $http, $location) {
});

myApp.controller('modalCtrl', function($scope, $http, $location) {
});

myApp.controller('loginCtrl', function($scope, $http, $location) {
	$scope.login = function(user) {
		var json_data = JSON.stringify(user);
		$http({
			method: 'POST',
			data: json_data,
			url: '/api/login'
		}).
		success(function (data, status) {
			if (!$.isEmptyObject(data)) {
				if (Modernizr.localstorage) {
					localStorage['user_id'] = JSON.stringify(data.user_id);
					$location.path("/singles");
				} else {
					$scope.login_error = "Please upgrade your browser.";
				}
			} else {
				$scope.login_error = "There was an error. Please try again later.";
			}
		}).
		error(function (data, status) {
			$scope.login_error = "There was an error. Please try again later.";
		});
	};
});

myApp.service('authService', function() {
	this.auth = function() {
		if (Modernizr.localstorage && localStorage.user_id) {
			return true;
		} else {
			return false;
		}
	};
});

myApp.factory('chartFactory', function() {
	return {
		insertPie: function(chart_data) {
			// Radialize the colors
			Highcharts.getOptions().colors = Highcharts.map(Highcharts.getOptions().colors, function(color) {
			    return {
			        radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 },
			        stops: [
			            [0, color],
			            [1, Highcharts.Color(color).brighten(-0.3).get('rgb')] // darken
			        ]
			    };
			});
			// Build the chart
	        $('#pie-chart').highcharts({
	            chart: {
	                plotBackgroundColor: null,
	                plotBorderWidth: null,
	                plotShadow: false
	            },
	            title: {
	                text: 'Percentage of Wins',
	            },
	            tooltip: {
	        	    pointFormat: '{series.name}: <b>{point.percentage:.0f}%</b>',
	        	    positioner: function() {
	        	    	return { x: 60, y: 190 };
	        	    }
	            },
	            colors: [
	            	'#F05824',
	            	'#F09624',
	            	'#1F6999',
	            	'#19A763',
	            	'#9C310C',
	            	'#F8C484',
	            	'#72A9CC',
	            	'#70D3A4'
	            ],
	            credits: {
	            	enabled: false
	            },
	            plotOptions: {
	                pie: {
	                    allowPointSelect: true,
	                    cursor: 'pointer',
	                    dataLabels: {
	                        enabled: false,
	                        color: '#000000',
	                        connectorColor: '#000000',
	                        formatter: function() {
	                            return '<b>'+ this.point.name +'</b>: '+ this.percentage +' %';
	                        }
	                    }
	                }
	            },
	            series: [{
	                type: 'pie',
	                name: 'Win %',
	                data: chart_data
	            }]
	        });
		},
		insertBars: function(bar_data) {
			$(function () {
		        $('#sparkline').highcharts({
		            chart: {
		                type: 'column'
		            },
		            title: {
		                text: 'Recent Games'
		            },
		            tooltip: {
		                headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
		                pointFormat: ''
		            },
		            plotOptions: {
		                series: {           
		                    pointPadding: 0,
		                    groupPadding: 0,
		                    borderWidth: 0,
		                    pointWidth: 35
		                }
		            },
                        // legend: {
                        //     enabled: true,
                        //     layout: 'vertical',
                        //     align: 'right',
                        //     verticalAlign: 'top',
                        //     x: 10,
                        //     y: 100,
                        //     borderWidth: 0
                        // },
		            xAxis: {  
		            	min: 0,
		            	max: 19,          
		               gridLineWidth: 0,
		               minorGridLineWidth: 0,
		               lineColor: 'transparent',                        
		               labels: {
		                   enabled: false
		               },
		               minorTickLength: 0,
		               tickLength: 0,
		               title : {
		                    text : null
		                }
		            },
		            yAxis: {
		               gridLineWidth: 0,
		               lineWidth: 1,
		                plotLines: [{
                			color: '#ababab',
                			width: 1,
                			value: 0
            			}],
		               minorGridLineWidth: 0,
		               lineColor: 'transparent',                        
		               labels: {
		                   enabled: false
		               },
		               minorTickLength: 0,
		               tickLength: 0,
		               title : {
		                    text : null
		                }
		            },
		            legend: {
		                enabled: false
		            },
		            credits: {
		                enabled: false
		            },
		            series: [{
		                name: null,
		                //visible: false,
		                data: bar_data.reverse(),
		                color: '#F05924',
		                negativeColor: '#555',
		            }]
		        });
		    });
		}
	};
});