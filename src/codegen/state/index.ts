import { getCborDecode } from '../cbor/decoding.js'
import { getCborEncode } from '../cbor/encoding.js'
import { getDefaultValue } from './utils.js'

export function getStateDecodeFunc(className: string, fields: string[], enableLogs: boolean) {
    let result: string[] = []
    result.push(`protected parse(raw: Value): ${className} {`)

    if (enableLogs) {
        result.push('const stateToLog = raw.toString()')
        result.push('log("Decoded state (obj): [" + stateToLog + "]")')
    }

    result.push(`if( !raw.isArr ) throw new Error("raw state should be an array")`)
    result.push(`let state = (raw as Arr).valueOf()`)

    const [extraLines, fieldsToCall, paramsAbi] = getCborDecode(fields, 'state')
    result = result.concat(extraLines)

    result.push(`return new State(${fieldsToCall.join(',')})`)
    result.push('}')

    return result
}

export function getStateEncodeFunc(fields: string[], enableLogs: boolean) {
    let result: string[] = []
    result.push(`protected encode(): ArrayBuffer {`)
    result = result.concat(getCborEncode(fields, 'this'))
    result.push('const data = encoder.serialize()')

    if (enableLogs) {
        result.push('const stateToLog = new CBORDecoder( data ).parse().toString()')
        result.push('log("Encoded state (obj): [" + stateToLog + "]")')
        result.push(
            'log("Encoded state (hex): [" + Uint8Array.wrap(data).reduce((str, byte) => str + byte.toString(16).padStart(2, \'0\'), \'\') + "]")'
        )
    }

    result.push('return data')
    result.push('}')

    return result
}

export const getStateStaticFuncs = (stateClassName: string, fields: string[], enableLogs: boolean): string => {
    const func = `static defaultState(): ${stateClassName} {
        ${enableLogs ? 'log("Creating new default state")' : ''}
        const state = new ${stateClassName}( __params__ );
        return state
      }
      
      static load(): ${stateClassName} {
        ${enableLogs ? 'log("Reading state from storage")' : ''}
        const state = State.defaultState().load() as ${stateClassName};
        return state;
      }`

    let args = ''

    fields.forEach((field) => {
        const [name, typeAndDefault] = field.split(':').map((val) => val.trim())
        const [type, defaultVal] = typeAndDefault.split('=').map((val) => val.trim())

        let val = defaultVal
        if (val === undefined) val = getDefaultValue(type)

        args += `${val}, `
    })

    return func.replace('__params__', args)
}
