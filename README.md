# JSML

**JS**ON that represents HT**ML**
**J**ava**S**cript object notation that represents hypertext **M**arkup **L**anguage

While developing a browser extension,
to transfer serializabe data that would later be created into DOM without `Element.innerHTML`,
I came up with this project.

Consider HTML code:

```html
<table>
    <tr>
        <td>a string</td>
        <td><img src="https://fakeimg.pl/50x50/" alt="fake image"></td>
    </tr>
    <tr>
        <td><a href="#" onclick="alert(1069)">a link</a></td>
        <td><label><input type="radio">label text</label></td>
    </tr>
</table>
```

This could be represented by:

```js
{table: {$: [
    {tr: {$: [
        {td: "a string"},
        {td: {$: [{
            img: {
                src: "https://fakeimg.pl/50x50/",
                alt: "fake image"
            }
        }]}}
    ]}},
    {tr: {$: [
        {td: {$: [{
            a: {
                href: "#",
                onclick: () => alert("QQ"),
                text: "a link"
            }
        }]}},
        {td: {$: [{
            label: {$: [
                {input: {
                    type: "radio"
                }},
                "label text"
            ]}
        }]}}
    ]}}
]}}
```

`"$"` means children, and `"!"` means text.
For ideas of this format, see [context](context.md);

## fyi
In browsers that supports JavaScript:
* For HTML text to JS object, use [xml2jsobj](https://www.npmjs.com/package/xml2jsobj).
* For JS object to JSON text, use `JSON.stringify()`.
* For JSON text to JS object, use `JSON.parse()`.
* For DOM object to HTML text, use `Element.outerHTML`.
* For HTML text to DOM object, use `DOMParser.parseFromString()`.
