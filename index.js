/** @module JSML */
const JSML = (() => {

/**
 * @func createElement
 * @desc Create HTML Element from a serializable object.
 * @param {JsonElement} jsml
 * @param {HTMLDocument} [document=window.document] - you could use `jsdom`
 * @returns {Element}
 */
function createElement(jsml, document = window.document) {
    if(typeof jsml === "string") return document.createTextNode(jsml);
    if(jsml.cloneNode) return jsml.cloneNode(true);
    let tag = jsml.tag;
    if(!tag) {
        tag = Object.keys(jsml)[0];
        if(!tag) throw TypeError("object does not match JsonElement structure.");
        jsml = jsml[tag];
    }
    else delete jsml.tag;

    const elem = document.createElement(tag);
    if(typeof jsml === "string") jsml = {text: jsml};
    for(let prop in jsml) {
        const value = jsml[prop];
        prop = prop.toLowerCase();
        if(prop.startsWith("on"))
            elem.addEventListener(prop.substring(2), toFunc(value, prop));
        else switch(prop) {
            case ".":
            case "class":
            case "classname": { // value: string | string[]
                const list = (typeof value === "string") ? value.split(" ") : value;
                elem.classList.add(...(list.filter(x => x)));
                break;
            }
            case "css":
            case "style": { // value: string | Object
                if(typeof value == "string") elem.style.cssText = value;
                else for(let sp in value) elem.style[camelize(sp)] = value[sp];
                break;
            }
            case "!":
            case "text": { // value: string
                elem.append(value);
                break;
            }
            case "#": { // value: string
                elem.id = value;
                break;
            }
            case "$":
            case "children": { // value: JsonElement[]
                elem.append(...value.map(o => createElement(o, document)));
                break;
            }
            case "data":
            case "dataset": { // value: Object whose values are strings
                for(let ds in value) elem.dataset[camelize(ds)] = value[ds];
                break;
            }
            case "listeners": { // value: Object whose values are functions
                for(let event in value)
                    elem.addEventListener(event, toFunc(value[event], `on${event}`));
                break;
            }
            default: { // value: string
                console.assert(typeof value === "string", new TypeError("attribute value must be a string"));
                elem.setAttribute(prop, value);
            }
        }
    }
    return elem;
}

/**
 * @private
 * @const
 */
const emptyElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

/**
 * @func toHTML
 * @desc (not implemented yet) Convert JSML object to HTML string without document object.
 * @param {JsonElement} jsml
 * @returns {string}
 */
function toHTML(jsml) {
    if(typeof jsml === "string") return jsml;
    if(jsml.cloneNode) {
        if(jsml.outerHTML) return jsml.outerHTML;
        else return jsml.textContent;
    }

    let tag = jsml.tag;
    if(!tag) {
        tag = Object.keys(jsml)[0];
        if(!tag) throw TypeError("object does not match JsonElement structure.");
        jsml = jsml[tag];
    }
    else delete jsml.tag;

    let result = `<${tag}`, children = "";
    if(typeof jsml === "string") jsml = {text: jsml};
    for(let prop in jsml) {
        const value = jsml[prop];

        prop = prop.toLowerCase();
        if(prop.startsWith("on")) {
            if(typeof value === "function") value = `(${value.toString()})()`;
            result += ` ${prop}="${escapeQuotes(value)}"`;
        }
        else switch(prop) {
            case ".":
            case "class":
            case "classname": { // value: string | string[]
                const classname = (typeof value === "string") ? value : value.join(" ");
                result += ` class="${escapeQuotes(classname)}"`;
                break;
            }
            case "css":
            case "style": { // value: string | Object
                if(typeof value === "string") result += ` style="${escapeQuotes(value)}"`;
                else {
                    const rules = [];
                    for(let sp in value) rules.push(`${kebabize(sp)}: ${value[sp]}`);
                    result += ` style="${escapeQuotes(rules.join("; "))}"`;
                }
                break;
            }
            case "!":
            case "text": { // value: string
                children = value;
                break;
            }
            case "#": { // value: string
                result += ` id="${escapeQuotes(value)}"`;
                break;
            }
            case "$":
            case "children": { // value: JsonElement[]
                children = value.map(o => toHTML(o)).join("");
                break;
            }
            case "data":
            case "dataset": { // value: Object whose values are strings
                for(let ds in value)
                    result += ` data-${kebabize(ds)}="${escapeQuotes(value[ds])}"`;
                break;
            }
            case "listeners": { // value: Object whose values are functions
                for(let event in value) {
                    let listener = value[event];
                    if(typeof listener === "function") listener = `(${listener.toString()})()`;
                    result += ` on${event}="${escapeQuotes(listener)}"`;
                }
                break;
            }
            default: { // value: string
                console.assert(typeof value === "string", new TypeError("attribute value must be a string"));
                result += ` ${prop}="${escapeQuotes(value)}"`;
            }
        }
    }
    result += ">";
    if(!emptyElements.includes(tag)) result += children + `</${tag}>`;
    return result;
}

/**
 * @func camelize
 * @desc Convert kebab-case string to camelCase.
 * @param {string} kebab
 * @returns {string}
 */
const camelize = kebab => kebab.replace(/-([a-z])/g, m => m[1].toUpperCase());

const kebabize = camel => camel.replace(/[A-Z]/g, m => "-" + m[0].toLowerCase());

/**
 * @func escapeQuotes
 * @param {*} str
 * @returns {string}
 */
const escapeQuotes = str => str.toString().replaceAll('"', '\\' + '"');

/**
 * @func toFunc
 * @desc Convert a string to a listener function
 * @param {string | Function} any - if a function is passed in, then it's returned unchanged.
 * @param {string} [name=anonymous] - could be used to recursive call itself
 * @returns {Function} function
 *
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#content_versus_idl_attributes) says:
 * All event handler attributes accept a string.
 * The string will be used to synthesize a JavaScript function like `function name(...args) {body}`,
 * where `name` is the attribute's name, and `body` is the attribute's value.
 * The handler receives the same parameters as its JavaScript event handler counterpart
 * — most handlers receive only one `event` parameter,
 * while `onerror` receives five: `event`, `source`, `lineno`, `colno`, `error`.
 */
const toFunc = (any, name = "anonymous") => (any instanceof Function) ? any : (
    Function(`return function ${name}(event) { ${any} }`)()
);


return {
    createElement,
    toHTML,
    camelize, kebabize,
    escapeQuotes, toFunc
};

})();

