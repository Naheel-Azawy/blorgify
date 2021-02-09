const fs = require("fs");
const { execSync } = require('child_process');

const BLORGIFY_GIT = "https://github.com/Naheel-Azawy/blorgify";
const ORGJS_GIT = "https://github.com/jeansch/org-js";

if (typeof(Org) == 'undefined') {
    try {
        Org = require("./org-js/lib/org.js");
    } catch (e) {
        console.log("Clonning org.js...");
        execSync(`git clone ${ORGJS_GIT}`);
        console.log("Run the script again");
        process.exit();
    }
}

function main() {
    let out = "#!/usr/bin/env node\n";
    out += `/*
    Blorgify - ${BLORGIFY_GIT}
    Built on ${Date().toString()}

    Copyright (c) 2020 Naheel Azawy

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/`;
    out += "\n\n// BEGIN org.js ==========================\n";
    out += fs.readFileSync("./org-js/org.js").toString();
    out += "\n// END org.js ============================\n\n";
    out += fs.readFileSync(__filename).toString();
    execSync("mkdir -p ./dist");
    fs.writeFileSync("./dist/blorgify", out);
    execSync("chmod +x ./dist/blorgify");
}

main();
