const fs = require("fs");
const { execSync } = require('child_process');

const BLORGIFY_GIT = "https://github.com/Naheel-Azawy/blorgify";
const ORGJS_GIT = "https://github.com/jeansch/org-js";

const TEMPLATE_INDEX = `
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>
          .index_grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
          }
          .card { cursor: pointer; }
          .card_img { float: left; }
          .card_txt { padding-left:  20px; }
        </style>
    </head>
    <body>
        <h1>{{title}}</h1>
        <p>{{introduction}}</p>
        {{content}}
    </body>
</html>`;

const TEMPLATE_BLOG = `
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
    </head>
    <body>
        {{content}}
    </body>
</html>`;

let config;
try {
    config = JSON.parse(fs.readFileSync("blorgifyrc.json").toString());
} catch (e) {
    config = {
        name:       "My Blog",
        intro:      "Hello",
        inline_src: "c|cpp|h|hpp|js|py"
    };
}

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

function gen_html(file) {
    // load the template if found
    let html_template;
    try {
        html_template = fs.readFileSync("template-blog.html").toString();
    } catch (e) {
        html_template = TEMPLATE_BLOG;
    }

    // directory of the org file
    let dirname = file.match(/(.*)\//)[1];

    // read the org file and add the options
    let org = fs.readFileSync(file).toString();
    org = "#+OPTIONS: toc:nil num:nil\n" + org;

    // inline source files
    if (config.inline_src) {
        for (let m of org.matchAll(
            new RegExp(`\\[\\[(.+\\.(${config.inline_src}))\\]\\]`, "g")
        )) {
            let line = m[0], file = `${dirname}/${m[1]}`;
            let src = fs.readFileSync(file).toString();
            src = `#+begin_src c\n${src}\n#+end_src\n`;
            org = org.replace(line, src);
        }
    }

    // find a cover image
    let cover = undefined;
    for (let m of org.matchAll(/\[\[(.+\.(png|jpg|gif))\]\]/g)) {
        // GIFs are prefered. If non found, pick the last image
        cover = m[1];
        if (cover.endsWith(".gif")) {
            break;
        }
    }

    // meta data
    let meta = {
        title: /#\+TITLE: (.+)/g.exec(org)[1],
        author: /#\+AUTHOR: (.+)/g.exec(org)[1],
        modified: /#\+DATE: (.+)/g.exec(org)[1],
        cover: cover ? `${dirname}/${cover}` : undefined,
        org: file,
        html: `${dirname}/index.html`
    };

    // build the html file
    let parser = new Org.Parser();
    let org_document = parser.parse(org);
    let html = org_document.convert(Org.ConverterHTML, {}).toString();
    html = html_template
        .replaceAll("{{title}}", meta.title)
        .replace("{{content}}", `
        <div class="content">
            ${html}
            <div style="font-size:small;text-align:right" class="meta">
                Author: ${meta.author} <br>
                Last modified: ${meta.modified}
            </div>
        </div>`);
    html = `<!-- Created with ${BLORGIFY_GIT} -->\n${html}`;
    fs.writeFileSync(meta.html, html);

    return meta;
}

function self_dist() {
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

function main() {
    // self build option
    if (process.argv[2] == "dist") {
        self_dist();
        return;
    }

    // load the index template if found
    let html_template;
    try {
        html_template = fs.readFileSync("template-index.html").toString();
    } catch (e) {
        html_template = TEMPLATE_INDEX;
    }

    let cards = [];
    let orgs = execSync("find -wholename './*/*README.org'")
        .toString().trim().split("\n").sort();
    for (let org of orgs) {
        let meta = gen_html(org);
        console.log(meta.title);
        console.log(meta.html);
        console.log("");

        let cover = meta.cover ? `src="${meta.cover}"` : "";
        cards.push(`<div class="card" onclick="location.href='${meta.html}'">
            <img ${cover} class="card_img"><br>
            <div class="card_txt">${meta.title}</div></div>\n`);
    }

    let html = html_template
        .replaceAll("{{title}}", config.name)
        .replace("{{introduction}}", config.intro)
        .replace("{{content}}", `
        <div class="content"><div class="index_grid">
            ${cards.join("\n")}
        </div></div>`);
    html = `<!-- Created with ${BLORGIFY_GIT} -->\n${html}`;
    fs.writeFileSync("index.html", html);
}

main();
