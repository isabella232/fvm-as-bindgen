import {
    Source,
    FunctionDeclaration,
    ClassDeclaration,
    FieldDeclaration,
    DecoratorNode,
    Statement,
    PropertyAccessExpression,
} from 'assemblyscript'
import { toString, isFunction, isClass, isField, isMethod, isEntry, isPropertyAccess } from './utils.js'
import { getInvokeImports, getInvokeFunc } from './codegen/invoke/index.js'
import { getStateEncodeFunc, getStateDecodeFunc, getStateStaticFuncs } from './codegen/state/index.js'
import { getReturnParser } from './codegen/return/index.js'
import { getParamsDecodeLines, getParamsParseLine } from './codegen/params/index.js'
import { BASE_STATE_LOAD_FUNC, BASE_STATE_SAVE_FUNC } from './codegen/constants.js'
import { getClassDecodeFunc, getClassEncodeFunc, getClassStaticFuncs } from './codegen/classes/index.js'
import { getConstructor } from './codegen/state/utils.js'
import { isBaseStateClass, isConstructorMethod, isExportMethod, isStateClass } from './codegen/utils.js'
import { getCborImports } from './codegen/cbor/imports.js'
import { generateConstructorAbi, generateFieldAbi, generateFuncAbi } from './codegen/abi/index.js'
import { FunctionABI, FieldABI } from './codegen/abi/types.js'

type IndexesUsed = { [key: string]: boolean }

export class Builder {
    sb: string[] = []
    functionsABI: FunctionABI[] = []
    typesABI: FieldABI[] = []
    enableLog: boolean = false

    constructor(enableLog: boolean) {
        this.enableLog = enableLog
    }

    build(source: Source): [FunctionABI[], FieldABI[], string, boolean] {
        const newSource = isEntry(source) ? this.processIndexFile(source) : this.processUserFile(source)

        return [this.functionsABI, this.typesABI, newSource, isEntry(source)]
    }

    protected processIndexFile(source: Source): string {
        let constructorFound = false

        this.sb.push(getInvokeFunc(this.enableLog))
        this.sb.push(getInvokeImports(this.enableLog))

        let invokeCustomMethods: string[] = []
        const indexesUsed: IndexesUsed = {}

        let sourceText = source.statements.map((stmt) => {
            if (isClass(stmt)) return this.handleCustomClass(stmt as ClassDeclaration)

            if (!isFunction(stmt)) return toString(stmt)
            const _stmt = stmt as FunctionDeclaration

            const exportMethodDecorator = isExportMethod(_stmt)
            if (exportMethodDecorator) this.handleExportMethod(_stmt, exportMethodDecorator, indexesUsed, invokeCustomMethods)

            if (isConstructorMethod(_stmt)) {
                constructorFound = true
                this.handleConstructor(_stmt)
            }

            return toString(stmt)
        })

        if (!constructorFound) {
            this.functionsABI.push(generateConstructorAbi([]))
            this.sb[0] = this.sb[0].replace('__constructor-func__', '')
        }

        this.sb[0] = this.sb[0].replace('__user-methods__', invokeCustomMethods.join('\n'))

        return sourceText.concat(this.sb).join('\n')
    }

    protected processUserFile(source: Source): string {
        let sourceText = source.statements.map((stmt) => {
            if (!isClass(stmt)) return toString(stmt)

            let _stmt = stmt as ClassDeclaration

            if (isBaseStateClass(_stmt)) return this.handleBaseStateClass(stmt)
            if (isStateClass(_stmt)) return this.handleStateClass(stmt)

            return this.handleCustomClass(_stmt)
        })

        return this.sb.concat(sourceText).join('\n')
    }

