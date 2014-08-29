/*
 * Created by: Jon Tetzlaff
 * form validation plugin
 * Version: 0.0.9
 */
(function ($) {
    "use strict";

    var animationTime = 350;
    //var inputs = {}; //stores inputs in associative array
    var typeOverride = ["zip", "letters", "number"]; //used to override input type if needed for filtering
    var errorDiv = "<span></span>"; //tooltip html

    /*
     * REGEX expressions from https://github.com/elclanrs/jq-idealforms
     */
    var filters = {
        'required': {
            regex: /.+/,
            error: "This is a required field."
        },
        'password': {
            //regex: /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/,
            regex: /.+/,
            error: "Password field is required."
        },
        'number': {
            regex: /^\d*[0-9]\d*$/,
            error: "Only numbers allowed. No Spaces."
        },
        'letters': {
            regex: /^[A-Za-z]{1,}$/,
            error: "Only letters allowed. No Spaces."
        },
        'email': {
            regex: /[^@]+@[^@]/,
            error: "Please enter a valid email (Ex. user@gmail.com)."
        },
        'radio': {
            regex: function (val, groupName) {
                return $('input[name="' + groupName + '"]:checked').length > 0;
            },
            error: "You must select an option."
        },
        'tel': {
            regex: /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/, //accepted formats (714)3455967, 7152349456, 712-345-3456
            error: "Please enter a valid US phone number (Ex. 555-345-3445)."
        },
        'zip': {
            regex: /^\d{5}$|^\d{5}-\d{4}$/,
            error: "Please enter a valid zip (Ex. 34567 or 34567-3454)."
        },
        'url': {
            regex: /^(?:(ftp|http|https):\/\/)?(?:[\w\-]+\.)+[a-z]{2,6}([\:\/?#].*)?$/i,
            error: "Please enter a valid URL."
        },
        'min': {
            regex: function (val, min) {
                return val >= min;
            },
            error: "Must be greater than or equal to {0}."
        },
        'max': {
            regex: function (val, max) {
                return val <= max;
            },
            error: "Must be less than or equal to {0}."
        },
        "match": {
            regex: function (val, selector) {
                var $match = $(selector);

                if ($match.length && val === $(selector).val().trim())
                    return true;
                else
                    return false;
            },
            error: "This field must match <strong>{0}</strong>."
        }
    };

    // store any custom regex filters
    var customFilters = {};

    var methods = {

        init: function (options) {
            //default settings
            var settings = $.extend({
                success: "", //success callback
                error: "", //error callback
                validate: "", //custom validate function
                parentElement: "", //parent element to attach error class too
                validationErrors: true, //have helpful tooltips popup
                errorClass: "input-validation-error",
                validationErrorClass: "field-validation-error",
                filter: "", //any valid selector (only validate elements within the filter)
                form: "", //any valid selector,
                extend: undefined,
                submitOnSuccess: false
            }, options);

            var $form,
                $filter,
                $this = this;

            if (settings.form.length > 0)
                $form = $this.find(settings.form);
            else
                $form = $this;

            //form cannot be found, stop execution
            if ($form.length === 0)
                return;

            //make sure to stop default browser validation
            $form.attr("novalidate", "novalidate");

            //extend the filtering
            if (typeof settings.extend !== "undefined")
                methods.extend(settings.extend);

            //store settings
            $this.data("settings", settings);
            //store form
            $this.data("form", $form);

            //filter down inputs
            if (settings.filter)
                $filter = $this.find(settings.filter);
            else
                $filter = $form;

            //store filter
            $this.data("filter", $filter);

            methods.addInputs.apply(this);
            methods.validate.apply(this);
        },

        // parse and add input filters for validation
        addInputs: function () {
            var settings = this.data("settings"),
                $form = this.data("form"),
                $filter = this.data("filter"),
                inputs = {};

            //find fields in form, store them in inputs object
            $filter.find("input:not([type='hidden'], [type='submit']), textarea, select").each(function () {
                var $element = $(this);
                var field = {}; //store field values
                field.element = $element;
                field.filters = [];
                field.disabled = false;
                var filtersString = $element.attr("data-filters"); //store filters

                if (settings.validationErrors) 
                    $(errorDiv).insertAfter($element).addClass(settings.validationErrorClass);

                //check type of input
                if ($element.is("select"))
                    field.type = "select";
                else if ($element.is("checkbox"))
                    field.type = "checkbox";
                else if ($element.is(":radio")) {
                    field.type = "radio";
                    field.groupName = $element.attr("name");
                    field.filters.push({
                        key: "radio",
                        args: $element.attr("name")
                    });
                }
                else if ($element.attr("type")) {
                    field.type = $element.attr("type");

                    // add type to filters if it exists
                    if(filters[field.type]) {
                        field.filters.push({
                            type: true,
                            key: $element.attr("type")
                        });
                    }
                }

                //check to see if field is required
                if ($element.attr("required") !== undefined) {
                    field.filters.push({
                        key: "required"
                    });
                }
                //check if min and max are set
                if ($element.attr("max") !== undefined) {
                    var max = parseInt($element.attr("max"), 10);

                    field.filters.push({
                        key: "max",
                        args: max,
                        replace: max
                    });
                }
                if ($element.attr("min") !== undefined) {
                    var min = parseInt($element.attr("min"), 10);

                    field.filters.push({
                        key: "min",
                        args: min,
                        replace: min
                    });
                }

                //check to see if filtering of field is required
                if (filtersString) {
                    var tempFilters = filtersString.split(",");
                    for (var i = 0; i < tempFilters.length; i++) {
                        //if in array, override type
                        if ($.inArray(tempFilters[i], typeOverride) !== -1) {
                            field.type = tempFilters[i];
                            // find entered filter from above and remove
                            for (var z = 0; z < field.filters.length; z++) {
                                if (field.filters[z].type) {
                                    field.filters.splice(z, 1);
                                    break;
                                }
                            }
                            field.filters.push({
                                key: tempFilters[i]
                            });
                        }
                        //parse filter
                        else {
                            // pass filter to parser
                            var filtObj = methods.parseFilter(tempFilters[i]);
                            // only add filter if it is valid
                            if(filtObj)
                                field.filters.push(filtObj);
                        }
                    }
                }
                //insert field into array
                if ($element.attr("name"))
                    inputs[methods.cleanseName($element.attr("name"))] = field;
            });

            //store inputs
            this.data("inputs", inputs);
        },

        parseFilter: function (filter) {
            var filtObj;

            if (filter.indexOf("{") !== -1) {
                //parse filter arguments
                var filt = filter.substr(0, filter.indexOf("{")),
                    pos = filter.indexOf("{") + 1,
                    innerFilterParts = filter.slice(pos, -1).split("|"),
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
        },

        // add submit listener to form
        validate: function () {
            var formvalidate = this,
                settings = this.data("settings"),
                $form = this.data("form"),
                $filter = this.data("filter"),
                inputs = this.data("inputs");

            var errornumber = 0; //keep track of nummber of errors
            //add listener to form
            $form.on("submit.formvalidate", function (event) {
                event.preventDefault();

                var inputsValidation = methods.validateFilters.apply(formvalidate);
                //console.log(inputsValidation);

                if (typeof settings.validate === "function") {
                    if (!settings.validate($form, inputsValidation.errorNumber))
                        inputsValidation.errorNumber++;
                }

                //if there are no errors, call success function
                if (inputsValidation.errorNumber === 0) {
                    if (typeof settings.success === "function")
                        settings.success(event);

                    if (!settings.submitOnSuccess)
                        event.preventDefault();
                }
               //else call error function
                else {
                    event.preventDefault();

                    if (typeof settings.error === "function")
                        settings.error(event);

                    $form.find("." + settings.errorClass).first().focus();
                }
            });
        },

        // go through inputs and validate with given filters
        validateFilters: function () {
            var $form = this.data("form"),
                inputs = this.data("inputs"),
                settings = this.data("settings"),
                errornumber = 0;

            function applyError(inputFilter, currentFilter, input) {
                if (settings.validationErrors) {
                    var error = currentFilter.error;
                    if (typeof inputFilter.replace !== "undefined")
                        error = currentFilter.error.replace("{0}", inputFilter.replace);

                    //console.log(error, inputFilters[i]);

                    methods.changeTooltip.apply($form, [input.element.parent().find("." + settings.validationErrorClass), error]);
                }
            }

            for (var key in inputs) {
                var validated = true;

                // make sure input is not disabled
                if (!inputs[key].disabled && !inputs[key].element.is(":disabled")) {
                    var inputFilters = inputs[key].filters,
                        val = inputs[key].element.val().trim();

                    //console.log(inputFilters);
                    // do required filter
                    for (var z = 0; z < inputFilters.length; z++) {
                        if (inputFilters[z].key === "required") {
                            validated = filters["required"].regex.test(val);
                            if(!validated) {
                                applyError(inputFilters[z], filters["required"], inputs[key]);
                                errornumber++;
                            }
                            break;
                        }
                    }

                    // go through each of the inputs filters
                    for (var i = 0; i < inputFilters.length; i++) {
                        var fltrs = filters;
                        if (inputFilters[i].custom)
                            fltrs = customFilters;

                        var currentFilter = fltrs[inputFilters[i].key];
                        //console.log(inputFilters[i], currentFilter);
                        // make sure there is a value to test
                        if (val.length > 0 && currentFilter) {
                            var valid;
                            if (typeof currentFilter.regex === "function")
                                valid = currentFilter.regex(val, inputFilters[i].args);
                            else
                                valid = currentFilter.regex.test(val);

                            if (!valid) {
                                if (settings.validationErrors) {
                                    applyError(inputFilters[i], currentFilter, inputs[key]);
                                }
                                validated = false;
                                errornumber++;
                            }
                        }
                    }
                }

                // add/remove errors
                if (!validated) methods.fieldError.apply(this, [inputs[key]]);
                else methods.removeFieldError.apply(this, [inputs[key]]);
            }

            return {
                valid: errornumber === 0,
                errorNumber: errornumber
            };
        },

        fieldError: function (input) {
            var $form = this.data("form"),
                settings = this.data("settings");

            methods.errorListener.apply(this, [input]);

            //if they have specified a parent, add the error class to it
            if (settings.parentElement)
                input.element.parents(settings.parentElement).addClass(settings.errorClass);

            //console.log(inputs[key].type, inputs[key].groupName)
            if (input.type !== "radio") {
                input.element.addClass(settings.errorClass).attr("data-valid", "false");
            }
            else {
                $('input[name="' + input.groupName + '"]').addClass(settings.errorClass).attr("data-valid", "false");
            }
        },

        // remove error from input
        removeFieldError: function (input) {
            var $form = this.data("form"),
                settings = this.data("settings");

            var removeError = 0;
            if (input !== "radio") {
                input.element.attr("data-valid", "true");

                input.element.parent().find("input:not([type='hidden']), textarea, select").each(function () {
                    if ($(this).attr("data-valid") === "false")
                        removeError++;
                });

                input.element.removeClass(settings.errorClass);
            }
            else {
                $('input[name="' + input.groupName + '"]').removeClass(settings.errorClass).attr("data-valid", "true");
            }

            if (settings.parentElement && removeError === 0)
                input.element.parents(settings.parentElement).removeClass(settings.errorClass);
        },

        // add proper listeners to inputs on error
        errorListener: function (field) {
            var settings = this.data("settings");

            //just add click events to checkboxes, radio buttons, and selects
            if (field.type === "checkbox" ||
                field.type === "radio" ||
                field.type === "select") {
                //console.log(field);
                var $selector = field.element;
                if (field.groupName)
                    $selector = $('input[name="' + field.groupName + '"]');

                //remove all listeners
                $selector.off(".formvalidate");

                $selector.on("click.formvalidate change.formvalidate", function () {
                    field.element.parents(settings.parentElement).removeClass(settings.errorClass);
                    $selector.removeClass(settings.errorClass);

                    if (settings.validationErrors)
                        field.element.parent().find(".field-validation-error").hide();

                    $selector.off(".formvalidate");
                });

            }
                //add keydown listeners to other inputs
            else {
                //remove all listeners
                field.element.off(".formvalidate");

                field.element.on("keydown.formvalidate change.formvalidate", function (event) {
                    if (event.keyCode !== 9 && event.keyCode !== 32) { //dont unvalidate if tab or space key is pressed
                        var $this = $(this);
                        $this.parents(settings.parentElement).removeClass(settings.errorClass);
                        $this.removeClass(settings.errorClass);

                        if (settings.validationErrors)
                            $this.parent().find(".field-validation-error").hide();

                        $this.off(".formvalidate");
                    }
                });
            }
        },

        // update form input fields
        update: function () {
            var $form = this.data("form"),
                inputs = this.data("inputs"),
                settings = this.data("settings");

            for (var key in inputs) {
                if (inputs[key] !== "radio")
                    inputs[key].element.removeAttr("data-valid").removeClass(settings.errorClass);
                else
                    $('input[name="' + inputs[key].groupName + '"]').removeClass(settings.errorClass).removeAttr("data-valid");

                if (settings.parentElement)
                    inputs[key].element.parents(settings.parentElement).removeClass(settings.errorClass);
            }

            this.removeData("inputs");
            methods.addFilters.apply(this);
        },

        //extend the filters
        extend: function (newFilter) {
            customFilters = $.extend(customFilters, newFilter);
        },

        //clear name of invalid characters
        cleanseName: function (name) {
            return name.replace(/[\[\]]+/g, "");
        },

        // update the tooltip text
        changeTooltip: function ($el, html) {
            $el.html(html);
        },

        //disable input validation
        disable: function (fields) {
            var inputs = this.data("inputs");
            for (var i = 0; i < fields.length; i++) {
                var name = methods.cleanseName(fields[i].name);
                if (typeof inputs[name] !== "undefined") {
                    inputs[name].disabled = true;
                }
            }
        },

        //enable input validation
        enable: function (fields) {
            var inputs = this.data("inputs"),
                $form = this.data("form");
            for (var i = 0; i < fields.length; i++) {
                var name = methods.cleanseName(fields[i].name);
                if (typeof inputs[name] !== "undefined") {
                    inputs[name].disabled = false;
                }
            }
        },

        //delete and reset vars
        destroy: function () {
            var $form = this.data("form");
            //console.log("form");
            if ($form) {
                $form.off(".formvalidate");
                $form.find(".form-error").remove();
                //remove stored data
                this.removeData("inputs").removeData("form").removeData("filter").removeData("settings");
                return true;
            }

            return false;
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
