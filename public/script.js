// create the module and name it dashboardApp
// also include ngRoute for all our routing needs
var dashboardApp = angular.module('dashboardApp', ['ngRoute']);

var dfu = {
	"config" : {
		"ora_username" : "SCPOMGR",
		"ora_password" : "SCPOMGR",
		"ora_connectionString" : "localhost/O12CR201",
	}
};

// configure our routes
dashboardApp.config(function($routeProvider) {
	setToastOptions();
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl : 'pages/home.html',
            controller  : 'mainController'
        })

        // route for the about page
        .when('/about', {
            templateUrl : 'pages/about.html',
            controller  : 'aboutController'
        })

        // route for the contact page
        .when('/contact', {
            templateUrl : 'pages/contact.html',
            controller  : 'contactController'
        })

        // route for the dashboard page
        .when('/dashboard', {
            templateUrl : 'pages/dashboard.html',
            controller  : 'dashboardController'
        })

        // route for the dashboard page
        .when('/cbat', {
            templateUrl : 'pages/cbat.html',
            controller  : 'cbatController'
        })

        // route for the dashboard page
        .when('/config', {
            templateUrl : 'pages/config.html',
            controller  : 'notAvailableController'
        })

        // route for the dashboard page
        .when('/analytics', {
            templateUrl : 'pages/analytics.html',
            controller  : 'notAvailableController'
        })

        // route for the dashboard page
        .when('/logparser', {
            templateUrl : 'pages/logparser.html',
            controller  : 'notAvailableController'
        })

        // route for the dashboard page
        .when('/tunemodel', {
            templateUrl : 'pages/tunemodel.html',
            controller  : 'notAvailableController'
        })

        // route for the dashboard page
        .when('/calendar', {
            templateUrl : 'pages/calendar.html',
            controller  : 'notAvailableController'
        })

        // route for the dashboard page
        .when('/docs', {
            templateUrl : 'pages/docs.html',
            controller  : 'notAvailableController'
        })

        // route for 404 not found
        .otherwise({
            templateUrl : 'pages/examples/404.html'
        });
});

// create the controller and inject Angular's $scope
dashboardApp.controller('mainController', function($scope) {
	// create a message to display in our view
    $scope.message = 'Checkout dashboard and CBAT sections!';
});

dashboardApp.controller('aboutController', function($scope) {
	// Display an info toast with no title
    $scope.message = 'Look! I am an about page.';
});

dashboardApp.controller('contactController', function($scope) {
    $scope.message = 'Contact us! JK. This is just a demo.';
});

dashboardApp.controller('dashboardController', function($scope, $http) {
	$scope.dfu = dfu;
	$scope.data = dfu.config;
	if (dfu.feature) {
		startup(dfu);
	}
	$scope.submit = function() {
		toastr.info("Loading data for the DFU");
		$("#uplot-spinner").removeClass("hide");
		$(".summary-spinner").removeClass("hide");
		$("#pgp-spinner").removeClass("hide");
		$("#nodeconfig-spinner").removeClass("hide");
		$("#exception-spinner").removeClass("hide");
		$("#modelconfig-spinner").removeClass("hide");
		$("#exesummary-spinner").removeClass("hide");
		$http.post('/dashboard', this.data). // {'headers' : {'Content-Type':'multipart/form-data'}}).
		then(function(response) {
			$("#uplot-spinner").addClass("hide");
			$(".summary-spinner").addClass("hide");
			$("#pgp-spinner").addClass("hide");
			$("#nodeconfig-spinner").addClass("hide");
			$("#exception-spinner").addClass("hide");
			$("#modelconfig-spinner").addClass("hide");
			$("#exesummary-spinner").addClass("hide");
			$scope.dfu = response.data;
			if (response.data.feature.length > 0) {
				dfu = response.data;
				startup(response.data);
				toastr.success("Data for the DFU has been successfully loaded!");
			} else {
				toastr.error("Data not found!");
			}
		}, function(response) {
			toastr.error(response.data.message);
		});
	};
});

