import {createElement} from "./index.js";
const $ = document.getElementById.bind(document);
globalThis.createElement = createElement;

await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve));

const
    textarea = $("textarea"),
    status = $("status"),
    element = $("element"),
    html = $("html");

textarea.addEventListener("input", event => {
    textarea.style.height = (textarea.value.split(/\n/).length * 1.5 + .5) + "em";
    while(element.lastChild?.remove());
    status.lastChild?.remove();
    html.lastChild?.remove();
    try {
        const obj = JSON.parse(event.target.value);
        const elem = createElement(obj);
        console.debug(elem);
        if(!elem) return;
        element.append(elem);
        html.textContent = elem.outerHTML;
    }
    catch(err) {
        status.textContent = err;
    }
});

textarea.value = textarea.value.trim();
textarea.dispatchEvent(new InputEvent("input"));
