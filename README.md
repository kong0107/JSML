# JSML

**JS**ON that represents HT**ML**
**J**ava**S**cript object notation that represents hypertext **M**arkup **L**anguage

[See demonstration on GitHub.](https://kong0107.github.io/jsml/)

## createElement()

### in browsers

```html
<script src="https://cdn.jsdelivr.net/npm/jsml-parser@0.2/createElement.js"></script>
<script>
    const jsml =
    {p: {
        class: "myClass myClass2",
        style: "margin: .5em 0; padding: 0.5em;",
        $: [
            "JSML means ",
            {a: {
                href: "https://www.json.org/",
                text: "JSON",
                onClick: () => console.log("with listener support")
            }},
            " that represents ",
            {em: "HTML"}
        ]
    }};

    const elem = JSML.createElement(jsml);
    document.body.append(elem, elem.outerHTML);
</script>
```

For ideas of this format and concept of even shorter implementation, see [context](context.md).


### in node.js

Use `jsdom` to create an object which emulates `HTMLDocument`.

```bash
npm install jsml-parser jsdom
```

```js
const {JSDOM} = require("jsdom");
const JSML = require("jsml-parser");

const dom = new JSDOM("");
const elem = JSML.createElement(
    {p: "Hello world"},
    dom.window.document
);
```

## toHTML()

*Note*: For `toHTML()`, assigning event listener by function is not fully implemented yet.

### in browsers

```html
<script src="https://cdn.jsdelivr.net/npm/jsml-parser@0.2/toHTML.js"></script>
<script>
console.log(JSML.toHTML({p: "test"}));
</script>
```

### in node.js

You don't need other packages to run `toHTML()`.

```bash
npm install jsml-parser
```

```js
const JSML = require("jsml-parser");
console.log(JSML.toHTML({p: "test"}));
```

## See also

* There are other similar packages, such as:
  * [node-json2html](https://www.npmjs.com/package/node-json2html)
  * [json2html](https://www.npmjs.com/package/json2html)
  * [node-jsml](https://www.npmjs.com/package/node-jsml)
  * [jsmile-browser](https://www.npmjs.com/package/jsmile-browser)
  * [packages with "jsml" as its keyword on npm](https://www.npmjs.com/search?q=keywords:jsml)
* For manually maintaining an HTML file, use [Pug (formerly known as "Jade")](https://pugjs.org/).
* For HTML text to JS object, use [xml2jsobj](https://www.npmjs.com/package/xml2jsobj).
* For JS object to JSON text, use `JSON.stringify()`.
* For JSON text to JS object, use `JSON.parse()`.
* For DOM object to HTML text, use `Element.outerHTML`.
* For HTML text to DOM object, use `DOMParser.parseFromString()`.
