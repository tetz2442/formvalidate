/*
 * Created by: Jon Tetzlaff
 * form validation plugin
 */
(function ($) {
    var animationTime = 350;
    //var inputs = {}; //stores inputs in associative array
    var typeOverride = new Array("zip", "letters", "number"); //used to override input type if needed for filtering
    var errorDiv = "<span class='field-validation-error'></span>"; //tooltip html

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
            error: "Must be at least 6 characters long, and contain at least one number, one uppercase and one lowercase letter."
        },
        'number': {
            regex: /^\d*[1-9]\d*$/,
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
        "match": {
            regex: function (val, id) {
                if (val === $(id).val())
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
                tooltipPosition: "right", //position tooltips (right, bottom)
                errorClass: "input-validation-error",
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
            form.attr("novalidate", "");

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

        validate: function() {
            var settings = this.data("settings"),
                $form = this.data("form"),
                $filter = this.data("filter"),
                inputs = this.data("inputs");

            var errornumber = 0; //keep track of nummber of errors
            //add listener to form
            $form.on("submit.formvalidate", function (event) {
                errornumber = 0;
                var errorDetail = [];
                //loop through inputs and validate them
                for (var key in inputs) {
                    //skip disabled field
                    if (!inputs[key].disabled && !inputs[key].element.is(":disabled")) {
                        var validated = true, errorStart = errornumber; //keep track if input is valid, keep track if error class needs to be added
                        var val = inputs[key].element.val(); //store value
                        var len = val.length; //store field length

                        //if field is required check its val
                        if (inputs[key].required) {
                            //check for any value
                            if (!filters["required"].regex.test(val)) {
                                //change the tooltip text to the correct error
                                if (settings.tooltips)
                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters["required"].error]);
                                validated = false;
                                errornumber++;
                            }
                        }
                        //if field has a specific type, validate it
                        if (inputs[key].type !== "text") {
                            if (inputs[key].type === "checkbox") { }
                            else if (inputs[key].type === "radio") { }
                                //other field type
                            else {
                                //validate custom type, ignore selects
                                if (len > 0 && inputs[key].type !== "select" && !filters[inputs[key].type].regex.test(val)) {
                                    if (settings.tooltips)
                                        methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters[inputs[key].type].error]);
                                    validated = false;
                                    errornumber++;
                                }
                            }
                        }
                        //if field has a filter
                        if (inputs[key].match && len > 0) {
                            if (!filters["match"].regex(val, inputs[key].match)) { //call function in match filter
                                if (settings.tooltips)
                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters["match"].error.replace("{0}", $(inputs[key].match).attr("name"))]);
                                validated = false;
                                errornumber++;
                            }
                        }
                        //check for day
                        if (inputs[key].dateday && len > 0) {
                            if (!filters["dateday"].regex(val)) { //call function in match filter
                                if (settings.tooltips)
                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters["dateday"].error]);
                                validated = false;
                                errornumber++;
                            }
                        }
                        //check for month
                        if (inputs[key].datemonth && len > 0) {
                            if (!filters["datemonth"].regex(val)) { //call function in match filter
                                if (settings.tooltips)
                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters["datemonth"].error]);
                                validated = false;
                                errornumber++;
                            }
                        }
                        //check for year
                        if (inputs[key].dateyear && len > 0) {
                            if (!filters["dateyear"].regex(val)) { //call function in match filter
                                if (settings.tooltips)
                                    methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), filters["dateyear"].error]);
                                validated = false;
                                errornumber++;
                            }
                        }

                        //Go through custom filters
                        if (inputs[key].customFilters.length > 0) {
                            for (var x = 0; x < inputs[key].customFilters.length; x++) {
                                //check if custom filter has been added
                                if (typeof customFilters[inputs[key].customFilters[x]] !== "undefined") {
                                    if (!customFilters[inputs[key].customFilters[x]].regex(val, inputs[key].element)) {
                                        if (settings.tooltips)
                                            methods.changeTooltip.apply($form, [inputs[key].element.parent().find(".field-validation-error"), customFilters[inputs[key].customFilters[x]].error]);
                                        validated = false;
                                        errornumber++;
                                    }
                                }
                            }
                        }

                        //if field is not validated, add listeners to remove error fields and show tooltips
                        if (!validated) {
                            //just add click events to checkboxes, radio buttons, and selects
                            if (inputs[key].type === "checkbox" ||
                                inputs[key].type === "radio" ||
                                inputs[key].type === "select") {
                                //console.log(inputs[key]);
                                inputs[key].element.on("click.formvalidate change.formvalidate", function () {
                                    var $this = $(this);
                                    $this.parents(settings.parentElement).removeClass(settings.errorClass);
                                    $this.removeClass(settings.errorClass);

                                    if (settings.tooltips)
                                        $this.parent().find(".field-validation-error").hide();

                                    $this.off(".formvalidate");
                                });

                            }
                                //add keydown listeners to other inputs
                            else {
                                inputs[key].element.on("keydown.formvalidate change.formvalidate", function (event) {
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
                                    inputs[key].element.on("focus.formvalidate", function () {
                                        $(this).parent().find(".field-validation-error").show();
                                    }).on("focusout.formvalidate", function () {
                                        $(this).parent().find(".field-validation-error").hide();
                                    });
                                }
                            }
                            //if they have specified a parent, add the error class to it
                            if (settings.parentElement)
                                inputs[key].element.parents(settings.parentElement).addClass(settings.errorClass);

                            inputs[key].element.addClass(settings.errorClass);

                            inputs[key].element.attr("data-valid", "false");
                        }
                            //remove error class
                        else {
                            inputs[key].element.attr("data-valid", "true");

                            var removeError = 0;
                            inputs[key].element.parent().find("input").each(function () {
                                if ($(this).attr("data-valid") === "false")
                                    removeError++;
                            });

                            if (settings.parentElement && removeError === 0)
                                inputs[key].element.parents(settings.parentElement).removeClass(settings.errorClass);

                            inputs[key].element.removeClass(settings.errorClass);
                        }
                    }
                }

                if (typeof settings.validate === "function") {
                    if (!settings.validate($form, errornumber))
                        errornumber++;
                }

                //if there are no errors, call success function
                if (errornumber === 0) {
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

        addFilters: function () {
            var settings = this.data("settings"),
                $form = this.data("form"),
                $filter = this.data("filter"),
                inputs = {};

            //find fields in form, store them in inputs object
            $filter.find("input[type='text'], input[type='url'], input[type='email'], input[type='number'], input[type='tel'], input[type='password'], textarea, select").each(function () {
                var $element = $(this);
                var field = {}; //store field values
                field.filters = {};
                field.disabled = false;
                var filtersString = $element.attr("data-filters"); //store filters

                if (settings.tooltips)
                    $element.parent().css({ position: "relative" });
                //insert tooltips if wanted
                if (settings.tooltips && $element.parent().find(".form-error").length === 0) {
                    //if there are multiple inputs, only insert one tooltip
                    if ($element.parent().find("input, select, textarea").length > 1)
                        $element.parent().append($(errorDiv).addClass(settings.tooltipPosition));
                    else
                        $(errorDiv).insertAfter($element).addClass(settings.tooltipPosition);
                }

                field.element = $element;
                field.customFilters = [];
                //check type of input
                if ($element.attr("type") !== undefined)
                    field.type = $element.attr("type");
                else if ($element.is("select"))
                    field.type = "select";
                else if ($element.is("checkbox"))
                    field.type = "checkbox";
                //check to see if field is required
                if ($element.attr("required") !== undefined)
                    field.required = true;
                //check to see if filtering of field is required
                if (filtersString) {
                    var tempFilters = filtersString.split(",");
                    for (var i = 0; i < tempFilters.length; i++) {
                        //if in array, override type
                        if (jQuery.inArray(tempFilters[i], typeOverride) !== -1)
                            field.type = tempFilters[i];
                        else { //parse filter
                            if (tempFilters[i].indexOf("{") !== -1) {
                                //parse filter arguments
                                var filt = tempFilters[i].substr(0, tempFilters[i].indexOf("{")); //store string
                                var pos = tempFilters[i].indexOf("{") + 1;
                                var str = tempFilters[i].slice(pos, -1);
                                //used for default filters
                                field[filt] = str;
                            }
                            else
                                field[filters[i]] = true;

                            if (typeof filters[tempFilters[i]] === "undefined") {
                                //custom filter array
                                field.customFilters.push(tempFilters[i]);
                            }
                        }
                    }
                }
                //insert field into array
                inputs[methods.cleanseName($element.attr("name"))] = field;
            });

            //store inputs
            $form.data("inputs", inputs);
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
            if (typeof $form !== "undefined") {
                $form.off("submit.formvalidate");
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