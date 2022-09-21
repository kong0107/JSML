if(typeof module === "object" && module.exports) {
    module.exports = {
        createElement: require("./createElement.js"),
        toHTML: require("./toHTML.js")
    };
}
else console.warn("Browsers cannot synchronously import all methods at once.\nUse <script src> on each method separately.");
