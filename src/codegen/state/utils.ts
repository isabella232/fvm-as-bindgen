export const getConstructor = (fields: string[], inherit: boolean): [string, string] => {
    let constructor = `constructor( __arguments__ ) {
        ${inherit ? 'super()' : ''}
        __body__
    }`

    let args = ''
    let body = ''

    fields.forEach((field) => {
        const [name, typeAndDefault] = field.split(':')
        const [type, defaultVal] = typeAndDefault.split('=')

        args += `${name}: ${type}, `
        body += '\n' + `this.${name} = ${name}`
    })

    constructor = constructor.replace('__arguments__', args).replace('__body__', body)
    return [constructor, constructor.split('{')[0].replaceAll(' ', '')]
}

export function getDefaultValue(type: string): string {
    switch (type) {
        case 'u64':
        case 'u32':
        case 'u16':
        case 'u8':
        case 'i64':
        case 'i32':
        case 'i16':
        case 'i8':
            return '0'

        case 'f64':
        case 'f32':
            return '0.0'

        case 'string':
            return '""'

        case 'boolean':
            return 'false'

        default:
            if (type.startsWith('Array')) {
                const arrayType = type.split('<')[1].split('>')[0]
                return `new Array<${arrayType}>()`
            }

            if (type.startsWith('Map')) {
                const [keyType, valueType] = type.split('<')[1].split('>')[0].split(',')
                return `new Map<${keyType}, ${valueType}>()`
            }

            return `${type}.defaultInstance()`

        //throw new Error(`default value for this type ${type} is not supported`)
    }
}
