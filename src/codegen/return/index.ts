import { getCborEncode } from '../cbor/encoding.js'
import { ParamsType, ReturnABI } from '../abi/types.js'

export function getReturnParser(funcName: string, returnVarName: string, returnType: string, enableDebug: boolean): [string, ReturnABI[]] {
    let sb: string[] = []
    sb.push(`function ${funcName}(${returnVarName}: ${returnType}):${returnType === 'void' ? 'void' : 'Uint8Array'}{`)

    switch (returnType) {
        case 'CBOREncoder':
            sb.push(`const resp = Uint8Array.wrap(${returnVarName}.serialize())`)
            break
        case 'Uint8Array':
            sb.push(`const resp = ${returnVarName}`)
            break
        default:
            sb = sb.concat(getCborEncode([`${returnVarName}:${returnType}`], ''))
            sb.push(`const resp = Uint8Array.wrap(encoder.serialize())`)
            break
    }
    if (enableDebug)
        sb.push(
            `log("Return values (hex) --> " + ${
                returnType == 'void' ? 'void' : "resp.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')"
            })`
        )

    sb.push(returnType == 'void' ? `return` : `return resp`)
    sb.push(`}`)

    return [sb.join('\n'), [{ type: returnType as ParamsType }]]
}
