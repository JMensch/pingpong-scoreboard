/*==============================
=            CONFIG            =
==============================*/ 
/**
* The angular instance
**/
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
      	$rootScope.location = $location;
      	if (authService.auth()) {
			$location.path('/singles');
		} else {
			$location.path('/login');
		}
	});
/*===================================
=            CONTROLLERS            =
===================================*/
/**
* Fallback controller
**/
myApp.controller('mainCtrl', function($scope, $location, $rootScope) {
    $scope.isActive = function(route) {
        return route === $location.path();
    };
    $scope.logout = function() {
    	if (Modernizr.localstorage) {
    		localStorage.clear();
		}	
		$scope = {};
		$rootScope = {};
		$location.path("/login");
    }
});
/**
* Main page controller
**/
myApp.controller('singlesCtrl', function($scope, $http, $location, chartFactory, $rootScope, timestampConverterService, scoreBuilder) {
	(init = function() {
		var json_data = JSON.stringify({user_id: JSON.parse(localStorage['user_id'])});
		$http({
	    	method: 'POST',
	    	data: json_data,
	      	url: '/api/user_info'
	    }).
	    success(function (data, status, headers, config) {
	    	console.log(data);
	    	if (!$.isEmptyObject(data)) {
		      	/**
		      	* General user information
		      	**/
		      	var user_data = data.data.user_data;
		      	var user_id = JSON.parse(localStorage['user_id']);
		      	var user = _.find(user_data, function (player) { return player._id == user_id });
		      	
		      	/**
		      	* Set top-level user data
		      	**/
		      	if (user) {
		      		$scope.display_name = user.username;
		      		$scope.elo = user.elo;
		      		$scope.total_wins = user.total_wins;
		      		$scope.total_losses = user.total_losses;
		      		$scope.win_rate = Math.round($scope.total_wins / ($scope.total_wins + $scope.total_losses) * 100) || 0;
		      		$scope.last_played;
		      	}	
		      	/**
		      	* Series & game data
		      	**/
		      	var games = data.data.games;

		      	if (games.length > 0) {
		      		$scope.last_played = timestampConverterService.convert(games[games.length-1].timestamp);	
		      	}			
		      	scoreBuilder.setUserInfo(user_id,games);
		      	scoreBuilder.build($scope, 'all-time');
		      	scoreBuilder.buildSidebar($scope, 'all-time');
		      	/**
		      	* Build player list for scores entry
		      	**/
		      	var temp = [];
		      	for(var i=0, j=user_data.length; i < j; i++) {
		      		if (user_data[i].username && user_data[i].username.length > 1) {
		      			temp.push({ name: user_data[i].username, id: user_data[i]._id, elo: user_data[i].elo });
		      		}
		      	}
		      	$rootScope.players_for_buttons_left = _(temp).sortBy('name');
		      	$rootScope.players_for_buttons_right = $rootScope.players_for_buttons_left.slice();
	    	} else {
	    		$rootScope.error_banner = 'There was a general application error. Please try again later.';
	    	}
	    }).
	    error(function (data, status, headers, config) {
	      	$scope.total_wins = 'Error!'
	    });
	})();
	$scope.timeChange = function(timeframe, $event) {
		scoreBuilder.build($scope, timeframe);
		scoreBuilder.buildSidebar($scope, timeframe);
		/**
		* TODO: do this in a less hacky way
		**/
		$('.timespan-select li').removeClass('active');
		var el = $event.target;
		$(el).parent().addClass('active');
	};
});
/**
* Controller for add games modal
**/
myApp.controller('modalCtrl', function($scope, $http, $location, eloService) {
	/**
	* current slider values
	**/
	$scope.slider_left = 0,
	$scope.slider_right = 0;
	/**
	* added game scores
	* [0] -> scores_left
	* [0] -> scores_right
	**/
	$scope.scores = [];
	/**
	* selected teammates
	* left == t1, right == t2
	**/
	$scope.selected_left = [];
	$scope.selected_right = [];
	/**
	* Team display name for chart
	**/
	$scope.team_header_left = '';
	$scope.team_header_right = '';
	/**
	* Pagination vars
	**/
	$scope.currPage = 0;
	$scope.currPage_right = 0;
	$scope.pageSize = 9; 
	/**
	* Default game length
	**/
	$scope.curr_game_type = 21;
	/**
	* Prevents settings from being changed mid-series
	**/
	var finalized = false;

	$("#slider-left").slider({ 
    	max: 30, 
    	min: 0, 
    	value: 0,
    	slide: function(event, ui) {
            $scope.slider_left = ui.value;
            $scope.$apply();
        },
        change: function(event, ui) {
            // $('#rateToPost').attr('value', ui.value);
        }
    });
    $("#slider-right").slider({ 
    	max: 30, 
    	min: 0, 
    	value: 0,
    	slide: function(event, ui) {
            $scope.slider_right = ui.value;
            $scope.$apply();
        },
        change: function(event, ui) { 
            // $('#rateToPost').attr('value', ui.value);
        }
    });
    /**
    * Handles player selections
    **/
	$scope.select = function(side, player) {
		if (finalized) {
			return false;
		}
		if (side == 'left') {
			var temp_player = _.find($scope.selected_left, function (item) { return item.id == player.id });
			if (temp_player) {
				$scope.selected_left = _.without($scope.selected_left, temp_player);
		    	$scope.team_header_left = $scope.selected_left.map(function (player) { return player.name; }).join(" ");
			} else {
		    	$scope.selected_left.push(player); 
		    	$scope.team_header_left = $scope.selected_left.map(function (player) { return player.name; }).join(" ");
			}
		} else {
			var temp_player = _.find($scope.selected_right, function (item) { return item.id == player.id });
			if (temp_player) {
				$scope.selected_right = _.without($scope.selected_right, temp_player);
		    	$scope.team_header_right = $scope.selected_right.map(function (player) { return player.name; }).join(" ");
			} else {
		    	$scope.selected_right.push(player); 
		    	$scope.team_header_right = $scope.selected_right.map(function (player) { return player.name; }).join(" ");
			}
		}
	};
	/**
	* Paginates players
	**/
	$scope.page = function(side, direction) {
		if (side == 'left') {
			if (direction == 'prev') {
				if ($scope.currPage == 0) {
					return false;
				} else {
					$scope.currPage = $scope.currPage-1;
				}
			} else {
				if ($scope.pageSize * ($scope.currPage+1) <  $scope.players_for_buttons_left.length) {
					$scope.currPage = $scope.currPage+1;
				} else {
					return false;
				}
			}
		} else {
			if (direction == 'prev') {
				if ($scope.currPage_right == 0) {
					return false;
				} else {
					$scope.currPage_right = $scope.currPage_right-1;
				}
			} else {
				if ($scope.pageSize * ($scope.currPage_right+1) < $scope.players_for_buttons_right.length) {
					$scope.currPage_right = $scope.currPage_right+1;
				} else {
					return false;
				}
			}
		}
	};
	/**
	* Player color on click handler
	**/
	$scope.itemClass = function(side, player) {
		if (side == 'left') {
	    	return _.find($scope.selected_left, function (item) { return item.id == player.id }) ? 'active' : '';
		} else {
	    	return _.find($scope.selected_right, function (item) { return item.id == player.id }) ? 'active' : '';
		}
	};
	/**
	* Adds game scores & teams to scores[]
	**/
    $scope.addGame = function() {  
    	if ($scope.selected_left.length == 0 || $scope.selected_right.length == 0) {
    		alert("Please choose at least one player for each team.");
    		return false;
    	}
    	if ($scope.slider_left == $scope.slider_right) {
    		alert("Tie games are not a valid score.");
    		return false;
    	}
    	if ($scope.scores.length > 9) { 
    		alert("The maximum number of games per series is 9.");
    		return false;
    	}
		finalized = true;
		$('.player-select-button:not(.active)').attr('disabled', 'disabled');
		// $('.series-switch-container .series:not(.active').attr('disabled', 'disabled');
		$scope.scores.push( { t1_score: $scope.slider_left, t2_score: $scope.slider_right, game_type: parseInt($scope.curr_game_type) });
    };
    /**
    * Pops game from scores[]
    **/
    $scope.removeGame = function(side) {
    	if ($scope.scores.length > 0 && $scope.scores.length > 0) {
    		$scope.scores.pop();
    		$scope.scores.pop();
    	}
    };
    /**
    * Submit game button handler
    **/
    $scope.submitGame = function() {
    	if ($scope.scores.length == 0 || $scope.selected_left.length == 0 || $scope.selected_right.length == 0 || !$scope.scores[0].t1_score || !$scope.scores[0].t2_score) {
    		return false;
    	}
    	$scope.prepareData();
    };
    /**
    * Transforms game data into DB-ready object
    * @param function $http
    **/
    $scope.prepareData = function() {
		var series = {},
			winner = [],
			loser = [],
			games = $scope.scores.slice();
    	/**
    	* Build object for DB insertion
    	**/
    	var t1_count = 0,
    		t2_count = 0;
    	_.each($scope.scores, function (game) {
    		(game.t1_score > game.t2_score) ? t1_count = t1_count+1 : t2_count = t2_count+1;
    	});
    	/**
    	* if t1 won
    	**/
    	if (t1_count > t2_count) {
    		winner = $scope.selected_left.slice();
    		loser = $scope.selected_right.slice();
    		_.each(games, function (game) {
    			game.winner_score = game.t1_score;
    			game.loser_score = game.t2_score;
    			delete(game.t1_score);
    			delete(game.t2_score);
    		});
    	} else {
    		winner = $scope.selected_right.slice();
    		loser = $scope.selected_left.slice();
    		_.each(games, function (game) {
    			game.winner_score = game.t2_score;
    			game.loser_score = game.t1_score;
    			delete(game.t1_score);
    			delete(game.t2_score);
    		});
    	}
    	/**
    	* Add created arrays to series object
    	**/
    	series.winner = winner; 
		series.loser = loser;
    	series.games = games;
    	/**
    	* Mongo doesn't like inserting these
    	**/
    	_.each(series.winner, function (player) {
    		delete player.$$hashKey;
    	});
    	_.each(series.loser, function (player) {
    		delete player.$$hashKey;
    	});
    	$scope.calculateElo(series);
    };
    /**
    * Calculates elo
    * @param object scores
    * @param function $http
    **/
    $scope.calculateElo = function(series) {
    	var team1 = series.winner;
    	var team2 = series.loser;
    	var expected_scores = eloService.getExpectedElo(team1, team2);
    	/**
    	* expected_scores returns false if error or team.length > 2
    	**/
    	if (expected_scores) {
	    	/**
	    	* Get new ELO ratings
	    	**/
	    	var new_rating = eloService.getNewElo(team1, team2, series.games, expected_scores);
    		$scope.testElo(team1, team2, new_rating);
	    	/**
	    	* If doubles game
	    	**/
	    	if (new_rating.team1.length > 1) {
	    		series.winner[0].elo.rating = new_rating.team1[0];
	    		series.winner[1].elo.rating = new_rating.team1[1];
	    		series.loser[0].elo.rating = new_rating.team2[0];
	    		series.loser[1].elo.rating = new_rating.team2[1];		
	    	} else if (new_rating.team1.length == 1) {
	    		series.winner[0].elo.rating = new_rating.team1[0];
	    		series.loser[0].elo.rating = new_rating.team2[0];
	    	}
    	}
    	var series_final = eloService.getNewKFactor(series);
    	/**
    	* $http call with series scores
    	**/
    	$scope.insertScores(series_final);
    };
    /**
    * Logs ELOs to the console
    * @param array team1 (winner)
    * @param array team2 (loser)
    * @param obj new_rating
    **/
    $scope.testElo = function(team1, team2, new_rating) {
    	if (team1.length > 1) {
	    	console.group("Current ELOs");
	    	console.group("Team1");
	    	console.log(team1[0].name + " : "+ team1[0].elo.rating);
	    	console.log(team1[1].name + " : "+ team1[1].elo.rating);
	    	console.groupEnd();
	    	console.group("Team2");
	    	console.log(team2[0].name + " : "+ team2[0].elo.rating);
	    	console.log(team2[1].name + " : "+ team2[1].elo.rating);
	    	console.groupEnd();
	    	console.groupEnd();

	    	console.group("New ELOs");
	    	console.group("Team1");
	    	console.log(new_rating.team1[0]);
	    	console.log(new_rating.team1[1]);
	    	console.groupEnd();
	    	console.group("Team2");
	    	console.log(new_rating.team2[0]);
	    	console.log(new_rating.team2[1]);
	    	console.groupEnd();
	    	console.groupEnd();
	    } else {
	    	console.group("Current ELOs");
	    	console.group("Team1");
	    	console.log(team1[0].name + " : "+ team1[0].elo.rating);
	    	console.groupEnd();
	    	console.group("Team2");
	    	console.log(team2[0].name + " : "+ team2[0].elo.rating);
	    	console.groupEnd();
	    	console.groupEnd();

	    	console.group("New ELOs");
	    	console.group("Team1");
	    	console.log(new_rating.team1[0]);
	    	console.groupEnd();
	    	console.group("Team2");
	    	console.log(new_rating.team2[0]);
	    	console.groupEnd();
	    	console.groupEnd();	    	
	    }
    }
    /**
    * Inserts new scores into the DB
    * @param obj series
    **/
    $scope.insertScores = function(series) {
    	$http({
			method: 'POST',
			data: JSON.stringify(series),
			url: '/api/submitGame'
		}).
		success(function (data, status) {
			$scope.updateOverallStats(series);
		}).
		error(function (data, status) {
			alert("There was an error! Please try again.");
		});
    };
	/**
	* Updates DB with new stats
	* @param obj series
	**/
    $scope.updateOverallStats = function(series) {
    	$http({
			method: 'POST',
			data: JSON.stringify(series),
			url: '/api/updateOverallStats'
		}).
		success(function (data, status) {
			$('#add-game-modal').foundation('reveal', 'close');
			$scope.resetModal();
		}).
		error(function (data, status) {
			alert("There was an error! Please try again.");
		});
    };
    /**
    * Resets all scope values
    **/
    $scope.resetModal = function() {
    	$scope.slider_right = 0;
    	$scope.slider_left = 0;
    	$scope.scores = []
    	$scope.selected_left = [];
    	$scope.selected_right = [];
    	$scope.team_header_right = '';
    	$scope.team_header_left = '';
    	finalized = false;
    	$('.series').show();
    	$('#add-game-modal table td').empty();
    	$('.player-select-button:not(.active)').attr('disabled', false);
    	$('#add-game-modal').find('.active').removeClass('active');
    	$('.player-select .button').removeAttr('disabled');
    	// $('.team-left, .team-right').empty();
    	$('.ui-slider-handle').css('left', 0);
    };
});
/**
* Controller for help modal
**/
myApp.controller('helpModalCtrl', function($scope) {
	/**
	* Changes clicked <li> to active and transitions to new text box
	* @param $event
	**/
	$scope.categoryChange = function($event) {
		/**
		* If category is already active, break
		**/
		if ($($event.target).closest('li').hasClass('active')) { return; }

		$('.help-modal-nav li').removeClass('active');
		/**
		* Get the closest li in case they click directly on the <a> or <span>
		**/
		var el = $($event.target).closest('li');
		/**
		* Get the class of the help-content div to reveal
		**/
		var categoryClass = $(el).find('a').attr('class');
		$(el).addClass('active');
		
		$scope.revealDiv(categoryClass);
		$scope.changeArrow(el);
	};
	/**
	* Reveals related help container
	* @param string class
	**/
	$scope.revealDiv = function(categoryClass) {
		$('.help-modal-content').css('left', -770);
		/**
		* Slides clicked element from left to right
		**/
		(slideRight = function() {
			var el = $('.help-modal-content.'+categoryClass);
			el.show();
			el.animate({ 
				left: (parseInt(el.css('left'), 10)) == 0 ? -el.outerWidth() - 770 : 20
			});
		})();
	}
	/**
	* Changes arrow direction
	* @param HTML li
	**/
	$scope.changeArrow = function(li) {
		$('.help-modal-nav li span').removeClass('fa-chevron-right').addClass('fa-chevron-down');
		$(li).find('span').removeClass('fa-chevron-down').addClass('fa-chevron-right');
	}
});
/**
* Controller for login page
**/
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
/*==========================================
=            SERVICES/FACTORIES            =
==========================================*/
/**
* Authorizes the current user
**/
myApp.service('authService', function() {
	this.auth = function() {
		if (Modernizr.localstorage && localStorage.user_id) {
			return true;
		} else {
			return false;
		}
	};
});
/**
* Converts timestamp to "X days ago"
**/
myApp.service('timestampConverterService', function() {	
	this.convert = function(previous) {
		var current = Date.now();
		var msPerMinute = 60 * 1000;
	    var msPerHour = msPerMinute * 60;
	    var msPerDay = msPerHour * 24;
	    var msPerMonth = msPerDay * 30;
	    var msPerYear = msPerDay * 365;

	    var elapsed = current - previous;

	    if (elapsed < msPerMonth) {
	    	if (Math.round(elapsed/msPerDay) === 0) {
	    		return 'today';
	    	} else {
	    		var time = Math.round(elapsed/msPerDay);
	        	return (time == 1) ? time + ' day ago' : time + ' days ago'; 
	    	}
	    } else if (elapsed < msPerYear) {
	    	var time = Math.round(elapsed/msPerMonth)*30;
	        return (time == 1) ? time + ' day ago' : time + ' days ago'; 
	    }
	}
});
/**
* Calculates Expected elo and elo
**/
myApp.service('eloService', function() {
	/**
	* Gets expected elo
	* @param array team1
	* @param array team2
	* @return obj expected_score
	**/
	this.getExpectedElo = function(team1, team2) {
		var expected_score, expected1, expected2;
		/**
		* If the game was 1v1
		**/
		if (team1.length == 1) {
			var team1_curr_elo = team1[0].elo.rating;
			var team2_curr_elo = team2[0].elo.rating;
			expected1 = 1 / (1 + Math.pow(10, (team2_curr_elo - team1_curr_elo) / 400));
			expected2 = 1 / (1 + Math.pow(10, (team1_curr_elo - team2_curr_elo) / 400));

			return expected_score = {
				team1: expected1,
				team2: expected2
			};
		} else if (team1.length == 2) {
			var team1_avg_curr_elo = Math.round((team1[0].elo.rating + team2[1].elo.rating) / 2);
			var team2_avg_curr_elo = Math.round((team2[0].elo.rating + team2[1].elo.rating) / 2);
			expected1 = 1 / (1 + Math.pow(10, (team2_avg_curr_elo - team1_avg_curr_elo) / 400));
			expected2 = 1 / (1 + Math.pow(10, (team1_avg_curr_elo - team2_avg_curr_elo) / 400));

			return expected_score = {
				team1: expected1,
				team2: expected2
			};
		} else {
			return false
		}
	};
	/**
	* Gets new elo rating
	* @param array team1 (winner)
	* @param array team2 (loser)
	* @param array actual_score
	* @param obj expected_score
	* @return obj new_ratings 
	**/
	this.getNewElo = function(team1, team2, actual_score, expected_score) {
		var new_ratings;
		/**
		* Foreach game in series
		**/
		_.each(actual_score, function (game) {
			var team1_new_elo, team2_new_elo, team1_curr_elo, team2_curr_elo;
			/**
			* If actual_score[i] > 0, use ratings from function scope
			**/
			if (new_ratings) {
				team1_curr_elo = (new_ratings.team1.length > 1) ? Math.round((new_ratings.team1[0] + new_ratings.team1[1]) /2) : new_ratings.team1[0];
				team2_curr_elo = (new_ratings.team2.length > 1) ? Math.round((new_ratings.team2[0] + new_ratings.team2[1]) /2) : new_ratings.team2[0];
			} else {
				team1_curr_elo = (team1.length > 1) ? Math.round((team1[0].elo.rating + team2[1].elo.rating) / 2) : team1[0].elo.rating; 
				team2_curr_elo = (team2.length > 1) ? Math.round((team2[0].elo.rating + team2[1].elo.rating) / 2) : team2[0].elo.rating; 
			}
			/**
			* Take the minimum KFactor per team
			**/
			var team1_KFactor = _.min(team1, function (player) { return parseInt(player.elo.kfactor) }).elo.kfactor;
			var team2_KFactor = _.min(team2, function (player) { return parseInt(player.elo.kfactor) }).elo.kfactor;
			/**
			* Win == 1, loss == 0
			**/
			var team1_score = (game.winner_score > game.loser_score) ? 1 : 0;
			var team2_score = (game.loser_score > game.winner_score) ? 1 : 0;
			var team1_expected_score = expected_score.team1;
			var team2_expected_score = expected_score.team2;
			/**
			* ELO Algorithm
			**/
			team1_new_elo = Math.round(team1_curr_elo + (team1_KFactor * (team1_score - team1_expected_score)));
			team2_new_elo = Math.round(team2_curr_elo + (team2_KFactor * (team2_score - team2_expected_score)));
			/**
			* if 2 players, split the new elo evenly
			**/
			if (team1.length > 1) {
				var team1_player1_new_elo, team1_player2_new_elo, team2_player1_new_elo, team2_player2_new_elo;
				var team1_avg_change = Math.floor((team1_new_elo - team1_curr_elo)/2);
				var team2_avg_change = Math.floor((team2_new_elo - team2_curr_elo)/2);
				if (new_ratings) {
					team1_player1_new_elo = new_ratings.team1[0] + team1_avg_change;
					team1_player2_new_elo = new_ratings.team1[1] + team1_avg_change;
					team2_player1_new_elo = new_ratings.team2[0] + team2_avg_change;
					team2_player2_new_elo = new_ratings.team2[1] + team2_avg_change;					
				} else {
					team1_player1_new_elo = team1[0].elo.rating + team1_avg_change;
					team1_player2_new_elo = team1[1].elo.rating + team1_avg_change;
					team2_player1_new_elo = team2[0].elo.rating + team2_avg_change;
					team2_player2_new_elo = team2[1].elo.rating + team2_avg_change;
				}	
				new_ratings = {
					team1: [team1_player1_new_elo, team1_player2_new_elo],
					team2: [team2_player1_new_elo, team2_player2_new_elo]
				} 		
			} else {
				new_ratings = {
					team1: [team1_new_elo],
					team2: [team2_new_elo]
				};
			}
		});
		return new_ratings;
	};
	/**
	* Gets new KFactor after ELO is calculated
	* @param obj series
	* @return obj series
	**/
	this.getNewKFactor = function(series) {
		var team1 = series.winner;
		var team2 = series.loser;
		_.each(team1, function (player) {
			if (parseInt(player.elo.rating) > 1200) {
				player.elo.kfactor = 12;
			} else if (parseInt(player.elo.rating) < 800) {
				player.elo.kfactor = 20;
			} else {
				player.elo.kfactor = 16;
			}
		});
		_.each(team2, function (player) {
			if (parseInt(player.elo.rating) > 1200) {
				player.elo.kfactor = 12;
			} else if (parseInt(player.elo.rating) < 800) {
				player.elo.kfactor = 20;
			} else {
				player.elo.kfactor = 16;
			}
		});
		return series;
	};
});
/**
* Creates the charts
**/
myApp.factory('chartFactory', function() {
	return {
		makePieData: function(games, $scope) {
			var chart_data = [];
			var total_games = games.length;
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
			this.insertPie(chart_data);
		},
		makeChartData: function(user_data, $scope) {
			$scope.chart = [],
    		$scope.chart_error,
    		index = 0,
    		user_id = localStorage['user_id'];
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
		},
		makeBarData: function(games) {
			var bar_data = [];
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
	      	if (bar_data.length > 0) {
				this.insertBars(bar_data);
	      	}
		},
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
                    legend: {
                        layout: 'vertical',
                        align: 'right',
                        verticalAlign: 'top',
                        x: -40,
                        y: 100,
                        borderWidth: 0
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
		                enabled: true
		            },
		            credits: {
		                enabled: false
		            },
		            series: [{
		                name: 'wins',
		                data: bar_data.reverse(),
		                color: '#F05924',
		                negativeColor: '#555',
		            }]
		        });
		    });
		}
	};
});
/**
* Calculates scores
**/
myApp.factory('scoreBuilder', function () {
	var all_games;
	var user_id;
	return {
		/**
		* sets user_id and current games
		* @param string _id
		* @param array game_data
		**/
		setUserInfo: function(_id, game_data) {
			user_id = _id;
			all_games = game_data;
		},
		/**
		* Returns game list
		**/
		getGames: function() {
			return all_games;
		},
		/**
		* Calculates sidebar information
		* @param object $scope
		* @param string timeframe
		**/
		buildSidebar: function($scope, timeframe) {
			var games;
			if (timeframe == "all-time") {
				games = all_games.slice()
			} else if (timeframe == "month") {
				var currMonth = new Date().getMonth();
				games = _.filter(all_games, function (game) 
					{ 
						var date = new Date(game.timestamp);
						var month = date.getMonth(); 
						return month == currMonth; 
					});
			} else if (timeframe == "not-mike") {
				games = _.filter(all_games, function (game) {
					if (!_.find(game.winner, function (player) { return player.id == "52f2866496aea74f5a6ee2c8" }) 
						&& !_.find(game.loser, function (player) { return player.id == "52f2866496aea74f5a6ee2c8" })) 
					{
						return game;
					}
				});				
			} else {
				var currYear = new Date().getYear();
				games = _.filter(all_games, function (game) 
					{ 
						var date = new Date(game.timestamp);
						var year = date.getYear(); 
						return year == currYear; 
					});
			}
			$scope.most_competitive = null,
			$scope.most_played = {},
			$scope.recommended = {};
			/**
			* Bootstrapping this function to get games per opponent
			**/
			$scope.stats.records.singles.games_per_opponent = 0,
			$scope.stats.records.doubles.games_per_opponent = 0,
			$scope.stats.records.overall.games_per_opponent = 0;

			var players = [],
				singles_players = [],
				doubles_players = [];
			
			for(var i=0, j=games.length; j > i; i++) {
				var curr_series = games[i];
				/**
				* If user won, opponents are on losing team
				**/
				if(_.findWhere(curr_series.winner, { id : user_id })) {
					_.each(curr_series.loser, function (opponent) {
						var player = _.findWhere(players, { id : opponent.id });
						var singles_player = _.findWhere(singles_players, { id : opponent.id });
						var doubles_player = _.findWhere(doubles_players, { id : opponent.id });
						/**
						* If the user has played this person before
						**/
						if (player) {
							player.wins_against++;
						} else {
							var player = {};
								player.id = opponent.id;
								player.name = opponent.name;
								player.wins_against = 1;
								player.losses_against = 0;
								players.push(player);
						}

						if (curr_series.loser.length == 1) {
							/**
							* Player for singles games per opponent
							**/
							if (singles_player) {
								singles_player.played++;
							} else {
								var player = {};
									player.id = opponent.id;
									player.played = 1;
									singles_players.push(player);
							}
						} else {
							/**
							* Player for doubles games per opponent
							**/
							if (doubles_player) {
								doubles_player.played++;
							} else {
								var player = {};
									player.id = opponent.id;
									player.played = 1;
									doubles_players.push(player);
							}
						}
					});
				} else {
					_.each(curr_series.winner, function (opponent) {
						/**
						* If the user has played this person before
						**/
						var player = _.findWhere(players, { id : opponent.id });
						var singles_player = _.findWhere(singles_players, { id : opponent.id });
						var doubles_player = _.findWhere(doubles_players, { id : opponent.id });
						if (player) {
							player.losses_against++;
						} else {
							var player = {};
								player.id = opponent.id;
								player.name = opponent.name;
								player.losses_against = 1;
								player.wins_against = 0;
								players.push(player);
						}
						if (curr_series.loser.length == 1) {
							/**
							* Player for singles games per opponent
							**/
							if (singles_player) {
								singles_player.played++;
							} else {
								var player = {};
									player.id = opponent.id;
									player.played = 1;
									singles_players.push(player);
							}
						} else {
							/**
							* Player for doubles games per opponent
							**/
							if (doubles_player) {
								doubles_player.played++;
							} else {
								var player = {};
									player.id = opponent.id;
									player.played = 1;
									doubles_players.push(player);
							}
						}
					});
				}
			}
			var total_games_singles = _.reduce(singles_players, function (memo, player) { return memo + player.played },0);
			var total_games_doubles = _.reduce(doubles_players, function (memo, player) { return memo + player.played },0);

			$scope.stats.records.singles.games_per_opponent = Math.round(total_games_singles / singles_players.length);
			$scope.stats.records.doubles.games_per_opponent = Math.round(total_games_doubles / doubles_players.length);
			$scope.stats.records.overall.games_per_opponent = Math.round($scope.stats.records.singles.games_per_opponent / $scope.stats.records.doubles.games_per_opponent);

			/**
			* Calculate win rates
			**/
			for(var i=0, j=players.length; j > i; i++) {
				var curr_player = players[i];
				curr_player.win_rate = Math.round(curr_player.wins_against / (curr_player.wins_against + curr_player.losses_against) * 100);
			}
			players = _.sortBy(players, function (player) { return player.win_rate; });
			/**
			* find most competitive
			**/
			_.each(players, function (player) { 
				if ($scope.most_competitive == null || Math.abs(player.win_rate - 50) < Math.abs($scope.most_competitive.win_rate - 50)) {
					$scope.most_competitive = player;
				}
			});  
			$scope.most_played = _.max(players, function (player) { return (player.wins_against + player.losses_against) });
			$scope.recommended = _.min(players, function (player) { return (player.wins_against + player.losses_against) });
		},
		/**
		* Calculates chart information
		* @param object $scope
		* @param string timeframe
		**/
		build: function($scope, timeframe) {
			var games;
			if (timeframe == "all-time") {
				games = all_games.slice()
			} else if (timeframe == "month") {
				var currMonth = new Date().getMonth();
				games = _.filter(all_games, function (game) { 
					var date = new Date(game.timestamp);
					var month = date.getMonth(); 
					return month == currMonth; 
				});
			} else if (timeframe == "not-mike") {
				games = _.filter(all_games, function (game) {
					if (!_.find(game.winner, function (player) { return player.id == "52f2866496aea74f5a6ee2c8" }) 
						&& !_.find(game.loser, function (player) { return player.id == "52f2866496aea74f5a6ee2c8" })) 
					{
						return game;
					}
				});
			} else {
				var currYear = new Date().getYear();
				games = _.filter(all_games, function (game) { 
					var date = new Date(game.timestamp);
					var year = date.getYear(); 
					return year == currYear; 
				});
			}
			/**
			* Series data
			* Games played, win-rate, streak, +/-
			**/
			$scope.stats = {};
			$scope.stats.series = {},
				$scope.stats.series.singles = {},
					$scope.stats.series.singles.games_played = 0,
					$scope.stats.series.singles.win_rate = 0,
					$scope.stats.series.singles.streak = 0,
					$scope.stats.series.singles.plus_minus = 0,
				$scope.stats.series.doubles = {},
					$scope.stats.series.doubles.games_played = 0,
					$scope.stats.series.doubles.win_rate = 0,
					$scope.stats.series.doubles.streak = 0,
					$scope.stats.series.doubles.plus_minus = 0,
				$scope.stats.series.overall = {},
					$scope.stats.series.overall.games_played = 0,
					$scope.stats.series.overall.win_rate = 0,
					$scope.stats.series.overall.streak = 0,
					$scope.stats.series.overall.plus_minus = 0;	
			/**
			* Individual game data
			**/
			$scope.stats.games= {},
				$scope.stats.games.singles = {},
					$scope.stats.games.singles.games_played = 0,
					$scope.stats.games.singles.win_rate = 0,
					$scope.stats.games.singles.streak = 0,
					$scope.stats.games.singles.plus_minus = 0,
				$scope.stats.games.doubles = {},
					$scope.stats.games.doubles.games_played = 0,
					$scope.stats.games.doubles.win_rate = 0,
					$scope.stats.games.doubles.streak = 0,
					$scope.stats.games.doubles.plus_minus = 0,
				$scope.stats.games.overall = {},
					$scope.stats.games.overall.games_played = 0,
					$scope.stats.games.overall.win_rate = 0,
					$scope.stats.games.overall.streak = 0,
					$scope.stats.games.overall.plus_minus = 0;	
			/**
			* Record data
			**/
			$scope.stats.records = {},
				$scope.stats.records.singles = {},
					$scope.stats.records.singles.longest_streak_series = 0,
					$scope.stats.records.singles.longest_streak_games = 0,
					$scope.stats.records.singles.total_days_played = 0,
					$scope.stats.records.singles.games_per_opponent = 0;
				$scope.stats.records.doubles = {},
					$scope.stats.records.doubles.longest_streak_series = 0,
					$scope.stats.records.doubles.longest_streak_games = 0,
					$scope.stats.records.doubles.total_days_played = 0,
					$scope.stats.records.doubles.games_per_opponent = 0;
				$scope.stats.records.overall = {},
				$scope.stats.records.overall.longest_streak_series = 0,
				$scope.stats.records.overall.longest_streak_games = 0,
				$scope.stats.records.overall.total_days_played = 0,
				$scope.stats.records.overall.games_per_opponent = 0;
			/**
			* Helper vars
			**/
			var singles_wins = 0,
				doubles_wins = 0,
				game_singles_wins = 0,
				game_doubles_wins = 0;
			var temp_singles = [],
				temp_doubles = [];	

			var count_wins_for_test = 0;
			/**
			* Calculate total days played
			**/
			$scope.stats.records.overall.total_days_played = _.uniq(games, function (game) {
				/**
				* Stripping time from date, leaving year/month/day only
				**/
				var temp_date = new Date(game.timestamp); 
				var date = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).valueOf();
				return date; 
			}).length;
			for(var i=0, j=games.length; j > i; i ++) {
				var curr_series = games[i];
				var temp_plus_minus = 0;

				/**
				* If user won
				**/
				if(_.findWhere(curr_series.winner, { id : user_id })) {
					/**
					* If doubles game
					**/
					if (curr_series.winner.length > 1) {
						temp_doubles.push(curr_series);
						/**
						* Calculate curr doubles streak
						**/
						if ($scope.stats.series.doubles.streak < 0) {
							$scope.stats.series.doubles.streak = 1
						} else {	
							$scope.stats.series.doubles.streak++;
							/**
							* If current record doubles streak < current doubles streak
							**/
							if ($scope.stats.records.doubles.longest_streak_series < $scope.stats.series.doubles.streak) {
								$scope.stats.records.doubles.longest_streak_series = $scope.stats.series.doubles.streak; 
							}
						}
						doubles_wins = doubles_wins+1;
						$scope.stats.series.doubles.games_played = $scope.stats.series.doubles.games_played+1;

						/**
						* For each game in curr_series
						**/
						_.each(curr_series.series, function (game) {
							$scope.stats.series.doubles.plus_minus += (game.winner_score - game.loser_score);
							$scope.stats.games.doubles.games_played = $scope.stats.games.doubles.games_played+1;

							/**
							* build individual game data
							**/
							if (game.winner_score > game.loser_score) {
								game_doubles_wins = game_doubles_wins+1;
								($scope.stats.games.overall.streak < 0) ? $scope.stats.games.overall.streak = 1 : $scope.stats.games.overall.streak++;
								if ($scope.stats.games.doubles.streak < 0) {
									$scope.stats.games.doubles.streak = 1;
									if ($scope.stats.records.doubles.longest_streak_games == 0) {
										$scope.stats.records.doubles.longest_streak_games = 1;
									}
								} else {	
									$scope.stats.games.doubles.streak++;
									if ($scope.stats.records.doubles.longest_streak_games < $scope.stats.games.doubles.streak) {
										$scope.stats.records.doubles.longest_streak_games = $scope.stats.games.doubles.streak; 
									}
								}
							} else {
								($scope.stats.games.doubles.streak > 0) ? $scope.stats.games.doubles.streak = -1 : $scope.stats.games.doubles.streak--;
								($scope.stats.games.overall.streak > 0) ? $scope.stats.games.overall.streak = -1 : $scope.stats.games.overall.streak--;	
							}							
						});	
					/**
					* else singles game
					**/
					} else {
						temp_singles.push(curr_series);
						if ($scope.stats.series.singles.streak < 0) {
							$scope.stats.series.singles.streak = 1
							if ($scope.stats.records.singles.longest_streak_series == 0) {
								$scope.stats.records.singles.longest_streak_series = 1;
							}
						} else {	
							$scope.stats.series.singles.streak++;
							if ($scope.stats.records.singles.longest_streak_series < $scope.stats.series.singles.streak) {
								$scope.stats.records.singles.longest_streak_series = $scope.stats.series.singles.streak; 
							}
						}						
						singles_wins = singles_wins+1;
						$scope.stats.series.singles.games_played = $scope.stats.series.singles.games_played+1;

						_.each(curr_series.series, function (game) {
							$scope.stats.series.singles.plus_minus += (game.winner_score - game.loser_score);
							$scope.stats.games.singles.games_played = $scope.stats.games.singles.games_played+1;

							if (game.winner_score > game.loser_score) {
								game_singles_wins = game_singles_wins+1;
								if ($scope.stats.games.singles.streak < 0) {
									$scope.stats.games.singles.streak = 1;
									if ($scope.stats.records.singles.longest_streak_games == 0) {
										$scope.stats.records.singles.longest_streak_games = 1;
									}
								} else {	
									$scope.stats.games.singles.streak++;
									if ($scope.stats.records.singles.longest_streak_games < $scope.stats.games.singles.streak) {
										$scope.stats.records.singles.longest_streak_games = $scope.stats.games.singles.streak; 
									}
								}
								if ($scope.stats.games.overall.streak < 0) {
									$scope.stats.games.overall.streak = 1;
									if ($scope.stats.records.overall.longest_streak_games == 0) {
										$scope.stats.records.overall.longest_streak_games = 1;
									}
								} else {
									$scope.stats.games.overall.streak++;
									if ($scope.stats.records.overall.longest_streak_games < $scope.stats.games.overall.streak) {
										$scope.stats.records.overall.longest_streak_games = $scope.stats.games.overall.streak; 
									}
								}
							} else {
								($scope.stats.games.singles.streak > 0) ? $scope.stats.games.singles.streak = -1 : $scope.stats.games.singles.streak--;
								($scope.stats.games.overall.streak > 0) ? $scope.stats.games.overall.streak = -1 : $scope.stats.games.overall.streak--;	
							}								
						});
					}
					/**
					* Overall series streak
					**/
					if ($scope.stats.series.overall.streak < 0) {
						$scope.stats.series.overall.streak = 1 
						if ($scope.stats.records.overall.longest_streak_series == 0) {
							$scope.stats.records.overall.longest_streak_series = 1;
						}
					} else {
						$scope.stats.series.overall.streak++;
						if ($scope.stats.records.overall.longest_streak_series < $scope.stats.series.overall.streak) {
							$scope.stats.records.overall.longest_streak_series = $scope.stats.series.overall.streak; 
						}
					}
				/**
				* Else user lost
				**/
				} else {
					/**
					* If doubles game
					**/
					if (curr_series.winner.length > 1) {
						temp_doubles.push(curr_series);
						($scope.stats.series.doubles.streak > 0) ? $scope.stats.series.doubles.streak = -1 : $scope.stats.series.doubles.streak--;
						$scope.stats.series.doubles.games_played = $scope.stats.series.doubles.games_played+1;

						_.each(curr_series.series, function (game) {
							$scope.stats.series.doubles.plus_minus += (game.loser_score - game.winner_score);
							$scope.stats.games.doubles.games_played = $scope.stats.games.doubles.games_played+1;
							if (game.winner_score > game.loser_score) {
								($scope.stats.games.doubles.streak > 0) ? $scope.stats.games.doubles.streak = -1 : $scope.stats.games.doubles.streak--;
								($scope.stats.games.overall.streak > 0) ? $scope.stats.games.overall.streak = -1 : $scope.stats.games.overall.streak--;	
							} else {
								game_doubles_wins++;
								($scope.stats.games.doubles.streak < 0) ? $scope.stats.games.doubles.streak = 1 : $scope.stats.games.doubles.streak++;
								($scope.stats.games.overall.streak < 0) ? $scope.stats.games.overall.streak = 1 : $scope.stats.games.overall.streak++;
							}
						});	
					} else {
						temp_singles.push(curr_series);
						($scope.stats.series.singles.streak > 0) ? $scope.stats.series.singles.streak = -1 : $scope.stats.series.singles.streak--;
						$scope.stats.series.singles.games_played = $scope.stats.series.singles.games_played+1;

						_.each(curr_series.series, function (game) {
							$scope.stats.series.singles.plus_minus += (game.loser_score - game.winner_score);
							$scope.stats.games.singles.games_played = $scope.stats.games.singles.games_played+1;
							if (game.winner_score > game.loser_score) {
								($scope.stats.games.singles.streak > 0) ? $scope.stats.games.singles.streak = -1 : $scope.stats.games.singles.streak--;
								($scope.stats.games.overall.streak > 0) ? $scope.stats.games.overall.streak = -1 : $scope.stats.games.overall.streak--;	
							} else {
								game_singles_wins++;
								($scope.stats.games.singles.streak < 0) ? $scope.stats.games.singles.streak = 1 : $scope.stats.games.singles.streak++;
								($scope.stats.games.overall.streak < 0) ? $scope.stats.games.overall.streak = 1 : $scope.stats.games.overall.streak++;	
							}
						});
					}
					($scope.stats.series.overall.streak > 0) ? $scope.stats.series.overall.streak = -1 : $scope.stats.series.overall.streak--;
				}
			}
			$scope.stats.series.singles.win_rate = Math.round(singles_wins / ($scope.stats.series.singles.games_played) * 100);
			$scope.stats.series.doubles.win_rate = Math.round(doubles_wins / ($scope.stats.series.doubles.games_played) * 100);

			/**
			* Build overall series stats
			**/
			$scope.stats.series.overall.games_played = $scope.stats.series.singles.games_played + $scope.stats.series.doubles.games_played;
			$scope.stats.series.overall.plus_minus = $scope.stats.series.singles.plus_minus + $scope.stats.series.doubles.plus_minus;
			$scope.stats.series.overall.win_rate = Math.round((singles_wins+doubles_wins) / $scope.stats.series.overall.games_played * 100);
			
			/**
			* all plus_minuses are equivalent
			**/
			$scope.stats.records.singles.plus_minus = Math.round($scope.stats.series.singles.plus_minus / $scope.stats.series.singles.games_played);
			$scope.stats.records.doubles.plus_minus = Math.round($scope.stats.series.doubles.plus_minus / $scope.stats.series.doubles.games_played);
			$scope.stats.records.overall.plus_minus = Math.round($scope.stats.series.overall.plus_minus / $scope.stats.series.overall.games_played);
			
			$scope.stats.games.overall.games_played = $scope.stats.games.singles.games_played + $scope.stats.games.doubles.games_played;

			$scope.stats.games.singles.win_rate = Math.round(game_singles_wins / ($scope.stats.games.singles.games_played) * 100);
			$scope.stats.games.doubles.win_rate = Math.round(game_doubles_wins / ($scope.stats.games.doubles.games_played) * 100);
			$scope.stats.games.overall.win_rate = Math.round((game_singles_wins+game_doubles_wins) / ($scope.stats.games.overall.games_played) * 100);
			
			/**
			* Singles/Doubles total games played
			**/
			if (temp_singles.length > 0) {
				$scope.stats.records.singles.total_days_played = _.uniq(temp_singles, function (game) {
				/**
				* Stripping time from date, leaving year/month/day only
				**/
				var temp_date = new Date(game.timestamp); 
				var date = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).valueOf();
				return date; 
			}).length;
			}
			if (temp_doubles.length > 0) {
				$scope.stats.records.doubles.total_days_played = _.uniq(temp_doubles, function (game) {
				/**
				* Stripping time from date, leaving year/month/day only
				**/
				var temp_date = new Date(game.timestamp); 
				var date = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).valueOf();
				return date;
				}).length;
			}

			/**
			* Series/Games records
			**/
			$scope.stats.series.singles.wins = singles_wins;
			$scope.stats.series.singles.losses = $scope.stats.series.singles.games_played - singles_wins;
			$scope.stats.series.doubles.wins = doubles_wins;
			$scope.stats.series.doubles.losses = $scope.stats.series.doubles.games_played - doubles_wins; 
			$scope.stats.series.overall.wins = singles_wins + doubles_wins;
			$scope.stats.series.overall.losses = $scope.stats.series.overall.games_played - $scope.stats.series.overall.wins; 

			$scope.stats.games.singles.wins = game_singles_wins;
			$scope.stats.games.singles.losses = $scope.stats.games.singles.games_played - game_singles_wins;
			$scope.stats.games.doubles.wins = game_doubles_wins;
			$scope.stats.games.doubles.losses = $scope.stats.games.doubles.games_played - game_doubles_wins; 
			$scope.stats.games.overall.wins = game_singles_wins + game_doubles_wins;
			$scope.stats.games.overall.losses = $scope.stats.games.overall.games_played - $scope.stats.games.overall.wins; 
		}
	}
});
/**
* Tells add-games-modal player list where to start
**/
myApp.filter('startFrom', function() {
    return function(input, start) {
    	if (input) {
	        start = +start; //parse to int
	        return input.slice(start);
    	}
    }
});


