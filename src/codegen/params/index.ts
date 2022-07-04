import {getCborDecode} from "../cbor/decoding.js";

export function getParamsDecodeLines(fields: string[]) : string[][]{
    let result: string[] = []

    result.push(`if( !decoded.isArr ) throw new Error("params rcv should be encoded in a CBOR array")`)
    result.push(`let arrParams = (decoded as Arr).valueOf()`)

    const [extraLines, fieldsForState] = getCborDecode(fields, "arrParams")
    result = result.concat(extraLines)

    return [result, fieldsForState]
}
