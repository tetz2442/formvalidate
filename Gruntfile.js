module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            production: {
                options: {
                    mangle: {

                    },
                    // remove console.* calls
                    compress: {
                        drop_console: true,
                        hoist_funs: false,
                        hoist_vars: false
                    },
                    sourceMap: true,
                    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */'
                },
                files: {
                    'dist/jquery.formvalidate-0.3.3.min.js': [
                        'jquery.formvalidate-0.3.3.js',
                    ]
                }
            }
        },
        watch: {
            uglify: {
                files: [
                    '*.js'
                ],
                tasks: ['uglify']
            }
        }
    });

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', ['uglify']);

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');

};