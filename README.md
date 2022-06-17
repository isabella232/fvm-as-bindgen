# FVM AssemblyScript Bindgen
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GithubActions](https://github.com/Zondax/fvm-as-bindgen/actions/workflows/main.yaml/badge.svg)](https://github.com/Zondax/fvm-as-bindgen/blob/master/.github/workflows/main.yaml)


## Goal 
This projects aims to abstract as much fvm-related logic as it could from used-defined smart contracts in Filecoin network.
Thanks to the ability to provide [custom transformation](https://www.assemblyscript.org/compiler.html#transforms) class to the AS compiler,
code strictly related to FVM can be added before compiling the smart contract code to WASM.

## How to build it
You just need to run these two steps
```
yarn install
yarn build
```

## How to use it
In other to identify the file the transformation should work on, users will need to add `// @filecoinfile` comment at the very beginning of the 
index file. 

## Foundational projects
Packages used to build this lib:

- [Near transformation class](https://github.com/near/near-sdk-as/bindgen)
