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

(You should know [destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) and [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters) in ES6 to understand this code.)
Though clear enough and easy to know the depth of each descendant,
I still hope we can make the code shorter.


### Phase 2: we don't need the name "attributes"

Let's destruct `attributes` and assign the content to its containing object. This changes the above example to:

```js
{
    "tag": "a",
    "id": "myLink",
    "href": "#",
    "title": "the title"
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
    "title": "the title"
    "children": [
        "foo",
        {"em": {
            "children": ["bar"]
        },
        "2000"
    ]
}}
```

Nice! Now the notation is short and like the HTML code it represents.

#### 3.2: rename `children`

Let's use another property name `"$"` to represent children. This have the following pros:
1. shorter in JSON
2. no need to be quoted in JS as a object key name
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
}
```

Let's try to simplify it into:

```js
{"em" {
    "class": "my-class",
    "text": "bar"
}}
```

Hmm... maybe shorter:

```js
{"em" {
    "class": "my-class",
    "!": "bar"
}} // 4.1
```

If there's no attributes, the following is wonderful:

```js
{"em": "bar"} // 4.2
```

Parser:

```js
function createElement(jsml) {
    if(typeof jsml === "string") return jsml;
    const tag = Object.keys(jsml)[0];
    const elem = document.createElement(tag);
    if(typeof jsml === "string") { // 4.2
        elem.append(jsml);
        return elem;
    }
    for(let name in jsml) {
        switch(name) {
            case "$":
                elem.append(...jsml.$.map(createElement);
                break;
            case "!": // 4.1
                elem.append(jsml.["!"]);
                break;
            default:
                elem.setAttribute(name, jsml[name]);
        }
    }
    return elem;
}
```

Note that `"!"` shall be quoted and cannot be used as `jsml.!`.
However it's still safe to distinquish from XML attributes.


### Phase 5: special attributes

Usually attributes can be assigned by both `Element.setAttribute(attrName, value)` and `element[attrName]`.
But that's not the case for CSS class, styles, dataset, and listeners.
So that would be implement in other ways.
Please see the final code in the file.

## parse DOM to JSON
tbe
