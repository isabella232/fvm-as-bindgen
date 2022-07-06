export const getCborImports = (stateClassName: string): string => {
    const imports = `
        import {CBOREncoder, CBORDecoder} from "@zondax/assemblyscript-cbor/assembly"
        import {Value, Arr, Str, Integer, Obj, Float, Bytes} from "@zondax/assemblyscript-cbor/assembly/types"
    `

    return imports
}
