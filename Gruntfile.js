module.exports = function (grunt) {
  // See http://www.jshint.com/docs/#strict
  "use strict";

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    jshint: {
      files: ['**/*.js', '**/*.json', '.jshintrc', '!node_modules/**/*.js', '!node_modules/**/*.json', '!public/**/*.js', '!public/**/*.json', '!frontendtests/lib/**/*.js', '!frontendtests/lib/**/*.json', '!locales/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    watch: {
      files: ['<%= jshint.files %>', '**/*.jade'],
      tasks: ['default']
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          // Require blanket wrapper here to instrument other required
          // files on the fly. 
          //
          // NB. We cannot require blanket directly as it
          // detects that we are not running mocha cli and loads differently.
          //
          // NNB. As mocha is 'clever' enough to only run the tests once for
          // each file the following coverage task does not actually run any
          // tests which is why the coverage instrumentation has to be done here
          require: 'blanket',
          colors: true
        },
        src: ['test/**/*.js']
      },
      coverage: {
        options: {
          reporter: 'html-cov',
          // use the quiet flag to suppress the mocha console output
          quiet: true,
          // specify a destination file to capture the mocha
          // output (the quiet option does not suppress this)
          captureFile: 'coverage.html'
        },
        src: ['test/**/*.js']
      },
      'travis-cov': {
        options: {
          reporter: 'travis-cov'
        },
        src: ['test/**/*.js']
      }
    },
    qunit: {
      files: ['frontendtests/*.html']
    },
    less: {
      minify: {
        options: {
          cleancss: true,
          report: 'min'
        },
        files: {
          'public/stylesheets/screen.css': [
            'public/stylesheets/vendor/fullcalendar.css',
            'public/stylesheets/less/bootstrap.less',
            'public/stylesheets/vendor/datepicker.css',
            'public/stylesheets/less/bootstrap-markdown.less',
            'public/stylesheets/vendor/font-awesome.min.css',
            'public/stylesheets/less/pick-a-color-patched.less',
            'public/stylesheets/vendor/shCoreDefault.css',
            'public/stylesheets/vendor/jquery.dataTables.css',
            'public/stylesheets/partials/agora.less'
          ]
        }
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      de: {
        src: [
          'locales/frontend_de.js',
          'node_modules/jquery/dist/jquery.js',
          'public/clientscripts/global/bootstrap.js',
          'public/clientscripts/global/bootstrap-datepicker.js',
          'public/clientscripts/global/bootstrap-markdown-patched.js',
          'public/clientscripts/global/markdown.js',
          'node_modules/moment-timezone/node_modules/moment/min/moment.min.js',
          'public/clientscripts/global/fullcalendar-patched.js',
          'public/clientscripts/global/de.js', // for fullcalendar
          'public/clientscripts/global/tinycolor-0.9.15.min.js', // for pick-a-color
          'public/clientscripts/global/pick-a-color.js',
          'public/clientscripts/global/bootstrap-datepicker.de.js',
          'public/clientscripts/global/jquery.validate-1.11.1.js',
          'public/clientscripts/global/additional-methods-1.11.1.js',
          'public/clientscripts/global/messages_de.js',
          'public/clientscripts/global/methods_de.js',
          'public/clientscripts/global/bootstrap-timepicker.js',
          'public/clientscripts/global/agora.js'
        ],
        dest: 'public/clientscripts/global_de.js'
      },
      en: {
        src: [
          'locales/frontend_en.js',
          'node_modules/jquery/dist/jquery.js',
          'public/clientscripts/global/bootstrap.js',
          'public/clientscripts/global/bootstrap-datepicker.js',
          'public/clientscripts/global/bootstrap-markdown-patched.js',
          'public/clientscripts/global/markdown.js',
          'node_modules/moment-timezone/node_modules/moment/min/moment.min.js',
          'public/clientscripts/global/fullcalendar-patched.js',
          'public/clientscripts/global/en-gb.js', // for fullcalendar
          'public/clientscripts/global/tinycolor-0.9.15.min.js', // for pick-a-color
          'public/clientscripts/global/pick-a-color.js',
          'public/clientscripts/global/jquery.validate-1.11.1.js',
          'public/clientscripts/global/additional-methods-1.11.1.js',
          'public/clientscripts/global/bootstrap-timepicker.js',
          'public/clientscripts/global/agora.js'
        ],
        dest: 'public/clientscripts/global_en.js'
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-less');

  // Default task.
  grunt.registerTask('default', ['less', 'concat', 'jshint', 'qunit', 'mochaTest']);

  // Travis-CI task
  grunt.registerTask('travis', ['default']);

};
