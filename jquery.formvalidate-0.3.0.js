/*!
 * Created by: Jon Tetzlaff
 * form validation plugin
 * Version: 0.2.0
 */
(function ($) {
    'use strict';

    // string trim polyfill
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
    if (!String.prototype.trim) {
        (function () {
            // Make sure we trim BOM and NBSP
            var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
            String.prototype.trim = function () {
                return this.replace(rtrim, '');
            };
        })();
    }

    /*
     * REGEX expressions from https://github.com/elclanrs/jq-idealforms
     */
    var filters = {
        'required': {
            regex: /.+/,
            error: 'This is a required field.'
        },
        'number': {
            regex: /^\d*[0-9]\d*$/,
            error: 'Only numbers allowed. No Spaces.'
        },
        'letters': {
            regex: /^[A-Za-z]{1,}$/,
            error: 'Only letters allowed. No Spaces.'
        },
        'email': {
            regex: /[^@]+@[^@]/,
            error: 'Please enter a valid email (Ex. user@gmail.com).'
        },
        'radio': {
            regex: function (val, groupName) {
                return $('input[name="' + groupName + '"]:checked').length > 0;
            },
            error: 'You must select an option.'
        },
        'telephone': {
            regex: /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/, //accepted formats (714)3455967, 7152349456, 712-345-3456
            error: 'Please enter a valid US phone number (Ex. 555-345-3445).'
        },
        'zip': {
            regex: /^\d{5}$|^\d{5}-\d{4}$/,
            error: 'Please enter a valid zip (Ex. 34567 or 34567-3454).'
        },
        'url': {
            regex: /^(?:(ftp|http|https):\/\/)?(?:[\w\-]+\.)+[a-z]{2,6}([\:\/?#].*)?$/i,
            error: 'Please enter a valid URL.'
        },
        'min': {
            regex: function (val, min) {
                return val >= min;
            },
            error: 'Must be greater than or equal to {0}.'
        },
        'max': {
            regex: function (val, max) {
                return val <= max;
            },
            error: 'Must be less than or equal to {0}.'
        },
        'match': {
            regex: function (val, selector) {
                var $match = $(selector);

                if ($match.length && val === $(selector).val().trim())
                    return true;
                else
                    return false;
            },
            error: 'This field must match <strong>{0}</strong>.'
        }
    };

    // store any custom regex filters
    var customFilters = {},
        defaultSettings = {
            success: '', //success callback
            error: '', //error callback
            validate: '', //custom validate function
            parentElement: '', //parent element to attach error class too
            validationErrors: true, //have helpful tooltips popup
            errorClass: 'input-validation-error',
            validationErrorClass: 'field-validation-error',
            filter: '', //any valid selector (only validate elements within the filter)
            form: '', //any valid selector,
            extend: undefined,
            submitOnSuccess: false
        };

    function FormValidate($form, options) {
        this._init($form, options);
    }

    FormValidate.prototype._init = function($form, options) {
        this._settings = $.extend(defaultSettings, options);
        this._settings.defaultErrorClass = 'js-field-validation-error';

        if (this._settings.form.length > 0)
            this._$form = $form.find(this._settings.form);
        else
            this._$form = $form;

        //form cannot be found, stop execution
        if (this._$form.length === 0)
            return;

        //make sure to stop default browser validation
        this._$form.attr('novalidate', 'novalidate');

        //extend the filtering
        if (typeof this._settings.extend === 'object')
            methods.extend(this._settings.extend);

        //filter down inputs
        if (this._settings.filter)
            this._$filter = this._$form.find(this._settings.filter);
        else
            this._$filter = this._$form;

        this._addInputs();
        this._validate();
    };

    FormValidate.prototype._addInputs = function() {
        var self = this;
        this._inputs = {};

        //find fields in form, store them in inputs object
        this._$filter.find('input:not([type="hidden"], [type="submit"]), textarea, select').each(function () {
            var $el = $(this),
                field = {
                    $el: $el,
                    filters: [],
                    disabled: false,
                    type: 'text'
                },
                filtersString = $el.attr('data-validate-filters');

            if ($el.attr('name')) {
                // remove error span from appearing on field
                if ($el.attr('data-validate-noerror'))
                    field.hasErrorSpan = true;

                //check type of input
                if ($el.is('select'))
                    field.type = 'select';
                else if ($el.is(':radio')) {
                    field.type = 'radio';
                    field.groupName = $el.attr('name');
                    field.filters.push({
                        key: 'radio',
                        args: $el.attr('name')
                    });
                }
                else if ($el.attr('type') || $el.attr('data-validate-type')) {
                    console.log(field);
                    field.type = $el.attr('data-validate-type') || $el.attr('type');

                    // add type to filters if it exists
                    if (filters[field.type]) {
                        field.filters.push({
                            type: true,
                            key: field.type
                        });
                    }
                }

                //check to see if field is required
                if ($el.attr('required')) {
                    field.filters.push({
                        key: 'required'
                    });
                }
                //check if min and max are set
                if ($el.attr('max')) {
                    var max = parseInt($el.attr('max'), 10);

                    field.filters.push({
                        key: 'max',
                        args: max,
                        replace: max
                    });
                }
                if ($el.attr('min')) {
                    var min = parseInt($el.attr('min'), 10);

                    field.filters.push({
                        key: 'min',
                        args: min,
                        replace: min
                    });
                }

                //check to see if filtering of field is required
                if (filtersString) {
                    var tempFilters = filtersString.split(',');
                    for (var i = 0; i < tempFilters.length; i++) {
                        // pass filter to parser
                        var filtObj = self._parseFilter(tempFilters[i]);
                        // only add filter if it is valid
                        if (filtObj)
                            field.filters.push(filtObj);
                    }
                }

                // add to inputs
                self._inputs[self.cleanseName($el.attr('name'))] = field;
            }
        });
    };

    FormValidate.prototype._parseFilter = function(filter) {
        var filtObj;

        if (filter.indexOf('{') !== -1) {
            //parse filter arguments
            var filt = filter.substr(0, filter.indexOf('{')),
                pos = filter.indexOf('{') + 1,
                innerFilterParts = filter.slice(pos, -1).split('|'),
                args,
                replace;

            // find args and replace to pass into filter
            if (innerFilterParts.length)
                args = innerFilterParts[0];
            if (innerFilterParts.length > 1)
                replace = innerFilterParts[1];

            filtObj = {
                key: filt,
                args: args,
                replace: replace
            };
        }
        //simple filter
        else {
            filtObj = {
                key: filter
            };
        }

        if (filters[filtObj.key])
            return filtObj;
        else if (customFilters[filtObj.key])
            filtObj.custom = true;
        else
            filtObj = undefined;

        return filtObj;
    };

    // adds listener to form for submission
    FormValidate.prototype._validate = function() {
        var self = this,
            errornumber = 0; //keep track of number of errors

        //add listener to form
        self._$form.on('submit.formvalidate', function (e) {
            e.preventDefault();

            var inputsValidation = self._validateForm();
            //console.log(inputsValidation);

            if (typeof self._settings.validate === 'function') {
                if (!self._settings.validate(inputsValidation.errorNumber))
                    inputsValidation.errorNumber++;
            }

            //if there are no errors, call success function
            if (!inputsValidation.errorNumber) {
                if (typeof self._settings.success === 'function')
                    self._settings.success(e);

                if (!self._settings.submitOnSuccess)
                    e.preventDefault();
            }
            //else call error function
            else {
                e.preventDefault();

                if (typeof self._settings.error === 'function')
                    self._settings.error(e);

                self._$form.find('.' + self._settings.errorClass).first().focus();
            }
        });
    };

    FormValidate.prototype._validateForm = function() {
        var errorNumber = 0,
            self = this,
            inputs = this._inputs;

        for (var key in inputs) {
            var validated = true;

            console.log('validating', inputs[key]);
            // make sure input is not disabled
            if (!inputs[key].disabled && !inputs[key].$el.is(':disabled')) {
                console.log('validate', inputs[key]);
                var inputFilters = inputs[key].filters,
                    val = inputs[key].$el.val().trim();

                //console.log(inputFilters);
                // do required filter
                for (var z = 0; z < inputFilters.length; z++) {
                    if (inputFilters[z].key === 'required') {
                        validated = filters['required'].regex.test(val);
                        if (!validated) {
                            self._applyError(inputFilters[z], filters['required'], inputs[key] );
                            errorNumber++;
                        }
                        break;
                    }
                }

                // go through each of the inputs filters
                for (var i = 0; i < inputFilters.length; i++) {
                    var fltrs = filters;
                    if (inputFilters[i].custom)
                        fltrs = customFilters;

                    if (inputFilters[i].key !== 'required') {
                        console.log(inputFilters[i].key);
                        var currentFilter = fltrs[inputFilters[i].key];
                        //console.log(inputFilters[i], currentFilter);
                        // make sure there is a value to test
                        if (val.length > 0 && currentFilter) {
                            var valid;
                            if (typeof currentFilter.regex === 'function')
                                valid = currentFilter.regex(val, inputFilters[i].args);
                            else
                                valid = currentFilter.regex.test(val);

                            if (!valid) {
                                if (self._settings.validationErrors) {
                                    self._applyError(inputFilters[i], currentFilter, inputs[key]);
                                }
                                validated = false;
                                errorNumber++;
                            }
                        }
                    }
                }
            }

            // add/remove errors
            if (!validated) this._fieldError(inputs[key]);
            else this._removeFieldError(inputs[key]);
        }

        return {
            valid: errorNumber === 0,
            errorNumber: errorNumber
        };
    };

    FormValidate.prototype._applyError = function(inputFilter, currentFilter, input) {
        if (this._settings.validationErrors && !input.hasErrorSpan) {
            var error = currentFilter.error;
            if (typeof inputFilter.replace !== 'undefined')
                error = currentFilter.error.replace('{0}', inputFilter.replace);

            //console.log(error, inputFilters[i]);
            var $error = input.$el.parent().find('.' + this._settings.defaultErrorClass);

            if((input.$el.is(':checkbox') || input.$el.is(':radio')) && input.$el.parent().is('label'))
                $error = input.$el.parent().parent().find('.' + this._settings.defaultErrorClass);

            if (!$error.length) {
                $error = $('<span/>').addClass(this._settings.validationErrorClass).addClass(this._settings.defaultErrorClass);

                if(input.$el.is(':checkbox') || input.$el.is(':radio')) {
                    if(input.$el.next().is('label')) {
                        input.$el.next().after($error);
                    }
                    else
                        input.$el.parent().after($error);
                }
                else
                    input.$el.after($error);
            }

            this._changeTooltip($error, error);
        }
    };

    FormValidate.prototype._changeTooltip = function($error, message) {
        $error.html(message);
    };

    FormValidate.prototype._fieldError = function(input) {
        this._errorListener(input);

        //if they have specified a parent, add the error class to it
        if (this._settings.parentElement)
            input.$el.parents(this._settings.parentElement).addClass(this._settings.errorClass);

        //console.log(inputs[key].type, inputs[key].groupName)
        if (input.type !== 'radio') {
            input.$el.addClass(this._settings.errorClass).attr('data-valid', 'false');
        }
        else {
            $('input[name="' + input.groupName + '"]').addClass(this._settings.errorClass).attr('data-valid', 'false');
        }
    };

    FormValidate.prototype._removeFieldError = function(input) {
        var removeError = 0;
        if (input !== 'radio') {
            input.$el.attr('data-valid', 'true');

            input.$el.parent().find('input:not([type="hidden"]), textarea, select').each(function () {
                if ($(this).attr('data-valid') === 'false')
                    removeError++;
            });

            input.$el.removeClass(this._settings.errorClass);
        }
        else {
            $('input[name="' + input.groupName + '"]').removeClass(this._settings.errorClass).attr('data-valid', 'true');
        }

        if (this._settings.parentElement && removeError === 0)
            input.$el.parents(this._settings.parentElement).removeClass(this._settings.errorClass);
    };

    FormValidate.prototype._errorListener = function(field) {
        var self = this;

        //just add click events to checkboxes, radio buttons, and selects
        if (field.type === 'checkbox' ||
            field.type === 'radio' ||
            field.type === 'select') {
            //console.log(field);
            var $selector = field.$el;
            if (field.groupName)
                $selector = this._$form.find('input[name="' + field.groupName + '"]');

            //remove all listeners
            $selector.off('.formvalidate');

            $selector.one('click.formvalidate change.formvalidate', function (e) {
                field.$el.parents(self._settings.parentElement).removeClass(self._settings.errorClass);
                $selector.removeClass(self._settings.errorClass);

                if (self._settings.validationErrors && !field.hasErrorSpan)
                    field.$el.next().remove();
            });

        }
        //add keydown listeners to other inputs
        else {
            //remove all listeners
            field.$el.off('.formvalidate');

            field.$el.one('keydown.formvalidate change.formvalidate', function (e) {
                if (e.keyCode !== 9 && e.keyCode !== 32) { //dont unvalidate if tab or space key is pressed
                    var $this = $(this);
                    $this.parents(self._settings.parentElement).removeClass(self._settings.errorClass);
                    $this.removeClass(self._settings.errorClass);

                    if (self._settings.validationErrors && !field.hasErrorSpan)
                        $this.next().remove();
                }
            });
        }
    };

    /* PUBLIC METHODS */

    FormValidate.prototype.update = function() {
        for (var key in this._inputs) {
            if (this._inputs[key] !== 'radio')
                this._inputs[key].element.removeAttr('data-valid').removeClass(this._settings.errorClass);
            else
                $('input[name="' + this._inputs[key].groupName + '"]').removeClass(this._settings.errorClass).removeAttr('data-valid');

            if (this._settings.parentElement)
                this._inputs[key].element.parents(this._settings.parentElement).removeClass(this._settings.errorClass);
        }

        this._addInputs();
    };

    //clear name of invalid characters
    FormValidate.prototype.cleanseName = function (name) {
        return name.replace(/[\[\]]+/g, '');
    };

    //disable input validation
    FormValidate.prototype.disable = function (fields) {
        for (var i = 0; i < fields.length; i++) {
            var name = this.cleanseName(fields[i].name);
            if (typeof this._inputs[name] !== 'undefined') {
                this._inputs[name].disabled = true;
            }
        }
    };

    //enable input validation
    FormValidate.prototype.enable = function (fields) {
        for (var i = 0; i < fields.length; i++) {
            var name = this.cleanseName(fields[i].name);
            if (typeof this._inputs[name] !== 'undefined') {
                this._inputs[name].disabled = false;
            }
        }
    };

    //delete and reset vars
    FormValidate.prototype.destroy = function () {
        if (this._$form) {
            this._$form.off('.formvalidate');
            this._$form.find('.' + this._settings.defaultErrorClass).remove();
            this._$form.find('.' + this._settings.errorClass).removeClass(this._settings.errorClass);

            // remove event listeners
            for (var key in this._inputs) {
                var field = this._inputs[key];

                if (field.type === 'checkbox' ||
                    field.type === 'radio' ||
                    field.type === 'select') {
                    //console.log(field);
                    var $selector = field.$el;
                    if (field.groupName)
                        $selector = this._$form.find('input[name="' + field.groupName + '"]');

                    //remove all listeners
                    $selector.off('.formvalidate').removeAttr('data-valid');;
                }
                else {
                    //remove all listeners
                    field.$el.off('.formvalidate').removeAttr('data-valid');
                }
            }

            return true;
        }

        return false;
    };

    var methods = {

        init: function (options) {
            this.each(function() {
                var $this = $(this);

                $this.data('formvalidate', new FormValidate($this, options ));
            });

            return this;
        },

        //extend the filters
        extend: function (newFilter) {
            customFilters = $.extend(customFilters, newFilter);
        },

        //disable input validation
        disable: function (fields) {
            this.each(function() {
                var $this = $(this),
                    formValidate = $this.data('formvalidate');

                formValidate.disable(fields);
            });

            return this;
        },

        //enable input validation
        enable: function (fields) {
            this.each(function() {
                var $this = $(this),
                    formValidate = $this.data('formvalidate');

                formValidate.enable(fields);
            });

            return this;
        },

        //delete and reset vars
        destroy: function () {
            this.each(function() {
                var $this = $(this),
                    formValidate = $this.data('formvalidate');

                formValidate.destroy();
            });

            return this;
        }

    };

    $.fn.formvalidate = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.formvalidate');
        }

        return this;
    };
})(jQuery);