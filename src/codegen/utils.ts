import { Source, FunctionDeclaration, DecoratorNode, ClassDeclaration } from 'assemblyscript'
import {
    BASE_STATE_DECORATOR,
    CONSTRUCTOR_DECORATOR,
    ENABLE_LOG_FLAG,
    EXPORT_METHOD_DECORATOR,
    NOT_CHAIN_FILE_DECORATOR,
    STATE_DECORATOR,
} from './constants.js'
import { isEntry, isUserFile, toString } from '../utils.js'

export const enableLogs = (sources: Source[]): boolean => sources.some((src) => src.text.includes(ENABLE_LOG_FLAG))
export const chainFiles = (sources: Source[]): Source[] => sources.filter(hasChainDecorator)
export const isNotChainFile = (src: Source): boolean => src.text.includes(NOT_CHAIN_FILE_DECORATOR)

function hasChainDecorator(src: Source): boolean {
    return (
        !isNotChainFile(src) &&
        (isUserFile(src) || (isEntry(src) && !src.normalizedPath.startsWith('@') && !src.normalizedPath.startsWith('~')))
    )
}

export const isExportMethod = (_stmt: FunctionDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == EXPORT_METHOD_DECORATOR) : undefined

export const isConstructorMethod = (_stmt: FunctionDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == CONSTRUCTOR_DECORATOR) : undefined

export const isBaseStateClass = (_stmt: ClassDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == BASE_STATE_DECORATOR) : undefined

export const isStateClass = (_stmt: ClassDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == STATE_DECORATOR) : undefined
