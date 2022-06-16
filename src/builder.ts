import { Source, FunctionDeclaration } from "assemblyscript"
import {
    importsInvoke,
    toString,
    isFunction,
    getInvokeFunc
} from "./utils.js";

export class Builder{
    static build(source: Source): [string, boolean] {
        let str = toString(source)

        const isFilecoinFile = source.text.includes("@filecoinfile");
        if(isFilecoinFile) {
            let invokeFunc = getInvokeFunc()
            let invokeCustomMethods = ""
            let counter = 1

            let sourceText = source.statements.map((stmt) => {
                if (isFunction(stmt)) {
                    const _stmt = stmt as FunctionDeclaration

                    if (
                            _stmt.decorators
                        &&  _stmt.decorators.some(dec => toString(dec.name) == "filecoinmethod")
                    ) {
                        const isVoid = toString(_stmt.signature.returnType) === "void"
                        const callSignature = `${_stmt.name.text}(paramsID)`
                        counter++

                        invokeCustomMethods += `
                            case ${counter}:
                                ${ isVoid 
                                    ? `${callSignature}
                                        return NO_DATA_BLOCK_ID`
                                    : `const result = ${callSignature}
                                        return result`
                                }
                        `
                    }

                    if (
                        _stmt.decorators
                        &&  _stmt.decorators.some(dec => toString(dec.name) == "constructor")
                    ) {
                        invokeFunc = invokeFunc.replace("__constructor-name-func__", _stmt.name.text)
                    }
                }

                return toString(stmt);
            })

            str =       sourceText.join("\n")
                    + "\n" + importsInvoke()
                    + "\n" + invokeFunc.replace("__user-methods__", invokeCustomMethods)
        }

        return [str, isFilecoinFile]
    }
}
