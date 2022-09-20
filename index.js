if(typeof module === "object" && module.exports) {
    module.exports = {
        createElement: require("./src/createElement.js"),
        toHTML: require("./src/toHTML.js")
    };
}
else console.warn("Browsers cannot synchronously import all methods at once.\nUse <script src> on each method separately.");
