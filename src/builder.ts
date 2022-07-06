import { Source, FunctionDeclaration, ClassDeclaration, FieldDeclaration, DecoratorNode, Statement } from 'assemblyscript'
import { toString, isFunction, isClass, isField, isMethod, isEntry } from './utils.js'
import { getInvokeImports, getInvokeFunc } from './codegen/invoke/index.js'
import { getStateEncodeFunc, getStateDecodeFunc } from './codegen/state/index.js'
import { getStateStaticFuncs, getStateImports } from './codegen/state/index.js'
import { getReturnParser } from './codegen/return/index.js'
import { getParamsDecodeLines } from './codegen/params/index.js'
import { BASE_STATE_LOAD_FUNC, BASE_STATE_SAVE_FUNC } from './codegen/constants.js'
import { getClassDecodeFunc, getClassEncodeFunc, getClassStaticFuncs } from './codegen/classes/index.js'
import { getConstructor } from './codegen/state/utils.js'
import { isBaseStateClass, isConstructorMethod, isExportMethod, isStateClass } from './codegen/utils.js'

type IndexesUsed = { [key: string]: boolean }

export class Builder {
    sb: string[]
    constructor() {
        this.sb = []
    }

    build(source: Source): [string, boolean] {
        if (isEntry(source)) return [this.processIndexFile(source), true]
        return [this.processUserFile(source), false]
    }

    protected processIndexFile(source: Source): string {
        this.sb.push(getInvokeFunc())
        this.sb.push(getInvokeImports())

        let invokeCustomMethods: string[] = []
        const indexesUsed: IndexesUsed = {}

        let sourceText = source.statements.map((stmt) => {
            if (isClass(stmt)) return this.handleCustomClass(stmt as ClassDeclaration)

            if (!isFunction(stmt)) return toString(stmt)
            const _stmt = stmt as FunctionDeclaration

            const exportMethodDecorator = isExportMethod(_stmt)
            if (exportMethodDecorator) this.handleExportMethod(_stmt, exportMethodDecorator, indexesUsed, invokeCustomMethods)

            if (isConstructorMethod(_stmt)) this.handleConstructor(_stmt)

            return toString(stmt)
        })

        this.sb[0] = this.sb[0].replace('__user-methods__', invokeCustomMethods.join('\n'))

        let str = sourceText.concat(this.sb).join('\n')
        return str
    }

    protected processUserFile(source: Source): string {
        let importsToAdd: string[] = []

        let sourceText = source.statements.map((stmt) => {
            if (!isClass(stmt)) return toString(stmt)

            let _stmt = stmt as ClassDeclaration

            if (isBaseStateClass(_stmt)) return this.handleBaseStateClass(stmt)
            if (isStateClass(_stmt)) return this.handleStateClass(stmt, importsToAdd)

            return this.handleCustomClass(_stmt)
        })

        let str = importsToAdd.concat(sourceText.concat(this.sb)).join('\n')
        return str
    }

    protected handleExportMethod(
        _stmt: FunctionDeclaration,
        decorators: DecoratorNode,
        indexesUsed: IndexesUsed,
        invokeCustomMethods: string[]
    ) {
        const { args } = decorators

        if (!args || args.length > 1 || isNaN(parseInt(toString(args[0]))))
            throw new Error('export_method decorator requires only one integer value as argument')

        const indexStr = toString(args[0])
        if (parseInt(indexStr) < 2) throw new Error('export_method decorator index should be higher than 1')
        if (indexesUsed[indexStr]) throw new Error(`export_method decorator index ${indexStr} is duplicated`)

        indexesUsed[indexStr] = true

        const funcCall = `__wrapper_${_stmt.name.text}(paramsID)`
        const funcSignature = `__wrapper_${_stmt.name.text}(paramsID: u32)`
        const returnCall = `__encodeReturn_${_stmt.name.text}`

        const paramFields = _stmt.signature.parameters.map((field) => toString(field))
        const paramsParserLines = getParamsDecodeLines(paramFields)

        const returnTypeStr = toString(_stmt.signature.returnType)

        invokeCustomMethods.push(`case ${indexStr}:`)
        switch (returnTypeStr) {
            case 'void':
                invokeCustomMethods.push(`${funcCall}`)
                invokeCustomMethods.push(`return NO_DATA_BLOCK_ID`)

                this.sb.push(`
                                function ${funcSignature}:void {
                                    const decoded = decodeParamsRaw(paramsRaw(paramsID))
                                    ${paramsParserLines[0].join('\n')}
                                    ${_stmt.name.text}(${paramsParserLines[1].join(',')})
                                }
                            `)
                break
            default:
                invokeCustomMethods.push(`const result = ${funcCall}`)
                invokeCustomMethods.push(`return create(DAG_CBOR, result)`)

                this.sb.push(`
                                function ${funcSignature}:Uint8Array {
                                    const decoded = decodeParamsRaw(paramsRaw(paramsID))
                                    ${paramsParserLines[0].join('\n')}
                                    
                                    const result = ${_stmt.name.text}(${paramsParserLines[1].join(',')})
                                    
                                    return ${returnCall}(result) 
                                }
                                ${getReturnParser(returnCall, 'result', returnTypeStr)}
                            `)
                break
        }
    }

