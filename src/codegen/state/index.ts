import {getCborDecode} from "../cbor/decoding.js";
import {getCborEncode} from "../cbor/encoding.js";

export function decode(className: string, fields: string[]){
    let result: string[] = []
    result.push(`protected parse(raw: Value): ${className} {`)
    result.push(`if( !raw.isArr ) throw new Error("raw state should be an array")`)
    result.push(`let state = (raw as Arr).valueOf()`)

    const [extraLines, fieldsForState] = getCborDecode(fields, "state")
    result = result.concat(extraLines)

    result.push(`return new State(${fieldsForState.join(",")})`)
    result.push("}")

    return result
}

export function encode(fields: string[]){
    let result: string[] = []
    result.push("protected encode(): ArrayBuffer {")
    result = result.concat(getCborEncode(fields, true))
    result.push("return encoder.serialize()")
    result.push("}")

    return result
}

export const getStateFunc = (stateClassName: string) => {
    const imports = `
        import {CBOREncoder, CBORDecoder} from "@zondax/assemblyscript-cbor/assembly"
        import {Value, Arr, Str, Integer, Obj, Float} from "@zondax/assemblyscript-cbor/assembly/types"
        
        import {Cid, DAG_CBOR} from "@zondax/fvm-as-sdk/assembly/env";
        import {Get, Put, root} from "@zondax/fvm-as-sdk/assembly/helpers";
        import {setRoot} from "@zondax/fvm-as-sdk/assembly/wrappers";
    `

    const func = ``

    return [imports, func]
}

export const constructorFunc = (fields: string[]):string => {
    const constructor = `constructor( __arguments__ ) {
        super()
        __body__
    }`

    let args = ""
    let body = ""

    fields.forEach( field => {
        const [name, typeAndDefault] = field.split(":")
        const [type, defaultVal] = typeAndDefault.split("=")

        args += `${name}: ${type}, `
        body += "\n" + `this.${name} = ${name}`
    })

    return constructor.replace("__arguments__", args).replace("__body__", body)
}

export const staticFuncs = (stateClassName: string, fields: string[]):string => {
    const func = `static defaultState(): ${stateClassName} {
        return new ${stateClassName}( __params__ );
      }
      
      static load(): ${stateClassName} {
        return State.defaultState().load() as ${stateClassName};
      }`

    let args = ""

    fields.forEach( field => {
        const [name, typeAndDefault] = field.split(":")
        const [type, defaultVal] = typeAndDefault.split("=")

        let val = defaultVal
        if(val === undefined)
            val = getDefaultValue(type.trim())

        args += `${val}, `
    })

    return func.replace("__params__", args)
}

function getDefaultValue(type: string):string{
    switch (type){
        case "u64":
        case "u32":
        case "u16":
        case "u8":
        case "i64":
        case "i32":
        case "i16":
        case "i8":
            return "0"

        case "f64":
        case "f32":
            return "0.0"

        case "string":
            return '""'

        case "boolean":
            return "false"

        default:
            if( type.startsWith("Array") ){
                const arrayType = type.split("<")[1].split(">")[0]
                return `new Array<${arrayType}>()`
            }

            if( type.startsWith("Map") ){
                const [keyType, valueType] = type.split("<")[1].split(">")[0].split(",")
                return `new Map<${keyType}, ${valueType}>()`
            }

            throw new Error(`default value for this type ${type} is not supported`)
    }
}
