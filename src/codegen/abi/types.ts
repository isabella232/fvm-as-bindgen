export type ParamsType = 'u64' | 'u32' | 'u16' | 'u8' | 'i64' | 'i32' | 'i16' | 'i8' | 'string'

export type ReturnABI = {
    type: ParamsType
}

export type ArgumentABI = {
    name: string
    type: ParamsType
    defaultValue: string
}

export type FunctionABI = {
    type: 'function'
    name: string
    index: number
    args: ArgumentABI[]
    return: ReturnABI[]
}

export type FieldABI = {
    type: 'object'
    name: string
    fields: ArgumentABI[]
}

export type ABI = { functions: FunctionABI[]; types: FieldABI[]; version: string }