    protected handleConstructor(_stmt: FunctionDeclaration) {
        const paramFields = _stmt.signature.parameters.map((field) => toString(field))
        const paramsParserLines = getParamsDecodeLines(paramFields)
        const newLines = `
                        ${paramsParserLines[0].join('\n')}
                        ${_stmt.name.text}(${paramsParserLines[1].join(',')})
                    `

        this.sb[0] = this.sb[0].replace('__constructor-func__', newLines)
    }

    protected handleBaseStateClass(stmt: Statement): string {
        // Remove base functions from base state class

        let _stmt = stmt as ClassDeclaration
        _stmt.members = _stmt.members.filter((mem) => {
            if (isMethod(mem)) {
                const _mem = mem as FunctionDeclaration
                const name = toString(_mem.name)
                return name != BASE_STATE_SAVE_FUNC && name != BASE_STATE_LOAD_FUNC
            }
            return true
        })
        let classStr = toString(stmt)
        return classStr
    }

    protected handleStateClass(stmt: Statement, importsToAdd: string[]): string {
        let _stmt = stmt as ClassDeclaration
        // Encode func
        const fields = _stmt.members.filter((mem) => isField(mem)).map((field) => toString(field as FieldDeclaration))
        const encodeFunc = getStateEncodeFunc(fields).join('\n')
        const decodeFunc = getStateDecodeFunc(toString(_stmt.name), fields).join('\n')
        const [constFunc, constSignature] = getConstructor(fields, true)
        const defaultFunc = getStateStaticFuncs(toString(_stmt.name), fields)

        // Base func
        const imports = getStateImports(toString(_stmt.name))
        importsToAdd.push(imports)

        let classStr = toString(stmt)
        classStr = classStr.slice(0, classStr.lastIndexOf('}'))
        classStr += `
                        ${constFunc}
                        ${defaultFunc}
                        ${encodeFunc}
                        ${decodeFunc}
                    }`

        return classStr
    }

    protected handleCustomClass(stmt: ClassDeclaration) {
        const fields = stmt.members.filter((mem) => isField(mem)).map((field) => toString(field as FieldDeclaration))
        const encodeFunc = getClassEncodeFunc(toString(stmt.name), fields).join('\n')
        const decodeFunc = getClassDecodeFunc(toString(stmt.name), fields).join('\n')
        const staticFunc = getClassStaticFuncs(toString(stmt.name), fields)
        const [constFunc, constSignature] = getConstructor(fields, false)

        stmt.members.map((_mem) => {
            if (isMethod(_mem) && toString(_mem.name) == 'constructor')
                throw new Error(
                    `constructor method will be generated automatically, please remove it from class [${toString(
                        stmt.name
                    )}]. Its signature will be [${constSignature}]`
                )
        })

        let classStr = toString(stmt)
        classStr = classStr.slice(0, classStr.lastIndexOf('}'))
        classStr += `
                ${constFunc}
                ${staticFunc}
                ${encodeFunc}
                ${decodeFunc}
            }`

        return classStr
    }
}
