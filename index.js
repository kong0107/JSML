/**
 * @func createElement
 * @desc Create HTML Element from a serializable object.
 * @param {JsonElement} jsml - The only key is the tag name to be created, and the value is an object describing its properties and children.
 * @returns {Element}
 */
function createElement(jsml) {
    if(typeof jsml === "string") return document.createTextNode(object);
    let tag = jsml.tag;
    if(!tag) {
        tag = Object.keys(jsml)[0];
        jsml = jsml[tag];
    }
    const elem = document.createElement(tag);
    for(let prop in jsml) {
        const value = jsml[prop];
        prop = prop.toLowerCase();
        if(prop.startsWith("on")) elem.addEventListener(prop.substring(2), value);
        else switch(prop) { // lowercased alphabetic order
            case "$":
            case "children": // value: JsonElement[]
                elem.append(...value.map(createElement));
                break;
            case "class":
            case "classname": // value: string | string[]
                elem.className = (typeof value === "string") ? value : value.join(" ");
                break;
            case "data":
            case "dataset": // value: Object whose values are strings
                for(let ds in value) elem.dataset[ds] = value[ds];
                break;
            case "listeners": // value: Object whose values are functions
                for(let eventType in value) elem.addEventListener(eventType, value[eventType]);
                break;
            case "style": // value: string | Object
                if(typeof value == "string") elem.style.cssText = value;
                else for(let sp in value) elem.style[sp] = value[sp];
                break;
            case "!":
            case "text": // value: string
                elem.append(value);
                break;
            default: // value: string
                assert(typeof value === "string");
                elem.setAttribute(prop, value);
        }
    }
    return elem;
};

export default createElement;


/******** Definitions ********/

/**
 * @typedef {Object | string} JsonElementCore
 * @property {string} [tag] - HTML tag. Only omittable if using `JsonElementX`.
 * @property {JsonElementX[]} [children]
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
    {tag: "a", href: "#", text: "my link"} /// JsonElement
    {a: {href: "#", text: "my link"}}      /// JsonElementX

 * @example /// line break
    {tag: "br"} /// JsonElement
    {br: {}}    /// JsonElementX

 * @example /// simple header
    {tag: "h1", children: ["my header"]} /// JsonElement
    {tag: "h1", text: "my header"}       /// JsonElement
    {h1: "my header"}                    /// JsonElementX

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
 */
