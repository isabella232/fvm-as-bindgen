import { ABI } from './types.js'

export const genDefinitionFile = (abi: ABI) => {
    const contractITF = abi.functions
        .map(
            ({ name, return: ret, args }) =>
                `${name} : (${args.map((arg) => `${arg.name}:${translateType(arg.type)}`).join(', ')}) => ${
                    ret.length > 0 ? `${translateType(ret[0].type)}` : 'void'
                }`
        )
        .join('\n\t')

    const contractTypes = abi.types
        .map(({ name, fields }) => `type ${name} = { ${fields.map((field) => `${field.name}: ${translateType(field.type)}`).join('\n')} }`)
        .join('\n')

    return 'interface Contract{\n\t' + contractITF + '\n}\n' + contractTypes
}

function translateType(type: string) {
    switch (type) {
        case 'u64':
        case 'u32':
        case 'u16':
        case 'u8':
        case 'i64':
        case 'i32':
        case 'i16':
        case 'i8':
        case 'f32':
        case 'f64':
            return 'number'
    }

    return type
}
