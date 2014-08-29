Jquery Form validate plugin
============

###Including plugin

```
<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<script src="/path/to/formvalidate-0.0.9.js"></script>
```

###Usage
The plugin will read your your inputs and base filters off of that. So if you have a input with type "number", it will automatically validate that the field has only numbers in it.

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
        <input type="password" name="Custom5" value="12" data-filters="match{#test|Password}" />
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
- required
- number
- letters
- email
- radio groups
- telephone (U.S. only)
- zip codes (55555 or 55555-5677)
- url
- min and max for number fields
- match (matches value in another field)

###Defining filters
```
<input type="password" name="Custom5" value="12" data-filters="match{#test|Password}" />
```
