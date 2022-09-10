# Context of JSML

While developing a browser extension,
to transfer serializable data (through [message passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)) that would later be created into DOM without `Element.innerHTML`,
I came up with this project.

Consider to construct a HTML element:

```html
<a id="myLink" href="#" title="the title">foo<em>bar</em>2000</a>
```


## native web api
In web API, you would need many lines of code to create it:

```js
const a = document.createElement("a");
a.id = "myLink";
a.href = "#";
a.title = "the title";
const em = document.createElement("em");
em.appendChild(document.createTextNode("bar"));
a.appendChild(document.createTextNode("foo"));
a.appendChild(em);
a.appendChild(document.createTextNode("2000"));
```

Fortunately after 2016 we have native `Element.append()`, which supports strings directly and multiple arguments. It helps the last 4 lines of the above code to be shortened to:

```js
em.append("bar");
a.append("foo", em, "2000");
```

But these codes are difficult to know the ancestor-descendant relationship of the HTML elements at a glance.


## React.createElement()

[React](https://reactjs.org/) has developed a syntax extension called [JSX](https://reactjs.org/docs/introducing-jsx.html), which uses [`React.createElement()`](https://reactjs.org/docs/react-api.html#createelement) as the base.
In front-end webpage it can be included and then JSX is supported inside `<script type="text/babel">`, says [React Document](https://reactjs.org/docs/add-react-to-a-website.html#quickly-try-jsx).

Without `JSX`, [React suggests](https://reactjs.org/docs/react-without-jsx.html) to assign a shorthand.
After including React, the cosiderred HTML would be written like:

```js
const e = React.createElement;
e("a", {id: "myLink", href: "#", title: "the title"},
    "foo",
    e("em", null, "bar"),
    "2000"
);
```

It's much like the origin HTML structure, easy to read as the code in nested HTML, and could be done dynamically.
However, in the following cases, using `JSX` or `React.createElement()` would not be so handy:
1. transferring computed data with plain text (serialization) and then insert without `Element.innerHTML`.
2. I just don't wanna include a library I don't know (or use) that much, and I wanna keep my environment as neat as possible.


## JSON that represents HTML

A HTML element comprises three parts:

1. tag: string
2. attributes: key-value pairs
3. content: array of tags or texts

[CDATA](https://zh.wikipedia.org/zh-tw/CDATA) is not considered in this project.


### Phase 1: simple

It is trivial to map HTML and XML elements into JSON, like:

```js
{
    "tag": "a",
    "attributes": {
        "id": "myLink",
        "href": "#",
        "title": "the title"
    },
    "children": [
        "foo",
        {
            "tag": "em",
            "children": ["bar"]
        },
        "2000"
    ]
}
```

This is also the structure of the output of [xml2jsobj](https://www.npmjs.com/package/xml2jsobj).
This kind of nested object may be parsed into DOM objects easily by:

```js
function createElement(jsml) {
    if(typeof jsml === "string") return jsml;
    const {tag, attributes = {}, children = []} = jsml;
    const elem = document.createElement(tag);
    for(let name in attributes) elem.setAttribute(name, attributes[name]);
    elem.append(...children.map(createElement));
    return elem;
}
```

Prior knowledge for the JS code:
* [destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
* [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
* [content versus IDL attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#content_versus_idl_attributes)

Though clear enough and easy to know the depth of each descendant,
I still hope we can make the JSON string shorter.


### Phase 2: we don't need the name "attributes"

Let's destruct `attributes` and assign the content to its containing object. This changes the above example to:

```js
{
    "tag": "a",
    "id": "myLink",
    "href": "#",
    "title": "the title",
    "children": [
        "foo",
        {
            "tag": "em",
            "children": ["bar"]
        },
        "2000"
    ]
}
```

And we can parse it with a function like:

```js
function createElement(jsml) {
    if(typeof jsml === "string") return jsml;
    const elem = document.createElement(jsml.tag);
    for(let name in jsml) {
        if(name === "tag") continue;
        if(name === "children") elem.append(...jsml.children.map(createElement);
        else elem.setAttribute(name, jsml[name]);
    }
    return elem;
}
```

This structure may not be secure for XML,
for attributes named as `"tag"` or `"children"` are confusing.
For example, `<foo tag="bar" children="2000">1069</foo>` shall have some way to handle the conflicts, such as:
```js
{
    "tag": "foo",
    "!tag": "bar",
    "!children": "2000"
    "children": ["1069"]
}
```
This shall be safe for `"!"` is not legal for attribute name, says [W3C](https://www.w3.org/TR/xml/#d0e804).

Luckily such attribute names are not legal in HTML, and I come up with another way to workaround in the next phase.
But before handling that, let's move on and see if we can make the tag name much more readible at a glance.


### phase 3

#### 3.1: move tag name forward

In phase 2 we omit `attribues` property.
So I came up with an idea: what about we omit `"tag"`, too?
Instead of assign tag name in the value part, what about we assign it as a property name?
Here it comes:

```js
{"a": {
    "id": "myLink",
    "href": "#",
    "title": "the title",
    "children": [
        "foo",
        {"em": {
            "children": ["bar"]
        }},
        "2000"
    ]
}}
```

Nice! Now the notation is short and like the HTML code it represents.

#### 3.2: rename `children`

Let's use another property name `"$"` to represent children. This have the following pros:
1. shorter in JSON
2. no need to be quoted in JS as a object property name
3. there would not have conflict with any attribute name (since it's illegal in XML to use this character in attribute name).

```js
{"a": {
    "id": "myLink",
    "href": "#",
    "title": "the title"
    "$": [
        "foo",
        {"em": {
            "children": ["bar"]
        },
        "2000"
    ]
}}
```

And since `"tag"` property is also removed, the new format is OK to map to XML (and vice versa).
Here comes the parser:

```js
function createElement(jsml) {
    if(typeof jsml === "string") return jsml;
    const tag = Object.keys(jsml)[0];
    const elem = document.createElement(tag);
    jsml = jsml[tag];
    for(let name in jsml) {
        if(name !== "$") elem.setAttribute(name, jsml[name]);
        else elem.append(...jsml.$.map(createElement));
    }
    return elem;
}
```

### Phase 4: for plain text containers

It is common for an element to have only plain text inside. So instead of

```js
{"em": {
    "class": "my-class",
    "children": ["bar"]
}}
```

Let's try to simplify it into:

```js
{"em": {
    "class": "my-class",
    "text": "bar"
}} // 4.1
```

Hmm... maybe shorter:

```js
{"em": {
    "class": "my-class",
    "!": "bar"
}} // 4.2
```

If there's no attributes, the following is wonderful:

```js
{"em": "bar"} // 4.3
```

Parser:

```js
function createElement(jsml) {
    if(typeof jsml === "string") return jsml;
    const tag = Object.keys(jsml)[0];
    const elem = document.createElement(tag);
    if(typeof jsml === "string") { // 4.3
        elem.append(jsml);
        return elem;
    }
    for(let name in jsml) {
        switch(name) {
            case "$":
                elem.append(...jsml.$.map(createElement);
                break;
            case "text": // 4.1
            case "!": // 4.2
                elem.append(jsml.["!"]);
                break;
            default:
                elem.setAttribute(name, jsml[name]);
        }
    }
    return elem;
}
```

For safety in XML (not to conflict with XML attribute name), using `"!"` as property name seems to be an option.
However, this may confuse people who do not know such meaning.


### Phase 5: special attributes

Consider a HTML element:

```html
<button
    type="button"
    class="btn btn-primary"
    style="margin-top: 1em; padding-bottom: 1px"
    data-foo-bar="2000"
    data-abc-def="ghi"
    onclick="alert(1069); alert(this);"
>Hohoho</button>
```

This could be created by passing an object like:

```js
{button: {
    type: "button",
    class: ["btn", "btn-primary"],
    className: "small d-inline-block",
    style: {
        marginTop: "1em",
        paddingBottom: "1px"
    },
    data: {
        fooBar: "2000"
    },
    "data-abc-def": "ghi",
    onClick: () => alert(1069),
    listeners: {
        click: function(){alert(this)}
    },
    text: "Hohoho"
}}
```

To transfer it in JSON, functions shall be written in string:

```js
{"button": {
    "type": "button",
    "class": ["btn", "btn-primary"],
    "className": "small d-inline-block",
    "style": {
        "marginTop": "1em",
        "paddingBottom": "1px"
    },
    "data": {
        "fooBar": "2000"
    },
    "data-abc-def": "ghi",
    "onClick": "alert(1069)",
    "listeners": {
        "click": "alert(this)"
    },
    "text": "Hohoho"
}}
```

CSS class, styles, dataset, and listeners cannot be assigned either by `Element.setAttribute(attrName, value)` or `element[attrName]`.
Each has its ways to be assigned:

* CSS classes:
  Both `class` and `className` can be used as the property name (while React supports `className` only).
  Both single string and array of strings are supported.
  If using single string form, each CSS class shall be *seperated by space*.
* CSS styles:
  It's ok to assign properties list as a string (each property-value pair *seperated by comma*, like `style` attribute in HTML), with each property name in *kebab-case*;
  but if you wanna assign it as an object, property name shall be in *lowerCamelCase*.
* Dataset:
  As it's shown in the above example, assigning data as an attribute is allowed with the property name in `kebab-case`;
  and assigning it through an object is also supported, but with property name in *lowerCamelCase*.
  Don't blame on me about this confusing situation, see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset).
* Event listeners:
  Each of `onClick`, `onclick` and `listeners: {click}` is OK to assign listeners.
  In JS these can be functions, but strings will be deserialized if assigned to listeners. You shall be care of scoping issues in this case.
  See also:
  * [Event listing | MDN](https://developer.mozilla.org/en-US/docs/Web/Events#event_listing)
  * [Event handler attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#content_versus_idl_attributes)

And since these implementation is only for HTML, the worry about conflict between object property name and XML attribute is ignored.
Therefore, the final code still recognize `"tag"`, `"children"`, `"text"` and does not treat them as HTML attributes.

See `index.js` for actual code.

## parse DOM to JSON
TBE
