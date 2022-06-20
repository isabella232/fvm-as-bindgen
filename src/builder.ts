import { Source, FunctionDeclaration } from "assemblyscript"
import {
    importsInvoke, toString, isFunction, getInvokeFunc, VALID_RETURN_TYPES
} from "./utils.js";

export class Builder{
    sb: string[]
    constructor() {
        this.sb = []
    }

    build(source: Source): [string, boolean] {
        let str = toString(source)

        const isFilecoinFile = source.text.includes("@filecoinfile");
        if(isFilecoinFile) {
            this.sb.push(getInvokeFunc())
            this.sb.push(importsInvoke())

            let invokeCustomMethods: string[] = []
            const indexesUsed: {[key:string]: boolean} = {}

            let sourceText = source.statements.map((stmt) => {
                if (isFunction(stmt)) {
                    const _stmt = stmt as FunctionDeclaration
                    const decorator = _stmt.decorators ? _stmt.decorators.find(dec => toString(dec.name) == "export_method") : undefined
                    if (decorator) {
                        const args = decorator.args

                        if(!args
                            || args.length > 1
                            || isNaN(parseInt(toString(args[0])))
                        ) throw new Error("export_method decorator requires only one integer value as argument")

                        const indexStr = toString(args[0])
                        if(parseInt(indexStr) < 2) throw new Error("export_method decorator index should be higher than 1")
                        if(indexesUsed[indexStr]) throw new Error(`export_method decorator index ${indexStr} is duplicated`)

                        indexesUsed[indexStr] = true

                        const returnTypeStr = toString(_stmt.signature.returnType)
                        if( !VALID_RETURN_TYPES.includes(returnTypeStr) )
                            throw new Error(`exported method has an invalid return type [${returnTypeStr}] --> options: [${VALID_RETURN_TYPES.join(",")}]`)

                        if( _stmt.signature.parameters.length != 1 )
                            throw new Error(`exported method has an invalid arguments amount. Only a ParamsRawResult is allowed`)

                        if( toString(_stmt.signature.parameters[0].type) != "ParamsRawResult" )
                            throw new Error(`exported method has an invalid argument type [${toString(_stmt.signature.parameters[0].type)}] --> valid one: [ParamsRawResult]`)

                        const funcCall = `__wrapper_${_stmt.name.text}(paramsID)`
                        const funcSignature = `__wrapper_${_stmt.name.text}(paramsID: u32)`

                        invokeCustomMethods.push(`case ${indexStr}:`)
                        switch (returnTypeStr){
                            case "void":
                                invokeCustomMethods.push(`${funcCall}`)
                                invokeCustomMethods.push(`case ${indexStr}:return NO_DATA_BLOCK_ID`)

                                this.sb.push(`
                                    function ${funcSignature}:void {
                                        const params = paramsRaw(paramsID)
                                        ${_stmt.name.text}(params)
                                    }
                                `)
                                break
                            case "Uint8Array":
                                invokeCustomMethods.push(`const result = ${funcCall}`)
                                invokeCustomMethods.push(`return create(DAG_CBOR, result)`)

                                this.sb.push(`
                                    function ${funcSignature}:Uint8Array {
                                        const params = paramsRaw(paramsID)
                                        return ${_stmt.name.text}(params)
                                    }
                                `)
                                break
                            default:
                                throw new Error(`exported method has an invalid return type [${returnTypeStr}] --> options: [${VALID_RETURN_TYPES.join(",")}]`)
                        }

                    }

                    if (
                        _stmt.decorators
                        &&  _stmt.decorators.some(dec => toString(dec.name) == "constructor")
                    ) {
                        this.sb[0] = this.sb[0].replace("__constructor-func__", `${_stmt.name.text}(params)`)
                    }
                }

                return toString(stmt);
            })

            this.sb[0] = this.sb[0].replace("__user-methods__", invokeCustomMethods.join("\n"))

            str =       sourceText.concat(this.sb).join("\n")
        }

        return [str, isFilecoinFile]
    }
}
