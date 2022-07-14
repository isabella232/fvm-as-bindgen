import { ArgumentABI, ParamsType } from '../abi/types.js'

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's']

export function getCborDecode(fields: string[], entryFieldName: string): [string[], string[], ArgumentABI[]] {
    const result: string[] = []
    const paramsAbi: ArgumentABI[] = []

    const fieldsToCall: string[] = []
    fields.forEach((field, index) => {
        const [name, typeAndDefault] = field.split(':').map((val) => val.trim())
        const [type, defaultValue] = typeAndDefault.split('=').map((val) => val.trim())

        decodeTypes(result, 'array', entryFieldName, name, type, index.toString())

        fieldsToCall.push(name)
        paramsAbi.push({ name, type: type as ParamsType, defaultValue })
    })

    return [result, fieldsToCall, paramsAbi]
}

export function decodeTypes(
    result: string[],
    parentType: string,
    parentName: string,
    fieldName: string,
    fieldType: string,
    rootIndex: string
) {
    const translated = translateBasicTypes(parentName, parentType, rootIndex, fieldType, false)
    if (translated != '') {
        result.push(`let ${fieldName} = ${translated}`)
        return
    }

    if (fieldType.startsWith('Array')) {
        const elementType = fieldType.split('<')[1].split('>')[0]

        let accessor = getAccessor(parentName, parentType, rootIndex || fieldName, false)
        result.push(`let ${fieldName}_raw = (${accessor} as Arr).valueOf()`)
        result.push(`let ${fieldName} = new Array<${elementType}>()`)

        let newIndex = getNewIndexLetter(result, fieldName)
        result.push(`for(let ${newIndex} = 0; ${newIndex} < ${fieldName}_raw.length; ${newIndex}++){`)
        result.push(`${fieldName}.push(${translateBasicTypes(`${fieldName}_raw`, 'array', newIndex, elementType, true)})`)
        result.push(`}`)
        return
    }

    if (fieldType.startsWith('Map')) {
        let [keyType, valueType] = fieldType.split('<')[1].split('>')[0].split(',')
        keyType = keyType.trim()
        valueType = valueType.trim()

        let accessor = getAccessor(parentName, parentType, rootIndex || fieldName, false)
        result.push(`let ${fieldName}_raw = (${accessor} as Obj).valueOf()`)
        result.push(`let ${fieldName}_keys =  ${fieldName}_raw.keys()`)
        result.push(`let ${fieldName} = new Map<${keyType}, ${valueType}>()`)

        let newIndex = getNewIndexLetter(result, fieldName)
        result.push(`for(let ${newIndex} = 0; ${newIndex} < ${fieldName}_keys.length; ${newIndex}++){`)
        result.push(`let key = ${fieldName}_keys.at(${newIndex}).toString()`)
        result.push(`${fieldName}.set(key, ${translateBasicTypes(`${fieldName}_raw`, 'object', 'key', valueType, true)})`)
        result.push(`}`)
        return
    }

    let accessor = getAccessor(parentName, parentType, rootIndex || fieldName, false)
    result.push(`let ${fieldName} = ${fieldType}.parse(${accessor})`)

    //throw new Error(`type [${fieldType}] is not supported for decoding`)
}

function getNewIndexLetter(result: string[], currentLetter: string) {
    if (currentLetter == '') return letters[0]

    let isUsed = true,
        i = 0,
        newLetter = ''
    while (isUsed && i != letters.length) {
        i++
        newLetter = letters[i]
        isUsed = result.some((line) => line.includes(`let ${newLetter}`))
    }

    if (i == letters.length) throw new Error('no more indexes to use')
    return newLetter
}

function translateBasicTypes(parentName: string, parentType: string, fieldName: string, fieldType: string, isFieldReference: boolean) {
    let accessor = getAccessor(parentName, parentType, fieldName, isFieldReference)

    switch (fieldType) {
        case 'u64':
        case 'u32':
        case 'u16':
        case 'u8':
        case 'i64':
        case 'i32':
        case 'i16':
        case 'i8':
            return `${fieldType}((${accessor} as Integer).valueOf())`

        case 'f64':
        case 'f32':
            return `${fieldType}((${accessor} as Float).valueOf())`

        case 'string':
            return `(${accessor} as Str).valueOf()`

        case 'boolean':
            return `(${accessor} as Boolean).valueOf()`

        case 'null':
            return `(${accessor} as Null).valueOf()`

        case 'Uint8Array':
            return `(${accessor} as Bytes).valueOf()`

        default:
            return ''
    }
}

function getAccessor(parentName: string, parentType: string, fieldName: string, isFieldReference: boolean) {
    switch (parentType) {
        case 'object':
            if (isFieldReference) return `${parentName}.get(${fieldName})`
            return `${parentName}.get("${fieldName}")`

        case 'array':
            return `${parentName}.at(${fieldName})`

        default:
            return ''
    }
}
