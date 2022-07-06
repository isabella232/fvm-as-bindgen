import { getCborDecode } from '../cbor/decoding.js'
import { getCborEncode } from '../cbor/encoding.js'
import { getDefaultValue } from './utils.js'

export function getStateDecodeFunc(className: string, fields: string[]) {
    let result: string[] = []
    result.push(`protected parse(raw: Value): ${className} {`)
    result.push(`if( !raw.isArr ) throw new Error("raw state should be an array")`)
    result.push(`let state = (raw as Arr).valueOf()`)

    const [extraLines, fieldsForState] = getCborDecode(fields, 'state')
    result = result.concat(extraLines)

    result.push(`return new State(${fieldsForState.join(',')})`)
    result.push('}')

    return result
}

export function getStateEncodeFunc(fields: string[]) {
    let result: string[] = []
    result.push(`protected encode(): ArrayBuffer {`)
    result = result.concat(getCborEncode(fields, 'this'))
    result.push('return encoder.serialize()')
    result.push('}')

    return result
}

export const getStateImports = (stateClassName: string) => {
    const imports = `
        import {CBOREncoder, CBORDecoder} from "@zondax/assemblyscript-cbor/assembly"
        import {Value, Arr, Str, Integer, Obj, Float, Bytes} from "@zondax/assemblyscript-cbor/assembly/types"
        
        import {Cid, DAG_CBOR} from "@zondax/fvm-as-sdk/assembly/env";
        import {Get, Put, root} from "@zondax/fvm-as-sdk/assembly/helpers";
        import {setRoot} from "@zondax/fvm-as-sdk/assembly/wrappers";
    `

    return imports
}

export const getStateStaticFuncs = (stateClassName: string, fields: string[]): string => {
    const func = `static defaultState(): ${stateClassName} {
        return new ${stateClassName}( __params__ );
      }
      
      static load(): ${stateClassName} {
        return State.defaultState().load() as ${stateClassName};
      }`

    let args = ''

    fields.forEach((field) => {
        const [name, typeAndDefault] = field.split(':')
        const [type, defaultVal] = typeAndDefault.split('=')

        let val = defaultVal
        if (val === undefined) val = getDefaultValue(type.trim())

        args += `${val}, `
    })

    return func.replace('__params__', args)
}
