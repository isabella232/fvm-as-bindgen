import path from "path"
import {NodeKind, SourceKind, CommonFlags, DeclarationStatement, Source, Node, ASTBuilder} from "assemblyscript"

export const VALID_RETURN_TYPES = ["void", "Uint8Array"]

export function chainFiles(sources: Source[]){
    return sources.filter(hasChainDecorator)
}

function hasChainDecorator(stmt: Source): boolean {
    const status =  (
        (isEntry(stmt)
            || stmt.text.includes("@chainfile-index")
            || stmt.text.includes("@chainfile-state")
            || false
        ) &&
        !stmt.text.includes("@notchainfile")
    );
    return status
}

export function isEntry(source: Source | Node): boolean {
    return source.range.source.sourceKind == SourceKind.USER_ENTRY;
}

export function isClass(type: Node): boolean {
    return type.kind == NodeKind.CLASSDECLARATION;
}

export function isFunction(type: Node): boolean {
    return type.kind == NodeKind.FUNCTIONDECLARATION;
}

export function isMethod(type: Node): boolean {
    return type.kind == NodeKind.METHODDECLARATION;
}

export function isField(mem: DeclarationStatement) {
    return mem.kind == NodeKind.FIELDDECLARATION;
}

function isStatic(mem: DeclarationStatement) {
    return mem.is(CommonFlags.STATIC);
}

function isEncodable(mem: DeclarationStatement) {
    return isField(mem) && !isStatic(mem);
}

export function toString(node: Node): string {
    return ASTBuilder.build(node);
}

export function posixRelativePath(from: string, to: string): string {
    const relativePath = path.relative(from, to);
    return relativePath.split(path.sep).join(path.posix.sep);
}

export function importsInvoke(): string{
    return `
        import {CBOREncoder} from "@zondax/assemblyscript-cbor/assembly";
        import {NO_DATA_BLOCK_ID, DAG_CBOR} from "@zondax/fvm-as-sdk/assembly/env";
        import {methodNumber, usrUnhandledMsg, create, paramsRaw} from "@zondax/fvm-as-sdk/assembly/wrappers";
        import {isConstructorCaller} from "@zondax/fvm-as-sdk/assembly/helpers";
    `
}

export function getInvokeFunc(): string{
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
              
              const params = paramsRaw(paramsID)
              
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
