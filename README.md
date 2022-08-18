# FVM AssemblyScript Bindgen
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GithubActions](https://github.com/Zondax/fvm-as-bindgen/actions/workflows/main.yaml/badge.svg)](https://github.com/Zondax/fvm-as-bindgen/blob/master/.github/workflows/main.yaml)


---

![zondax_light](docs/assets/zondax_light.png#gh-light-mode-only)
![zondax_dark](docs/assets/zondax_dark.png#gh-dark-mode-only)

_Please visit our website at [zondax.ch](https://www.zondax.ch)_

---

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
These are a series of decorators you should set on your smart contract in order to tag files, functions and classes
the package will process.

- Use to indicate which class should be used as smart contract state
```
// @ts-ignore
@state
```
- Use to indicate the function that will be executed on smart contract instantiation

```
// @ts-ignore
@constructor
```

- Use to indicate functions that will be exported so that they can be called from the outside world
- They will be set as method to be invoked.
```
// @ts-ignore
@export_method()
```

## Foundational projects
Packages used to build this lib:

- [Near transformation class](https://github.com/near/near-sdk-as/bindgen)