    protected handleExportMethod(
        _stmt: FunctionDeclaration,
        decorators: DecoratorNode,
        indexesUsed: IndexesUsed,
        invokeCustomMethods: string[]
    ) {
        const { args } = decorators

        if (!args || args.length > 1 || (isNaN(parseInt(toString(args[0]))) && !isPropertyAccess(args[0])))
            throw new Error('export_method decorator requires only one integer or one enum value as argument')

        const indexStr = toString(args[0])
        if (!isNaN(parseInt(indexStr)) && parseInt(indexStr) < 2) throw new Error('export_method decorator index should be higher than 1')
        if (indexesUsed[indexStr]) throw new Error(`export_method decorator index ${indexStr} is duplicated`)

        indexesUsed[indexStr] = true

        const funcCall = `__wrapper_${_stmt.name.text}(paramsID)`
        const funcSignature = `__wrapper_${_stmt.name.text}(paramsID: u32)`
        const returnCallName = `__encodeReturn_${_stmt.name.text}`

        const paramFields = _stmt.signature.parameters.map((field) => toString(field))
        const parseParamsLines = getParamsParseLine(this.enableLog)
        const [decodeParamsLines, paramsToCall, paramsAbi] = getParamsDecodeLines(paramFields, this.enableLog)

        const returnTypeStr = toString(_stmt.signature.returnType)

        invokeCustomMethods.push(`case ${indexStr}:`)
        switch (returnTypeStr) {
            case 'void':
                invokeCustomMethods.push(`${funcCall}`)
                invokeCustomMethods.push(`return NO_DATA_BLOCK_ID`)

                this.sb.push(`
                                function ${funcSignature}:void {
                                    ${parseParamsLines}
                                    ${decodeParamsLines.join('\n')}
                                    ${_stmt.name.text}(${paramsToCall.join(',')})
                                }
                            `)

                this.functionsABI.push(generateFuncAbi(_stmt.name.text, parseInt(indexStr), paramsAbi, []))

                break
            default:
                invokeCustomMethods.push(`const result = ${funcCall}`)
                invokeCustomMethods.push(`return create(DAG_CBOR, result)`)

                const [returnFunc, returnAbi] = getReturnParser(returnCallName, 'result', returnTypeStr, this.enableLog)
                this.sb.push(`
                                function ${funcSignature}:Uint8Array {
                                    ${parseParamsLines}
                                    ${decodeParamsLines.join('\n')}
                                    
                                    const result = ${_stmt.name.text}(${paramsToCall.join(',')})
                                    return ${returnCallName}(result) 
                                }
                                ${returnFunc}
                            `)

                this.functionsABI.push(generateFuncAbi(_stmt.name.text, parseInt(indexStr), paramsAbi, returnAbi))

                break
        }
    }

    protected handleConstructor(_stmt: FunctionDeclaration) {
        const paramFields = _stmt.signature.parameters.map((field) => toString(field))
        const [decodeParamsLines, paramsToCall, paramsAbi] = getParamsDecodeLines(paramFields, this.enableLog)
        const newLines = `
                        ${decodeParamsLines.join('\n')}
                        ${_stmt.name.text}(${paramsToCall.join(',')})
                    `

        this.functionsABI.push(generateConstructorAbi(paramsAbi))

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
        return toString(stmt)
    }

    protected handleStateClass(stmt: Statement): string {
        let _stmt = stmt as ClassDeclaration
        // Encode func
        const fields = _stmt.members.filter((mem) => isField(mem)).map((field) => toString(field as FieldDeclaration))
        const encodeFunc = getStateEncodeFunc(fields, this.enableLog).join('\n')
        const decodeFunc = getStateDecodeFunc(toString(_stmt.name), fields, this.enableLog).join('\n')
        const [constFunc, constSignature] = getConstructor(fields, true)
        const defaultFunc = getStateStaticFuncs(toString(_stmt.name), fields, this.enableLog)

        const cborImports = getCborImports(toString(_stmt.name), this.enableLog)
        if (!this.sb.includes(cborImports)) this.sb.push(cborImports)

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
        const encodeFunc = getClassEncodeFunc(toString(stmt.name), fields)
        const [decodeFunc, _, paramsAbi] = getClassDecodeFunc(toString(stmt.name), fields)
        const staticFunc = getClassStaticFuncs(toString(stmt.name), fields)
        const [constFunc, constSignature] = getConstructor(fields, false)

        const cborImports = getCborImports(toString(stmt.name), this.enableLog)
        if (!this.sb.includes(cborImports)) this.sb.push(cborImports)

        this.typesABI.push(generateFieldAbi(stmt.name.text, paramsAbi))

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
                ${encodeFunc.join('\n')}
                ${decodeFunc.join('\n')}
            }`

        return classStr
    }
}
