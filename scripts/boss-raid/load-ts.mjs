import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';
// Offline tooling only: execute the same TS schema/rules as the app without a second implementation.
export function loadTs(file,globals={},overrides={}){
 const cache=new Map();
 function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;const nodeRequire=createRequire(filename),record={exports:{}};cache.set(filename,record);
  const requireLocal=id=>{if(Object.hasOwn(overrides,id))return overrides[id];if(id.startsWith('.')){const candidate=path.resolve(path.dirname(filename),id);if(fs.existsSync(candidate+'.ts'))return load(candidate+'.ts');}return nodeRequire(id);};
  const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(js,{module:record,exports:record.exports,require:requireLocal,performance,console,setTimeout,clearTimeout,...globals},{filename});return record.exports;
 }
 return load(file);
}
