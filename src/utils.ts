import path from "path"
import {NodeKind, SourceKind, CommonFlags, DeclarationStatement, Source, Node, ASTBuilder} from "assemblyscript"



const FILECOIN_DECORATOR = "filecoinBindgen";

export function filecoinFiles(sources: Source[]){
    return sources.filter(hasFilecoinDecorator)
}

function hasFilecoinDecorator(stmt: Source): boolean {
    const status =  (
        (isEntry(stmt) || stmt.text.includes("@filecoinfile") || false
            /*stmt.statements.some(
                (s:any) =>
                    s instanceof DeclarationStatement &&
                    utils.hasDecorator(s, FILECOIN_DECORATOR)
            )*/) &&
        !stmt.text.includes("@notFilecoinfile")
    );
    return status
}

export function isEntry(source: Source | Node): boolean {
    return source.range.source.sourceKind == SourceKind.USER_ENTRY;
}

function isClass(type: Node): boolean {
    return type.kind == NodeKind.CLASSDECLARATION;
}

function isField(mem: DeclarationStatement) {
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
        import {NO_DATA_BLOCK_ID, DAG_CBOR} from "@zondax/fvm-as-sdk/assembly/env";
        import {methodNumber, usrUnhandledMsg, create} from "@zondax/fvm-as-sdk/assembly/wrappers";
        import {isConstructorCaller} from "@zondax/fvm-as-sdk/assembly/helpers";
    `
}

export function createInvoke(): string{
    const baseFunc = `
    export function invoke(_: u32): u32 {

      // Read invoked method number
      const methodNum = u32(methodNumber())
    
      switch (methodNum) {
        // Method number 1 is fixe for create actor command
        case 1:
          // The caller of this method should be always the same.
          // Nobody else should call the constructor
          if( !isConstructorCaller() ) return NO_DATA_BLOCK_ID
          
          // Call constructor func.
          init()
          
          // Return no data
          return NO_DATA_BLOCK_ID
         
        // If the method number is not implemented, an error should be retrieved
        default:
          const result = mappingMethods(methodNum)
          if(result >= 0){
            return u32(result)
          } else {
            usrUnhandledMsg()
            return NO_DATA_BLOCK_ID
          }
      }
    }`

    return baseFunc
}
