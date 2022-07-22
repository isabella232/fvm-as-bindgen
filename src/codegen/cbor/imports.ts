export const getCborImports = (stateClassName: string, enableLogs: boolean): string => {
    const imports = `
        import {CBOREncoder, CBORDecoder} from "@zondax/assemblyscript-cbor/assembly"
        import {Value, Arr, Str, Integer, Obj, Float, Bytes} from "@zondax/assemblyscript-cbor/assembly/types"
        ${enableLogs ? 'import {log} from "@zondax/fvm-as-sdk/assembly/wrappers"' : ''}
    `

    return imports
}
