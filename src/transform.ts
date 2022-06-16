import { Transform } from "assemblyscript/asc"
import { Parser, Source } from "assemblyscript"

import {filecoinFiles, isEntry, posixRelativePath} from "./utils.js";
import {Builder} from "./builder.js";

export class MyTransform extends Transform {
    parser: Parser | undefined;

    afterParse(parser: Parser){
        /*const srcs = parser.sources.filter(src => src.text.includes("function invoke")).map(src => src.statements.filter( stamt => stamt.kind == NodeKind.FUNCTIONDECLARATION ))
        srcs.forEach(stamts => {
            stamts.forEach(stamt =>
            console.log(ASTBuilder.build(stamt)))
        })*/

        this.parser = parser;

        const writeFile = this.writeFile;
        const baseDir = this.baseDir;

        let newParser = new Parser(parser.diagnostics);

        let filecoinDecoratorFound = false

        // Filter for filecoin files
        let files = filecoinFiles(parser.sources);

        // Visit each file
        files.forEach((source) => {
            if (source.internalPath.includes("index-stub")) return;
            let writeOut = /\/\/.*@filecoinfile .*out/.test(source.text);

            // Remove from logs in parser
            parser.donelog.delete(source.internalPath);
            parser.seenlog.delete(source.internalPath);

            // Remove from programs sources
            parser.sources = parser.sources.filter(
                (_source: Source) => _source !== source
            );
            this.program.sources = this.program.sources.filter(
                (_source: Source) => _source !== source
            );

            // Build new Source
            let [sourceText, isFilecoinFound] = Builder.build(source);

            if(isFilecoinFound) filecoinDecoratorFound = true

            if (writeOut) {
                writeFile(
                    posixRelativePath("out", source.normalizedPath),
                    sourceText,
                    baseDir
                );
            }
            // Parses file and any new imports added to the source
            newParser.parseFile(
                sourceText,
                posixRelativePath(isEntry(source) ? "" : "./", source.normalizedPath),
                isEntry(source)
            );
            let newSource = newParser.sources.pop()!;
            this.program.sources.push(newSource);
            parser.donelog.add(source.internalPath);
            parser.seenlog.add(source.internalPath);
            parser.sources.push(newSource);
        });

        if(!filecoinDecoratorFound) throw new Error(`filecoin decorator is missing. Please add "// @filecoinfile" once at the very beginning of the index file.`)
    }
}
