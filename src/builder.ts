import { Source } from "assemblyscript"
import {createInvoke, importsInvoke, toString} from "./utils.js";

export class Builder{
    static build(source: Source): [string, boolean] {
        const isFilecoinFile = source.text.includes("@filecoinfile");

        let str = toString(source)
        if(isFilecoinFile){
            str += "\n" + importsInvoke() + "\n" + createInvoke()
        }

        return [str, isFilecoinFile]
    }
}
