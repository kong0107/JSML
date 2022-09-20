const {JSDOM} = require("jsdom");
// const {createElement} = require("./index");
const createElement = require("./src/createElement.js");

const document = (new JSDOM()).window.document;
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
    }}
;

const elem = createElement(jsml, document);
console.log(elem.outerHTML);
