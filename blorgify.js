import * as fs    from "fs";
import {execSync} from "child_process";
import Org        from "org";
import Prism      from 'prismjs';

// injecting prism into orgjs
Org.ConverterHTML.prototype.escapeSpecialChars =
    function(text, insideCodeElement) {
        return text;
    };
let tmp = Org.ConverterHTML.prototype.convertSrc;
Org.ConverterHTML.prototype.convertSrc =
    function(node, childText, auxData) {
        childText = Prism.highlight(childText, Prism.languages.clike, "arduino");
        let codeLanguage = node.directiveArguments.length
            ? node.directiveArguments[0]
            : "unknown";
        childText = this.tag("code", childText, {
            "class": "language-" + codeLanguage
        }, auxData);
        childText = this.tag("pre", childText, {
            "class": "prettyprint"
        });
        return childText;
    };

function convert(org_file, config) {
    // directory of the org file
    let dirname = org_file.match(/(.*)\//)[1];

    // read the org file and add the options
    let org_src = fs.readFileSync(org_file).toString();
    org_src = "#+OPTIONS: toc:0 num:nil\n" + org_src;

    // inline source files
    if (config.inline_src) {
        for (let m of org_src.matchAll(
            new RegExp(`\\[\\[(.+\\.(${config.inline_src}))\\]\\]`, "g")
        )) {
            let line = m[0], file = `${dirname}/${m[1]}`;
            let src = fs.readFileSync(file).toString();
            src = `#+begin_src c\n${src}\n#+end_src\n`;
            org_src = org_src.replace(line, src);
        }
    }

    // find a cover image
    let cover = undefined;
    for (let m of org_src.matchAll(/\[\[(.+\.(png|jpg|gif))\]\]/g)) {
        // GIFs are prefered. If non found, pick the last image
        cover = m[1];
        if (cover.endsWith(".gif")) {
            break;
        }
    }

    // meta data
    let meta = {
        title: /#\+TITLE: (.+)/g.exec(org_src)[1],
        author: /#\+AUTHOR: (.+)/g.exec(org_src)[1],
        modified: /#\+DATE: (.+)/g.exec(org_src)[1],
        cover: cover ? `${dirname}/${cover}` : undefined,
        src: org_file,
        dest: `${dirname}/index.html`
    };

    // build the html file
    let parser = new Org.Parser();
    let org_document = parser.parse(org_src);
    let html = org_document.convert(Org.ConverterHTML, {}).toString();
    html = config.template_blog
        .replaceAll("{{title}}", meta.title)
        .replace("{{content}}", `
        <div class="content">
            ${html}
            <div class="meta">
                Author: ${meta.author} <br>
                Last modified: ${meta.modified}
            </div>
        </div>`);
    html = `<!-- Created with ${GIT_REPO} -->\n${html}`;
    fs.writeFileSync(meta.dest, html);

    return meta;
}

function main(args) {
    let pattern = args.pop() || "*.org";
    let orgs = execSync(`find -wholename '${pattern}'`)
            .toString().trim().split("\n").sort();

    let config = {
        template_index: TEMP_INDEX,
        template_blog:  TEMP_BLOG,
        name:           "My Blog",
        intro:          "Hello",
        inline_src:     "c|cpp|h|hpp|js|py|ino"
    };

    if (fs.existsSync("./template-index.html")) {
        config.template_index = fs.readFileSync("./template-index.html").toString();
    }

    if (fs.existsSync("./template-blog.html")) {
        config.template_blog = fs.readFileSync("./template-blog.html").toString();
    }

    let configFile = "blorgifyrc.json";
    if (fs.existsSync(configFile)) {
        try {
            Object.assign(
                config, JSON.parse(fs.readFileSync(configFile).toString()));
        } catch (e) {
            console.error("Failed reading config file");
            console.error(e);
        }
    }

    let cards = [];
    for (let org of orgs) {
        console.log(`Converting ${org}...`);
        let res = convert(org, config);
        console.log(`Title: ${res.title}`);
        console.log(`Dest: ${res.dest}`);
        console.log("");

        let cover = res.cover ? `src="${res.cover}"` : "";
        cards.push(`<div class="card" onclick="location.href='${res.dest}'">
            <img ${cover} class="card_img"><br>
            <div class="card_txt">${res.title}</div></div>\n`);
    }

    console.log("Generating index...");
    let index = config.template_index
        .replaceAll("{{title}}", config.name)
        .replace("{{introduction}}", config.intro)
        .replace("{{content}}", `
        <div class="content"><div class="index_grid">
            ${cards.join("\n")}
        </div></div>`);
    index = `<!-- Created with ${GIT_REPO} -->\n${index}`;
    fs.writeFileSync("index.html", index);
}

main(process.argv.splice(2));
