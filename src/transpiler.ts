// import * as Babel from '@babel/core';

const Babel = require('@babel/standalone');

export function transpileToES5(code: string): string {
  if (!code.trim()) {
    return '';
  }
  try {
    // console.log(Babel.availablePresets);
    const result = Babel.transform(code, {
      presets: ["es2015"]
    });

    if (!result || !result.code) {
      throw new Error('Transpilation failed: no output produced');
    }
    
    // console.log("Original ES6 Code:\n", code);
    // console.log("\nTranspiled ES5 Code:\n", result.code);

    return result.code;
  } catch (error: any) {
    throw new Error(error.message);
  }
}