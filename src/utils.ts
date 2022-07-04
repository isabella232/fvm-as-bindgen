import path from 'path'
import { NodeKind, SourceKind, CommonFlags, DeclarationStatement, Source, Node, ASTBuilder } from 'assemblyscript'

export const isEntry = (source: Source | Node): boolean => source.range.source.sourceKind == SourceKind.USER_ENTRY

export const isClass = (type: Node): boolean => type.kind == NodeKind.CLASSDECLARATION

export const isFunction = (type: Node): boolean => type.kind == NodeKind.FUNCTIONDECLARATION

export const isMethod = (type: Node): boolean => type.kind == NodeKind.METHODDECLARATION

export const isField = (mem: DeclarationStatement) => mem.kind == NodeKind.FIELDDECLARATION

export const isStatic = (mem: DeclarationStatement) => mem.is(CommonFlags.STATIC)

export const isEncodable = (mem: DeclarationStatement) => isField(mem) && !isStatic(mem)

export const toString = (node: Node): string => ASTBuilder.build(node)

export const posixRelativePath = (from: string, to: string): string => {
    const relativePath = path.relative(from, to)
    return relativePath.split(path.sep).join(path.posix.sep)
}
