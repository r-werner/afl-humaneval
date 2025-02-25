import { namedTypes as astTypes, builders as astBuilders } from "ast-types";
// import { Interpreter } from './lib/js-interpreter/interpreter';
const { Interpreter } = require("./lib/js-interpreter/interpreter");
const acorn = require("./lib/js-interpreter/acorn");
// console.log(acorn);
(global as any).acorn = acorn;

import requireWrapper from "./require_wrapper";

const interpreterImplementationAssertions = `
function deepEqual(actual, expected, message) {
  // 1. Basic Equality Check (===)
  if (actual === expected) {
    return true; // Handles primitives and identical object references
  }

  // 2. Type and Null/Undefined Checks
  if (typeof actual !== typeof expected || actual === null || expected === null) {
      throw new Error(message || \`Expected \${expected} but got \${actual}\`);
  }
  
   // 3.  Handle Dates
  if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();
  }

  // 4. Handle Regular Expressions
  if (Object.prototype.toString.call(actual) === '[object RegExp]' &&
      Object.prototype.toString.call(expected) === '[object RegExp]') {
      return actual.source === expected.source && actual.flags === expected.flags;
  }

  // 5. Array Check
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      throw new Error(message || \`Arrays have different lengths: \${actual.length} vs \${expected.length}\`);
    }
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i], message)) {
        return false; // Recursively check elements
      }
    }
    return true;
  }

  // 6. Object Check
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    if (actualKeys.length !== expectedKeys.length) {
       throw new Error(message || \`Objects have different number of keys\`);
    }

    for (const key of actualKeys) {
      if (!expectedKeys.includes(key)) {
        throw new Error(message || \`Key "\${key}" is missing in expected object\`);

      }
      if (!deepEqual(actual[key], expected[key], message)) {
        return false; // Recursively check values
      }
    }
    return true;
  }
  // 7. if it is not any of the above, they are not equal.
   throw new Error(message || \`Expected \${expected} but got \${actual}\`);
}
`;

const interpreterImplementationAssertionsWrapper = `
function require(moduleName) {
    function deepEqual(actual, expected, message) {
        // 1. Basic Equality Check (===)
        if (actual === expected) {
            return true; // Handles primitives and identical object references
        }
        // 2. Type and Null/Undefined Checks
        if (typeof actual !== typeof expected || actual === null || expected === null) {
            throw new Error(message || \`Expected \${expected} but got \${actual}\`);
        }
        // 3.  Handle Dates
        if (actual instanceof Date && expected instanceof Date) {
            return actual.getTime() === expected.getTime();
        }
        // 4. Handle Regular Expressions
        if (Object.prototype.toString.call(actual) === '[object RegExp]' &&
            Object.prototype.toString.call(expected) === '[object RegExp]') {
            return actual.source === expected.source &&
                actual.flags === expected.flags;
        }
        // 5. Array Check
        if (Array.isArray(actual) && Array.isArray(expected)) {
            if (actual.length !== expected.length) {
                throw new Error(message || \`Arrays have different lengths: \${actual.length} vs \${expected.length}\`);
            }
            for (let i = 0; i < actual.length; i++) {
                if (!deepEqual(actual[i], expected[i], message)) {
                    return false; // Recursively check elements
                }
            }
            return true;
        }
        // 6. Object Check
        if (typeof actual === 'object' && typeof expected === 'object') {
            const actualKeys = Object.keys(actual);
            const expectedKeys = Object.keys(expected);
            if (actualKeys.length !== expectedKeys.length) {
                throw new Error(message || \`Objects have different number of keys\`);
            }
            for (const key of actualKeys) {
                if (!expectedKeys.includes(key)) {
                    throw new Error(message || \`Key "\${key}" is missing in expected object\`);
                }
                if (!deepEqual(actual[key], expected[key], message)) {
                    return false; // Recursively check values
                }
            }
            return true;
        }
        // 7. if it is not any of the above, they are not equal.
        throw new Error(message || \`Expected \${expected} but got \${actual}\`);
    }
    // In a real 'require' function, you would typically load a module
    // based on the moduleName.
    // For this example, we are just returning an object with the deepEqual function.
    return {
        deepEqual: deepEqual
    };
}`;

