/********************************************************************************
 The MIT License (MIT)

 Copyright (c) 2018 NEAR Protocol
 Copyright (c) 2022 Zondax AG

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 *********************************************************************************/

import { Transform } from "assemblyscript/asc"
import { Parser, Source } from "assemblyscript"

import {chainFiles, isEntry, posixRelativePath, toString} from "./utils.js";
import {Builder} from "./builder.js";

export class MyTransform extends Transform {
    parser: Parser | undefined;

    afterParse(parser: Parser){
        this.parser = parser;

        const writeFile = this.writeFile;
        const baseDir = this.baseDir;

        let newParser = new Parser(parser.diagnostics);

        let chainDecoratorFound = false

        // Filter for smart contract files
        let files = chainFiles(parser.sources);

        // Visit each file
        files.forEach((source) => {
            if (source.internalPath.includes("index-stub")) return;
            let writeOut = /\/\/.*@chainfile-.*/.test(source.text);

            // Remove current source from logs in parser
            parser.donelog.delete(source.internalPath);
            parser.seenlog.delete(source.internalPath);

            // Remove current source from parser sources
            // @ts-ignore
            this.parser.sources = this.parser.sources.filter(
                (_source: Source) => _source !== source
            );

            // Remove current source from programs sources
            this.program.sources = this.program.sources.filter(
                (_source: Source) => _source !== source
            );

            // Build new Source
            let [sourceText, isChainFound] = new Builder().build(source);
            if(isChainFound) chainDecoratorFound = true

            if (writeOut) {
                writeFile(
                    source.normalizedPath + ".source.out",
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

            // Get our modified source, now parsed by the new parser
            let newSource = newParser.sources.pop()!;

            if (writeOut) {
                writeFile(
                    source.normalizedPath + ".parsed.out",
                    toString(newSource),
                    baseDir
                );
            }

            // Add new modified source to program sources
            this.program.sources.push(newSource);

            // Add new modified source to logs in parser
            parser.donelog.add(source.internalPath);
            parser.seenlog.add(source.internalPath);

            // Add new modified source to parser sources
            parser.sources.push(newSource);
        });

        if(!chainDecoratorFound) throw new Error(`chain decorator is missing. Please add "// @chainfile-index" once at the very beginning of the index file.`)
    }
}
