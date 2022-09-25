/** @module JSML */
(root => {

/**
 * @func toHTML
 * @desc Convert JSML object to HTML string without document object.
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

/** @private @const emptyElements */
const emptyElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

/** @private @func kebabize */
const kebabize = camel => camel.replace(/[A-Z]/g, m => "-" + m[0].toLowerCase());

/** @private @func escapeQuotes */
const escapeQuotes = str => str.toString().replaceAll('"', '\\"');


if(typeof module === "object" && module.exports) module.exports = toHTML;
else {
    root.JSML = root.JSML || {};
    root.JSML.toHTML = toHTML;
}

})(globalThis);
