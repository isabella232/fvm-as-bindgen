export function getInvokeImports(): string {
    return `
        import {CBOREncoder} from "@zondax/assemblyscript-cbor/assembly";
        import {NO_DATA_BLOCK_ID, DAG_CBOR} from "@zondax/fvm-as-sdk/assembly/env";
        import {methodNumber, usrUnhandledMsg, create, paramsRaw} from "@zondax/fvm-as-sdk/assembly/wrappers";
        import {isConstructorCaller} from "@zondax/fvm-as-sdk/assembly/helpers";
        import {decodeParamsRaw} from "@zondax/fvm-as-sdk/assembly/utils/params";
        import {Value, Arr, Str, Integer, Obj, Float, Bytes} from "@zondax/assemblyscript-cbor/assembly/types"
    `
}

export function getInvokeFunc(): string {
    const baseFunc = `
        export function invoke(paramsID: u32): u32 {
    
          // Read invoked method number
          const methodNum = u32(methodNumber())
        
          switch (methodNum) {
            // Method number 1 is fixe for create actor command
            case 1:
              // The caller of this method should be always the same.
              // Nobody else should call the constructor
              if( !isConstructorCaller() ) return NO_DATA_BLOCK_ID
              
              const decoded = decodeParamsRaw(paramsRaw(paramsID))
              
              // Call constructor func.
              __constructor-func__
              
              // Return no data
              return NO_DATA_BLOCK_ID
            
            __user-methods__
            
            // If the method number is not implemented, an error should be retrieved
            default:
                usrUnhandledMsg()
                return NO_DATA_BLOCK_ID
          }
        }
        `

    return baseFunc
}