dashboardApp.controller('cbatController', function($scope, $http) {
	// $("#cbatform-spinner").removeClass("hide");
	$http.get('/cbat').
	then(function(response) {
		$scope.cbatres = response.data;
		$scope.data = response.data.form;
	}, function(response) {
		toastr.error(response.data.message);
	});
	$scope.submit = function() {
		toastr.info("Attempting to generate the CBAT scripts")
		$("#cbatform-spinner").removeClass("hide");
		$("#processedfiles-spinner").removeClass("hide");
		$http.post('/cbat', this.data). // {'headers' : {'Content-Type':'multipart/form-data'}}).
		then(function(response) {
			$scope.cbatres = response.data;
			$("#cbatform-spinner").addClass("hide");
			$("#processedfiles-spinner").addClass("hide");
			toastr.success("Scripts have been successfully generated!")
		}, function(response) {
			toastr.error(response.data.message);
			$("#cbatform-spinner").addClass("hide");
			$("#processedfiles-spinner").addClass("hide");
		});
	};
	$scope.delete = function(filename) {
		$("#processedfiles-spinner").removeClass("hide");
		console.log(this);
		$http.delete('/cbat/' + filename).
		then(function(response) {
			if (response.status == 200) {
				$scope.cbatres = response.data;
				$("#processedfiles-spinner").addClass("hide");
				toastr.success("Scripts have been successfully deleted!");
			} else {
				$("#processedfiles-spinner").addClass("hide");
				toastr.error(response.statusText, "Unexpected error occurred");
			}
	});
	};
});

dashboardApp.controller('notAvailableController', function($scope) {
    $scope.message = 'Feature not available yet. Coming soon.';
});

window.chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

(function(global) {
	var MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	var COLORS = [
		'#4dc9f6',
		'#f67019',
		'#f53794',
		'#537bc4',
		'#acc236',
		'#166a8f',
		'#00a950',
		'#58595b',
		'#8549ba'
	];

	var Samples = global.Samples || (global.Samples = {});
	var Color = global.Color;

	Samples.utils = {
		// Adapted from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		srand: function(seed) {
			this._seed = seed;
		},

		rand: function(min, max) {
			var seed = this._seed;
			min = min === undefined ? 0 : min;
			max = max === undefined ? 1 : max;
			this._seed = (seed * 9301 + 49297) % 233280;
			return min + (this._seed / 233280) * (max - min);
		},

		numbers: function(config) {
			var cfg = config || {};
			var min = cfg.min || 0;
			var max = cfg.max || 1;
			var from = cfg.from || [];
			var count = cfg.count || 8;
			var decimals = cfg.decimals || 8;
			var continuity = cfg.continuity || 1;
			var dfactor = Math.pow(10, decimals) || 0;
			var data = [];
			var i, value;

			for (i = 0; i < count; ++i) {
				value = (from[i] || 0) + this.rand(min, max);
				if (this.rand() <= continuity) {
					data.push(Math.round(dfactor * value) / dfactor);
				} else {
					data.push(null);
				}
			}

			return data;
		},

		labels: function(config) {
			var cfg = config || {};
			var min = cfg.min || 0;
			var max = cfg.max || 100;
			var count = cfg.count || 8;
			var step = (max - min) / count;
			var decimals = cfg.decimals || 8;
			var dfactor = Math.pow(10, decimals) || 0;
			var prefix = cfg.prefix || '';
			var values = [];
			var i;

			for (i = min; i < max; i += step) {
				values.push(prefix + Math.round(dfactor * i) / dfactor);
			}

			return values;
		},

		months: function(config) {
			var cfg = config || {};
			var count = cfg.count || 12;
			var section = cfg.section;
			var values = [];
			var i, value;

			for (i = 0; i < count; ++i) {
				value = MONTHS[Math.ceil(i) % 12];
				values.push(value.substring(0, section));
			}

			return values;
		},

		color: function(index) {
			return COLORS[index % COLORS.length];
		},

		transparentize: function(color, opacity) {
			var alpha = opacity === undefined ? 0.5 : 1 - opacity;
			return Color(color).alpha(alpha).rgbString();
		}
	};

	// DEPRECATED
	window.randomScalingFactor = function() {
		return Math.round(Samples.utils.rand(-10, 50));
	};

	// INITIALIZATION

	Samples.utils.srand(Date.now());

}(this));

var setToastOptions = function() {
	toastr.options = {
		"closeButton": true,
		"debug": true,
		"newestOnTop": true,
		"progressBar": true,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"onclick": null,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
};