
const BLORGIFY_GIT = "https://github.com/Naheel-Azawy/blorgify";
const ORGJS_GIT = "https://github.com/jeansch/org-js";

function blorgify(orgs, config, ondone) {

    const STYLES = `
.title {
    text-align:     center;
    padding-bottom: 20px;
}

img {
    max-height: 40vh;
    max-width:  100%;
}

.content {
    margin:    auto;
    max-width: 700px;
}

.index_grid {
    margin:                auto;
    max-width:             700px;
    display:               grid;
    grid-template-columns: repeat(2, 1fr);
    gap:                   20px;
}

.meta {
    font-size:   small;
    color:       #555;
    text-align:  right;
    padding-top: 30px;
}

.card {
    height:           370px;
    box-shadow:       0 4px 8px 0 rgba(0,0,0,0.5);
    transition:       0.3s;
    border-radius:    25px;
    cursor:           pointer;
    padding-bottom:   15px;
}

.card_img {
    background:    #ddd;
    margin-bottom: 20px;
    float:         top;
    overflow:      auto;
    border-radius: 25px;
    width:         100%;
    height:        100%;
    object-fit:    cover;
}

.card_txt {
    margin-left:  20px;
    margin-right: 20px;
}`;

    const TEMPLATE_INDEX = `
<html>
    <head>
        <obj charset="utf-8" />
        <obj name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>${STYLES}</style>
    </head>
    <body>
        <h1 class="title">{{title}}</h1>
        {{content}}
    </body>
</html>`;

    const TEMPLATE_BLOG = `
<html>
    <head>
        <obj charset="utf-8" />
        <obj name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>${STYLES}</style>
    </head>
    <body>
        {{content}}
    </body>
</html>`;

    // importing org.js
    if (typeof(Org) == 'undefined') {
        throw new Error("org.js is not imported");
    }

    // optional node imports
    try {
        fs = require("fs").promises;
        fetch = require("node-fetch");
    } catch (e) {}

    function file_extension(path) {
        let sp = path.split(".");
        return sp.length > 1 ? sp[sp.length - 1] : undefined;
    }

    function good_path(path, dirname) {
        if (dirname &&
            (!path.includes("/") || path.startsWith("./"))) {
            path = `${dirname}/${path}`;
        }
        if (config.base_dir && path.startsWith(config.base_dir)) {
            path = path.replace(config.base_dir, "");
            if (path[0] == "/") {
                path = path.substring(1);
            }
        }
        try {
            path = `${window.location.href}${path}`;
        } catch (e) {}
        return path.replace("/./", "/");
    }

    async function read_file(path) {
        let ret = undefined;
        try {
            let res = await fetch(path);
            if (res.status == 200) {
                ret = await res.text();
            }
        } catch (e) {
            if (typeof(fs) != "undefined") {
                try {
                    ret = (await fs.readFile(path)).toString();
                } catch (e) {}
            }
        }
        return ret;
    }

    async function gen_post(file) {
        // load the template if found
        let html_template = config.blog_template;

        // directory (or url) of the org file
        let dirname = file.match(/(.*)\//)[1];

        // read the org file and add the options
        file = good_path(file, dirname);
        let org = await read_file(file);
        if (!org) {
            return undefined;
        }
        org = "#+OPTIONS: toc:nil num:nil\n" + org;

        let inline_src = [];
        if (config.inline_src) {
            inline_src = config.inline_src.split("|");
        }

        // fix links. TODO: handle links with text
        for (let m of org.matchAll(/\[\[(.+)\]\]/g)) {
            let line = m[0];
            let file = good_path(m[1], dirname);
            let ext = file_extension(file);

            if (inline_src.includes(ext)) {
                // inline source files
                let src = await read_file(file, dirname);
                src = `#+begin_src c\n${src}\n#+end_src\n`;
                org = org.replace(line, src);
            } else {
                // just replace with a good path
                org = org.replace(line, `[[${file}]]`);
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

        let tm = /#\+TITLE: (.+)/g.exec(org);
        let am = /#\+AUTHOR: (.+)/g.exec(org);
        let dm = /#\+DATE: (.+)/g.exec(org);

        // the returned object with metadata
        let obj = {
            title: tm && tm.length > 1 ? tm[1] : undefined,
            author: am && am.length > 1 ? am[1] : undefined,
            modified: dm && dm.length > 1 ? dm[1] : undefined,
            cover: cover ? cover : undefined,
            org: file,
            org_src: org,
            html: file.replace("README.org", "index.html"),
            html_src: undefined
        };

        // build the html file
        let parser = new Org.Parser();
        let org_document = parser.parse(org);
        let html = org_document.convert(Org.ConverterHTML, {}).toString();
        html = html_template
            .replaceAll("{{title}}", obj.title)
            .replace("{{content}}", `
        <div class="content">
            ${html}
            <div style="font-size:small;text-align:right" class="obj">
                Author: ${obj.author} <br>
                Last modified: ${obj.modified}
            </div>
        </div>`);
        html = `<!-- Created with ${BLORGIFY_GIT} -->\n${html}`;
        obj.html_src = html;

        return obj;
    }

    async function main() {

        // fix args if needed
        if (!Array.isArray(orgs)) orgs   = [orgs];
        if (!config)              config = {};
        const config_def = {
            name:           "My Blog",
            name:           "My Blog",
            inline_src:     "c|cpp|h|hpp|js|py|ino",
            blog_template:  TEMPLATE_BLOG,
            index_template: TEMPLATE_INDEX,
            base_dir:       ""
        };
        if (!config.blog_template) {
            config.blog_template = await read_file("template-blog.html");
        }
        if (!config.index_template) {
            config.index_template = await read_file("template-index.html");
        }
        for (let k in config_def) {
            if (config[k] === undefined) {
                config[k] = config_def[k];
            }
        }

        // the returned object
        let ret = {
            posts: []
        };

        // build the posts and the index html
        let cards = [];
        for (let org of orgs) {
            let obj = await gen_post(org);
            if (!obj) {
                continue;
            }
            ret.posts.push(obj);

            let cover = obj.cover ? `src="${obj.cover}"` : "";
            cards.push(`<div class="card" onclick="location.href='${obj.html}'">
                <img ${cover} class="card_img"><br>
                <div class="card_txt">${obj.title}</div></div>\n`);
        }

        let content = `
            <div class="content"><div class="index_grid">
                ${cards.join("\n")}
            </div></div>`;

        let html = config.index_template
            .replaceAll("{{title}}", config.name)
            .replace("{{content}}", content);
        html = `<!-- Created with ${BLORGIFY_GIT} -->\n${html}`;
        ret.index = html;

        return ret;
    }

    main().then(ondone);
}

if (typeof process != "undefined") {    
    const fs = require("fs");
    const { execSync } = require('child_process');

    function self_dist() {
        let out = "#!/usr/bin/env node\n";
        out += `/*
    Blorgify - ${BLORGIFY_GIT}
    Built on ${Date().toString()}

    Copyright (c) 2020-2021 Naheel Azawy

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

        let orgs = execSync("find -wholename './*/*README.org'")
            .toString().trim().split("\n").sort();
        let base_dir = execSync("realpath .").toString().trim();
        for (let i in orgs) {
            orgs[i] = `${base_dir}/${orgs[i]}`.replace("/./", "/");
        }
        blorgify(orgs, {}, res => {
            fs.writeFileSync("index.html", res.index);
            for (let post of res.posts) {
                fs.writeFileSync(post.html, post.html_src);
            }
        });
    }
}
