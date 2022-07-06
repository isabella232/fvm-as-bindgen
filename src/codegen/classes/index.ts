import { encodeFields } from '../cbor/encoding.js'
import { getCborDecode } from '../cbor/decoding.js'
import { getDefaultValue } from '../state/utils.js'

export function getClassEncodeFunc(className: string, fields: string[]) {
    let result: string[] = []
    result.push(`static encode(encoder: CBOREncoder, toEncode: ${className}): void {`)
    result = result.concat(encodeFields(fields, 'toEncode'))
    result.push('}')

    return result
}

export function getClassDecodeFunc(className: string, fields: string[]) {
    let result: string[] = []
    result.push(`static parse(parsedData: Value): ${className} {`)
    result.push(`if( !parsedData.isArr ) throw new Error("serialized data on ${className} should be an array")`)
    result.push(`let values = (parsedData as Arr).valueOf()`)

    const [extraLines, fieldsForState] = getCborDecode(fields, 'values')
    result = result.concat(extraLines)

    result.push(`return new ${className}(${fieldsForState.join(',')})`)
    result.push('}')

    return result
}

export const getClassStaticFuncs = (stateClassName: string, fields: string[]): string => {
    const func = `static defaultInstance(): ${stateClassName} {
        return new ${stateClassName}( __params__ );
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
