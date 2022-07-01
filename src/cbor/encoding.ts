const letters = ["a","b","c","d","e","f","g","h","i","j","k"]

export function encode(fields: string[]){
    let result: string[] = []
    result.push("protected encode(): ArrayBuffer {")
    result = result.concat(getCborEncode(fields, true))
    result.push("return encoder.serialize()")
    result.push("}")

    return result
}

export function getCborEncode(fields: string[], isClass: boolean): string[]{
    const result: string[] = []
    result.push("const encoder = new CBOREncoder();")
    result.push(`encoder.addArray(${fields.length})`)

    fields.forEach( field => {
        const [name, typeAndDefault] = field.split(":")
        const [type, defaultVal] = typeAndDefault.split("=")
        encodeTypes(result, type.trim(), name.trim(), isClass, "","")
    })

    return result
}

export function encodeTypes(result: string[], type: string, fieldName: string, isClass: boolean, indexType: string, indexName: string){
    let index;
    let fieldAccessor = `${isClass ? "this." : ""}${fieldName}`;
    switch (indexType){
        case "array":
            index =`[${indexName}]`
            break
        case "map":
            index =`.get(${indexName})`
            break
        default:
            index = ""
            break
    }



    let _type;
    switch (type){
        case "u64":
        case "u32":
        case "u16":
        case "u8":
            _type = type.replace("u", "")
            result.push(`encoder.addUint${_type}(${fieldAccessor}${index})`)
            break

        case "i64":
        case "i32":
        case "i16":
        case "i8":
            _type = type.replace("i", "")
            result.push(`encoder.addInt${_type}(${fieldAccessor}${index})`)
            break

        case "f64":
        case "f32":
            _type = type.replace("f", "")
            result.push(`encoder.addF${_type}(${fieldAccessor}${index})`)
            break

        case "string":
            result.push(`encoder.addString(${fieldAccessor}${index})`)
            break

        case "boolean":
            result.push(`encoder.addBoolean(${fieldAccessor}${index})`)
            break

        case "null":
            result.push(`encoder.addNull(${fieldAccessor}${index})`)
            break

        case "Uint8Array":
            result.push(`encoder.addBytes(${fieldAccessor}${index})`)
            break

        default:
            if( type.startsWith("Array") ){
                const arrayType = type.split("<")[1].split(">")[0]

                result.push(`encoder.addArray(${fieldAccessor}.length)`)
                let newIndex = getNewIndexLetter(result, indexName)
                result.push(`for(let ${newIndex} = 0; ${newIndex} < ${fieldAccessor}.length; ${newIndex}++){`)
                encodeTypes(result, arrayType, fieldName, isClass, "array", newIndex)
                result.push(`}`)
                return
            }

            if( type.startsWith("Map") ){
                const [keyType, valueType] = type.split("<")[1].split(">")[0].split(",")

                let newIndex = getNewIndexLetter(result, indexName)
                result.push(`let keys_${newIndex} = ${fieldAccessor}.keys()`)

                result.push(`encoder.addObject(keys_${newIndex}.length)`)

                result.push(`for(let ${newIndex} = 0; ${newIndex} < keys_${newIndex}.length; ${newIndex}++){`)
                result.push(`encoder.addKey(keys_${newIndex}[${newIndex}].toString())`)
                encodeTypes(result, valueType.trim(), fieldName, isClass, "map", `keys_${newIndex}[${newIndex}]`)
                result.push(`}`)
                return
            }

            throw new Error(`type [${type}] is not supported for encoding`)
    }
}

export function getNewIndexLetter(result: string[], currentLetter: string){
    if(currentLetter == "") return letters[0]

    let isUsed = true, i = 0, newLetter = ""
    while(isUsed && i != letters.length) {
        i++
        newLetter = letters[i]
        isUsed = result.some(line => line.includes(`let ${newLetter}`))
    }

    if( i == letters.length ) throw new Error("no more indexes to use")
    return newLetter
}