/**
 * Status constants from the Interpreter
 */
export const Status = {
  DONE: 0,
  STEP: 1,
  TASK: 2,
  ASYNC: 3,
} as const;

export type Status = typeof Status[keyof typeof Status];

export interface Statement {
  type: string;
  start: number;
  end: number;
  value?: any;
}

/**
 * A wrapper around the js-interpreter that provides a type-safe interface
 */
export class InterpreterWrapper implements InterpreterInstance {
  private interpreter: any;
  private ast: astTypes.Program;

  constructor(code: string) {
    // before we call the constructor, we need a few more initializations
    // using the Optional initialization function
    // 1. add the "require" function so that we can use it in the code and the interpreter will simply ignore it
    
    var initFunc = function(interpreter: any, globalObject: any) {
      // Create 'robot' global object.
      var requireWrapper1 = interpreter.nativeToPseudo(requireWrapper);
      interpreter.setProperty(globalObject, 'require', requireWrapper1);
    }
    this.interpreter = new Interpreter(code, initFunc);
    this.ast = acorn.parse(code, { ecmaVersion: 5 });
  }

  getValue(): any {
    return this.interpreter.value;
  }

  getAst(): astTypes.Program {
    return this.interpreter.ast;
  }

  run(): boolean {
    return this.interpreter.run();
  }

  step(): boolean {
    return this.interpreter.step();
  }

  getStatus(): Status {
    return this.interpreter.getStatus();
  }

  /**
   * Get the current node being executed
   */
  getCurrentStatement(): any {
    return this.interpreter.stateStack[this.interpreter.stateStack.length - 1]?.node;
  }

  /**
   * Step through the code one statement at a time
   * @returns {Statement | null} The statement that was executed, or null if done
   */
  stepStatement(): Statement | null {
    if (this.getStatus() === Status.DONE) {
      return null;
    }

    const startNode = this.getCurrentStatement();
    if (!startNode) {
      return null;
    }

    // Step until we reach a new statement or finish execution
    while (this.step()) {
      const currentNode = this.getCurrentStatement();
      
      // If we've moved to a new statement or finished execution
      if (!currentNode || this.isNewStatement(startNode, currentNode)) {
        return {
          type: startNode.type,
          start: startNode.start,
          end: startNode.end,
          value: this.getValue()
        };
      }
    }

    // Handle the last statement
    if (startNode) {
      return {
        type: startNode.type,
        start: startNode.start,
        end: startNode.end,
        value: this.getValue()
      };
    }

    return null;
  }

  getGlobalScope(): any {
    return this.interpreter.globalScope;
  }

  private isNewStatement(prevNode: any, currentNode: any): boolean {
    // These node types are considered complete statements
    const statementTypes = new Set([
      'VariableDeclaration',
      'ExpressionStatement',
      'ReturnStatement',
      'IfStatement',
      'WhileStatement',
      'ForStatement',
      'FunctionDeclaration',
      'BlockStatement',
      'TryStatement',
      'ThrowStatement',
      'BreakStatement',
      'ContinueStatement'
    ]);

    // If we've moved to a new statement type
    return statementTypes.has(currentNode.type) && prevNode !== currentNode;
  }
}

export interface InterpreterInstance {
  getValue(): any;
  getAst(): astTypes.Program;
  getCurrentStatement(): astTypes.Node;
  run(): boolean;
  step(): boolean;
  getStatus(): Status;
  stepStatement(): Statement | null;
  getGlobalScope(): any;
}

/**
 * Create a new interpreter instance without running it
 * @param code JavaScript code to interpret
 * @returns Interpreter instance
 */
export function createInterpreter(code: string): InterpreterInstance {
  return new InterpreterWrapper(code);
}

/**
 * Create a new interpreter instance with initialization function
 * @param code JavaScript code to interpret
 * @param initFunc Function to initialize the interpreter's global scope
 * @returns Interpreter instance
 */
export function createInterpreterWithInit(
  code: string,
  initFunc: (interpreter: any, globalObject: any) => void
): InterpreterInstance {
  return new InterpreterWrapper(code);
}


