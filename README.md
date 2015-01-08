Jquery Form validate plugin
============

###Including plugin

```
<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<script src="/path/to/jquery.formvalidate-0.3.1.js"></script>
```

###Usage
The plugin will read your inputs and base filters off of that. So if you have a input with type "number", it will automatically validate that the field has only numbers in it.

JS
```
$("form").formvalidate();
```

Example HTML
```
<form>
    <div>
        <input type="text" name="Custom1" required />
    </div>
    <div>
        <input type="number" name="Custom2" value="-1" min="0"  max="1"/>
    </div>
    <div>
        <input id="test" type="password" name="Custom4" value="123" />
    </div>
    <div>
        <input type="password" name="Custom5" value="12" data-validate-filters="match{#test|Password}" />
    </div>
    <div>
        <input type="text" name="Custom9" value="" required data-noerror="true" />
        <input type="text" name="Custom10" value="" required data-noerror="true" />
    </div>
    <div>
        <input type="submit" value="Submit" />
    </div>
</form>
```

#####Radio buttons

Radio buttons and checkboxes should have a parent element that they are wrapped in. The error tooltip will be appended after the last radio button.
```
<label>
    <input type="radio" name="Custome7" value="1" required /> Option 1
</label>
<label>
    <input type="radio" name="Custome7" value="2" required /> Option 2
</label>
<label>
    <input type="radio" name="Custome7" value="3" required /> Option 3
</label>
<!-- Error span will be output here -->
```

###Advanced Usage
```
$signupForm.formvalidate({
    validationErrors: false,
    // custom validation for form
    validate: function($form) {
        var valid = true;
        // do some validation here
        // then return a boolean

        return true;
    },
    success: function() {
        // run some code here on validation success
        // then maybe submit the form
    },
    // extend filters
    extend: {
        'creditcard': {
            regex: function(val) {
                if(CreditCard.test(val)) return true;

                return false;
            },
            error: "Credit card is invalid."
        }
    }
});
```

###Options
```
//default settings
{
    success: "", //success callback
    error: "", //error callback
    validate: "", //custom validate function
    parentElement: "", //parent element to attach error class too
    validationErrors: true, //have helpful tooltips popup
    errorClass: "input-validation-error", //class added to inputs on error
    validationErrorClass: "field-validation-error",
    filter: "", //any valid selector (only validate elements within the filter)
    form: "", //any valid selector,
    extend: undefined, //extend filters with custom ones
    submitOnSuccess: false //submit form immedietly on success
}
```

###Supported filters
- required `required`
- number `data-validate-type="number"`
- letters `data-validate-type="letters"`
- email `type="email"`
- radio groups
- telephone (U.S. only) `type="telephone"`
- zip codes (55555 or 55555-5677) `data-validate-type="zip"`
- url `data-validate-type="url"`
- min and max for number fields
- match (matches value in another field) `data-validate-filters="match{#match}"`

#####Other options

- Remove error tooltips from specific fields `data-validate-noerrors="true"`

###Defining filters
Comma separated list set in the data-validate-filters attribute of the input. If you need to specify an argument for the filter it goes in brackets {}. The arguments in there are separated by a pipe |. For the match filter, the first argument is the selector for the input to match, the second is the name of the matching filter.

```
<input type="password" name="Custom5" value="12" data-validate-filters="match{#test|Password}" />
```
