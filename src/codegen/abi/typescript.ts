import { ABI, ArrayRegex, MapRegex } from './types.js'

export const genDefinitionFile = (abi: ABI) => {
    const accountDefinition = 'type Account = { address: string; private_base64: string };'
    const baseArguments = 'account: Account, value: string'

    const paramsITF: string[] = []
    const contractITF = abi.functions
        .map(({ name, return: ret, args }) => {
            let argsField = ''
            if (args.length > 0) {
                paramsITF.push(
                    `export type ${name}Args = { \n\t${args.map((arg) => `${arg.name}:${translateType(arg.type)}`).join(';\n\t')} \n}`
                )

                argsField = `, args: ${name}Args`
            }

            return `${name} : (${baseArguments}${argsField}) => Promise<${ret.length > 0 ? `${translateType(ret[0].type)}` : 'void'}>`
        })
        .join('\n\t')

    const contractTypes = abi.types
        .map(
            ({ name, fields }) =>
                `export type ${name} = { \n\t${fields.map((field) => `${field.name}: ${translateType(field.type)}`).join('\n\t')} \n}`
        )
        .join('\n')

    return (
        accountDefinition + '\n\nexport interface Contract{\n\t' + contractITF + '\n}\n\n' + paramsITF.join('\n') + '\n\n' + contractTypes
    )
}

function translateType(type: string): string {
    switch (type) {
        case 'u32':
        case 'u16':
        case 'u8':
        case 'i32':
        case 'i16':
        case 'i8':
        case 'f32':
        case 'f64':
            return 'number'

        case 'u64':
        case 'i64':
            return 'BigInt'

        case 'Uint8Array':
            return 'Uint8Array'
    }

    if (MapRegex.test(type)) {
        const [_, valueType] = type.split('<')[1].split('>')[0].split(',')
        const translatedValTye = translateType(valueType.trim())

        return `{[key:string]: ${translatedValTye}}`
    }

    if (ArrayRegex.test(type)) {
        const [valueType] = type.split('<')[1].split('>')
        const translatedValTye = translateType(valueType.trim())

        return `${translatedValTye}[]`
    }

    return type
}
