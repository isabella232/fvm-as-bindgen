import { Source, FunctionDeclaration, DecoratorNode, ClassDeclaration } from 'assemblyscript'
import {
    BASE_STATE_DECORATOR,
    CHAIN_FILE_INDEX_DECORATOR,
    CHAIN_FILE_STATE_DECORATOR,
    CONSTRUCTOR_DECORATOR,
    EXPORT_METHOD_DECORATOR,
    NOT_CHAIN_FILE_DECORATOR,
    STATE_DECORATOR,
} from './constants.js'
import { isEntry, toString } from '../utils.js'

export const chainFiles = (sources: Source[]): Source[] => sources.filter(hasChainDecorator)
export const isIndexChainFile = (src: Source): boolean => src.text.includes(CHAIN_FILE_INDEX_DECORATOR)
export const isStatusChainFile = (src: Source): boolean => src.text.includes(CHAIN_FILE_STATE_DECORATOR)

function hasChainDecorator(stmt: Source): boolean {
    const status =
        (isEntry(stmt) || stmt.text.includes(CHAIN_FILE_INDEX_DECORATOR) || stmt.text.includes(CHAIN_FILE_STATE_DECORATOR) || false) &&
        !stmt.text.includes(NOT_CHAIN_FILE_DECORATOR)
    return status
}

export const isExportMethod = (_stmt: FunctionDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == EXPORT_METHOD_DECORATOR) : undefined

export const isConstructorMethod = (_stmt: FunctionDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == CONSTRUCTOR_DECORATOR) : undefined

export const isBaseStateClass = (_stmt: ClassDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == BASE_STATE_DECORATOR) : undefined

export const isStateClass = (_stmt: ClassDeclaration): DecoratorNode | undefined =>
    _stmt.decorators ? _stmt.decorators.find((dec) => toString(dec.name) == STATE_DECORATOR) : undefined
