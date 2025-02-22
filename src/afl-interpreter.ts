// import { Interpreter } from './lib/js-interpreter/interpreter';
const { Interpreter } = require("./lib/js-interpreter/interpreter");
// console.log(Interpreter);

const acorn = require("./lib/js-interpreter/acorn");
// console.log(acorn);
(global as any).acorn = acorn;

// Type definitions for the Interpreter
export interface InterpreterState {
  node: any;
  scope: any;
  done: boolean;
}

export interface InterpreterScope {
  object: any;
  parent: InterpreterScope | null;
}

export interface InterpreterInstance {
  value: any;
  ast: any;
  stateStack: InterpreterState[];
  globalScope: InterpreterScope;
  globalObject: any;
  /**
   * Execute the interpreter to program completion.  Vulnerable to infinite loops.
   * @returns {boolean} True if a execution is asynchronously blocked,
   *     false if no more instructions.
   */
  run(): boolean;
  /**
   * Step through the code one instruction at a time.
   * @returns {boolean} True if a step was taken, false if the program is done.
   */
  step(): boolean;
  appendCode(code: string): void;
  createNativeFunction(nativeFunc: Function, isConstructor: boolean): any;
  createAsyncFunction(asyncFunc: Function): any;
  getProperty(obj: any, name: string): any;
  setProperty(
    obj: any,
    name: string,
    value: any,
    descriptor?: PropertyDescriptor
  ): boolean;
  getStatus(): number;
  nativeToPseudo(nativeObj: any): any;
  pseudoToNative(pseudoObj: any): any;
  getGlobalScope(): InterpreterScope;
  setGlobalScope(scope: InterpreterScope): void;
  getStateStack(): InterpreterState[];
  setStateStack(stack: InterpreterState[]): void;
}

export interface InterpreterResult {
  success: boolean;
  value: any;
  interpreter: InterpreterInstance;
}

/**
 * Run JavaScript code in the interpreter and return the result
 * @param code JavaScript code to execute
 * @returns Object containing success status, final value, and interpreter instance
 */
export function run(code: string): InterpreterResult {
  const interpreter = new Interpreter(code) as InterpreterInstance;
  const success = interpreter.run();
  return {
    success,
    value: interpreter.value,
    interpreter,
  };
}

/**
 * Create a new interpreter instance without running it
 * @param code JavaScript code to interpret
 * @returns Interpreter instance
 */
export function createInterpreter(code: string): InterpreterInstance {
  return new Interpreter(code) as InterpreterInstance;
}

/**
 * Status constants from the Interpreter
 */
export const Status = {
  DONE: 0,
  STEP: 1,
  TASK: 2,
  ASYNC: 3,
} as const;

/**
 * Create a new interpreter with initialization function
 * @param code JavaScript code to interpret
 * @param initFunc Function to initialize the interpreter's global scope
 * @returns Interpreter instance
 */
export function createInterpreterWithInit(
  code: string,
  initFunc: (interpreter: InterpreterInstance, scope: any) => void
): InterpreterInstance {
  return new Interpreter(code, initFunc) as InterpreterInstance;
}