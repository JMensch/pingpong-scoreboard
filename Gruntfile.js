/**
* GruntJS configuration file (can have multiple per project/machine/instance)
* Enter plugins, tasks and configurations here
* tutorial - http://bit.ly/1bAVyhx
* tutorial (more in depth) - http://bit.ly/1fhpU9v
* plugins - http://bit.ly/1jJZb8l
*
* To run in new project (assuming node.js and grunt.js installed):
*     $ npm install
*  
* @since 0.2.0
* @date 12/11/13
* @author james@temboconsulting.com
**/

module.exports = function(grunt) {
	var userProfile = process.env.USERPROFILE;
	/*==============================
	=            Config            =
	==============================*/
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		/**
		* Copy all files and folders recursively from dev to prod
		**/
		copy: {
			toOld: {
				files: [{ expand: true, cwd: 'prod/', src:['**'], dest: 'old/', filter: 'isFile' }]
			},
			toProd: {
				files: [{ expand: true, cwd: 'dev/', src:['**'], dest: 'prod/', filter: 'isFile' }]
			},
			templates: {
				files: [{ force: true, expand: true, cwd: "../../templates/", src:['**'], dest: userProfile + "/.grunt-init", filter: 'isFile' }]
			},
		},

		/**
		* Erases contents of folder
		**/
		clean: {
			old: {
				src: ["old/*"]
			},
			prod: {
				src: ["prod/*"]
			},
			templates: {
				options: {force: true} ,
				src: [userProfile + "/.grunt-init/**"]
			}
		},

		/**
		* JSHint
		**/
		jshint: {
			files: ['gruntfile.js', 'prod/js/*.js'],

			options: {
				curly: true,
		        eqeqeq: true,
		        immed: true,
		        latedef: true,
		        newcap: true,
		        noarg: true,
		        sub: true,
		        undef: true,
		        boss: true,
		        eqnull: true,
		        browser: true,
		        force: true
      		},
		    globals: {
		      jQuery: true
		    }
		},
		
		/**
		* CSS linter
		*
		**/
		csslint: {
			options: {
				force: true
			},
			src: ['prod/css/*.css']
		},

		/**
		* Minifies CSS files into one style.min.css
		* 
		**/
		cssmin: {
			minify: {
				options: {
					banner: '/* Minified file */'
				},
				expand: true,
				src: ["prod/css/*.css", '!*.min.css'],
				dest: "",
				ext: ".min.css"
			},
			gen: {
				options: {
					banner: '/* Minified file */'
				},
				expand: true,
				src: ["css/*.css", '!*.min.css'],
				dest: "",
				ext: ".min.css"
			}
		},

		/**
		* Concatenates files
		**/
		concat: {
			prodJS: {
				src: ["prod/js/*.js"],
				dest: "prod/js/script.js"
			},
			// prodCSS: {
			// 	src: ["prod/css/*.css"],
			//	dest: "prod/css/styles.css"
			// }
		},

		/**
		* Compresses prod folder
		**/
		compress: {
			target: {
				files: {
					'prod/pack/<%= pkg.name %>.v<%= pkg.version %>.zip': ['prod/**']
				}
			}
		},

		/**
		* Minifies JS files in prod folder
		**/
		uglify: {
			gen: {
				files: { "js/script.min.js":['js/*.js'] }
			},
			vendor: {
				files: { "js/vendor/vendor.min.js":['js/vendor/*.js'] }
			},
			prod: {
				files: { "prod/js/script.min.js":['prod/js/script.js'] }
			}
		},

		/**
		* Minifies images in prod/
		**/
		imagemin: {
			gen: {
				files: [{ expand: true, cwd: 'img/', src:['**/*.{png,jpg,gif}'], dest: 'img/', }]
			},
			prod: {
				files: [{ expand: true, cwd: 'dev/img/', src:['**/*.{png,jpg,gif}'], dest: 'prod/img/', }]
			}
		},

		/**
		* SCSS compiler
		* Ruby and SASS must be installed!
		**/
		sass: {
			gen: {
				expand: true,
		        cwd: 'public/stylesheets',
		        src: ['*.scss'],
		        dest: 'public/stylesheets',
		        ext: '.css'	
			},
			prod: {
				files: ['dev/css/*.scss'],
			}
		},

		/**
		* Watches SCSS files and autocompiles them into CSS 
		**/
		watch: {
			gen_sass: {
				files: ['public/stylesheets/*.scss'],
				tasks: ['sass:gen'],
			},
			sass: {
				files: ['dev/css/*.scss'],
				tasks: ['sass:prod'],
			}
		}
		
	});

	/*===============================
	=            Plugins            =
	===============================*/
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-imagemin');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');

	/*==============================
	=            Tasks            =
	==============================*/
	/**
	* Default task
	*    runs copy when no params are passed
	*    ~$ grunt
	**/
	grunt.registerTask('default', ['copy']);

	/**
	* Test Task
	*    copies files to new folder, runs JSHint, then compresses the folder
	*    ~$ grunt test
	**/
	grunt.registerTask('test', ['copy', 'jshint', 'compress']);

	/**
	* Move Templates Task
	*    Moves templates in grunt/templates to your hometemplates folder
	*    Relative to grunt/automation/test
	*    ~$ grunt moveTemplates
	**/
	grunt.registerTask('moveTemplates', ['clean:templates', 'copy:templates']);

	/**
	* build task
	* ~$ grunt build
	**/
	grunt.registerTask('build', [
		/**
		* Erases contents of /old
		**/
		'clean:old',
		/**
		 * Copies files in /prod to /old
		 **/
		'copy:toOld', 
		/**
		* Erases contents of /prod
		**/
		'clean:prod',
		/**
		 * Copies files in /dev to /prod
		 **/
		'copy:toProd',
		/**
		 * Lints all non-vendor and non-minified files in /prod/css
		 * Will halt grunt if errors are found
		 **/
		//'csslint', 
		/**
		* Lints all non-vendor JS files in /prod/js
		* Will halt grunt if errors are found
		**/
		//'jshint', 
		/**
		* Concatenates non-vendor JS files in /prod/js
		* to /prod/js/script.js
		**/
		'concat',
		/**
		* Minifies /prod/js/script.js
		**/
		'uglify',
		/**
		* Concats non-vendor CSS files in /prod/css to 
		* styles.css and minifies it
		**/
		'cssmin',
		/**
		* Minifies .jpg, .png, .gif images in from /dev/img to /prod/img
		**/
		'imagemin',
	]);
};