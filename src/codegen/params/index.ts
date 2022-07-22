import { getCborDecode } from '../cbor/decoding.js'
import { ArgumentABI } from '../abi/types.js'

export function getParamsDecodeLines(fields: string[], enableLogs: boolean): [string[], string[], ArgumentABI[]] {
    let result: string[] = []

    if (enableLogs) result.push(`log("Rcv params (JSON) --> " + decoded.stringify())`)

    result.push(`if( !decoded.isArr ) throw new Error("params rcv should be encoded in a CBOR array")`)
    result.push(`let arrParams = (decoded as Arr).valueOf()`)

    const [extraLines, fieldsToCall, paramsAbi] = getCborDecode(fields, 'arrParams')
    result = result.concat(extraLines)

    return [result, fieldsToCall, paramsAbi]
}

export function getParamsParseLine(enableLog: boolean) {
    return `const rawData = paramsRaw(paramsID)
    ${
        enableLog
            ? `const rawDataStr = Uint8Array.wrap(rawData.raw.buffer).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
            log("Rcv params (hex) --> " + rawDataStr)`
            : ''
    }
    const decoded = decodeParamsRaw(rawData)`
}
