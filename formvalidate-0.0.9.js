/*
 * Created by: Jon Tetzlaff
 * form validation plugin
 */
(function ($) {
    var animationTime = 350;
    //var inputs = {}; //stores inputs in associative array
    var typeOverride = new Array("zip", "letters", "number"); //used to override input type if needed for filtering
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
        },
        "dateday": {
            regex: function (val) {
                var num = parseInt(val, 10);
                if (num > 0 && num <= 31)
                    return true;
                else
                    return false;
            },
            error: "These fields must be a valid birth date (ex. 12/1/1989)"
        },
        "datemonth": {
            regex: function (val) {
                var num = parseInt(val, 10);
                if (num > 0 && num <= 12)
                    return true;
                else
                    return false;
            },
            error: "These fields must be a valid birth date (ex. 12/1/1989)"
        },
        "dateyear": {
            regex: function (val) {
                var num = parseInt(val, 10);
                var date = new Date();
                if (num > 1900 && num < date.getFullYear())
                    return true;
                else
                    return false;
            },
            error: "These fields must be a valid birth date (ex. 12/1/1989)"
        }
    };

    // store any custom regex filters
    var customFilters = {};

    var methods = {

        init: function (options) {
            //default settings
            var settings = $.extend({
                success: "", //success callback
                fail: "", //fail callback
                validate: "", //custom validate function
                parentElement: "", //parent element to attach error class too
                tooltips: true, //have helpful tooltips popup
                //tooltipPosition: "right", //position tooltips (right, bottom)
                errorClass: "input-validation-error",
                tooltipErrorClass: "field-validation-error",
                filter: "", //any valid selector (only validate elements within the filter)
                form: "", //any valid selector,
                extend: undefined,
                submitOnSuccess: false
            }, options);

            var form,
                filter,
                $this = this;

            if (settings.form.length > 0)
                form = $this.find(settings.form);
            else
                form = $this;

            //form cannot be found, stop execution
            if (form.length === 0)
                return;

            //make sure to stop default browser validation
            form.attr("novalidate", "novalidate");

            //extend the filtering
            if (typeof settings.extend !== "undefined")
                methods.extend(settings.extend);

            //store settings
            $this.data("settings", settings);
            //store form
            $this.data("form", form);

            //filter down inputs
            if (settings.filter)
                filter = $this.find(settings.filter);
            else
                filter = form;

            //store filter
            $this.data("filter", filter);

            methods.addFilters.apply(this);
            methods.validate.apply(this);
        },

        addFilters: function () {
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
                //field.filters = {};
                field.disabled = false;
                var filtersString = $element.attr("data-filters"); //store filters

                //if (settings.tooltips)
                //    $element.parent().css({ position: "relative" });
                //insert tooltips if wanted
                if (settings.tooltips) {
                    //if there are multiple inputs, only insert one tooltip
                    //if ($element.parent().find("input, select, textarea").length > 1)
                    //    $element.parent().append($(errorDiv).addClass(settings.tooltipErrorClass));
                    //else
                        $(errorDiv).insertAfter($element).addClass(settings.tooltipErrorClass);
                }

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

                    field.filters.push({
                        key: $element.attr("type")
                    });
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
                        if (jQuery.inArray(tempFilters[i], typeOverride) !== -1) {
                            //TODO: remove inserted type from above
                            field.type = tempFilters[i];
                            field.filters.push({
                                key: tempFilters[i]
                            });
                        }
                        //parse filter
                        else {
                            if (tempFilters[i].indexOf("{") !== -1) {
                                //parse filter arguments
                                var filt = tempFilters[i].substr(0, tempFilters[i].indexOf("{")),
                                    pos = tempFilters[i].indexOf("{") + 1,
                                    innerFilterParts = tempFilters[i].slice(pos, -1).split("|"),
                                    args,
                                    replace;

                                // find args and replace to pass into filter
                                if (innerFilterParts.length)
                                    args = innerFilterParts[0];
                                if (innerFilterParts.length > 1)
                                    replace = innerFilterParts[1];

                                field.filters.push({
                                    key: filt,
                                    args: args,
                                    replace: replace
                                });
                            }
                            //simple filter
                            else {
                                field.filters.push({
                                    key: filters[i]
                                });
                            }

                            //TODO: update custom filter code
                            if (typeof filters[tempFilters[i]] === "undefined") {
                                //custom filter array
                                //field.customFilters.push(tempFilters[i]);
                            }
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

                var inputsValidation = methods.validateFilters.apply(formvalidate, [filters]);
                console.log(inputsValidation);

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
                    //else call fail function
                else {
                    event.preventDefault();

                    if (typeof settings.fail === "function")
                        settings.fail(event);

                    $form.find("." + settings.errorClass).first().focus();
                    //return false;
                }
            });
        },

        // go through inputs and validate with given filters
        validateFilters: function (fltrs) {
            var $form = this.data("form"),
                inputs = this.data("inputs"),
                settings = this.data("settings"),
                errornumber = 0;

            for (var key in inputs) {
                var validated = true;

                // make sure input is not disabled
                if (!inputs[key].disabled && !inputs[key].element.is(":disabled")) {
                    var inputFilters = inputs[key].filters,
                        val = inputs[key].element.val().trim();

                    // go through each of the inputs filters
                    for (var i = 0; i < inputFilters.length; i++) {
                        var currentFilter = fltrs[inputFilters[i].key];
                        // make sure there is a value to test
                        if (val.length > 0 && currentFilter) {
                            var valid;
                            if (typeof currentFilter.regex === "function")
                                valid = currentFilter.regex(val, inputFilters[i].args);
                            else
                                valid = currentFilter.regex.test(val);

                            if (!valid) {
                                if (settings.tooltips) {
                                    var error = currentFilter.error;
                                    if (typeof inputFilters[i].replace !== "undefined")
                                        error = currentFilter.error.replace("{0}", inputFilters[i].replace);

                                    console.log(error, inputFilters[i]);

                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find("." + settings.tooltipErrorClass), error]);
                                }
                                validated = false;
                                errornumber++;
                            }
                        }
                    }
                }

                if (!validated) methods.fieldError.apply(this, [inputs[key]]);
                else methods.removeFieldError.apply(this, [inputs[key]]);
            }

            return {
                valid: errornumber === 0,
                errorNumber: errornumber
            };

            return {
                valid: true,
                errorNumber: 0
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

                    if (settings.tooltips)
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

                        if (settings.tooltips)
                            $this.parent().find(".field-validation-error").hide();

                        $this.off(".formvalidate");
                    }
                });

                if (settings.tooltips) {
                    field.element.on("focus.formvalidate", function () {
                        $(this).parent().find(".field-validation-error").show();
                    }).on("focusout.formvalidate", function () {
                        $(this).parent().find(".field-validation-error").hide();
                    });
                }
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