if(typeof module === "object" && module.exports) module.exports = JSML;




/******** Definitions ********/

/**
 * @typedef {Object | Node | string} JsonElementCore
 * @property {string} [tag] - HTML tag. Only omittable if using `JsonElement`.
 * @property {JsonElement[]} [children]
 * @property {string} [text] - use this only if the only child is text.
 * @property {string | string[]} [class]     - CSS classes to be assigned.
 * @property {string | string[]} [className] - CSS classes to be assigned.
 * @property {string | Object} [style] - CSS style to be assigned.
 * @property {Object} [data]    - dataset of the HTML Element.
 * @property {Object} [dataset] - dataset of the HTML Element.
 * @property {Object.<string, function>} [listeners] - listeners to be added, with key as the event type (without prefix `on`).
 * @property {function} [on*] - another way to assign event listeners.
 * @property {string} [*] - other properties would be set as HTML attributes
 */

/**
 * @typedef {Object | JsonElementCore} JsonElement
 * @property {JsonElementCore} *
 *
 * The only key is any HTML tag, and its corresponding value is a `JsonElementCore` whose `tag` key would be ignored (and therefor could be omitted).
 * This helps the manually maintained codes to be shorten and more readable.
 * In the case that tag name is dynamically decided,
 * it may be more easier to use `JsonElement` or
 * [computed property name]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#computed_property_names}.
 *
 * @example /// anchor link
    {tag: "a", href: "#", text: "my link"} /// JsonElementCore
    {a: {href: "#", text: "my link"}}      /// JsonElement

 * @example /// line break
    {tag: "br"} /// JsonElementCore
    {br: {}}    /// JsonElement

 * @example /// simple header
    {tag: "h1", children: ["my header"]} /// JsonElementCore
    {tag: "h1", text: "my header"}       /// JsonElementCore
    {h1: "my header"}                    /// JsonElement

 * @example /// table row with multiple cells
    {tr: {children: [
        {td: {text: "A"}},
        {td: {text: "B"}},
        {td: {text: "C"}},
    ]}}

 * @example /// button with 2 click listeners
    {button: {
        listeners: [click: () => alert("foo")],
        onclick: () => alert("bar"),
        text: "foobar"
    }}

 * @example /// label within which a checkbox and some texts exist
    {label: {
        children: [
            {input: {type: "checkbox"}},
            "clicking this also triggers click event of the checkbox"
        ]
    }}
 *
 */
