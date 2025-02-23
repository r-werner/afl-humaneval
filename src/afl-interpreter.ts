import { namedTypes as astTypes, builders as astBuilders } from "ast-types";
// import { Interpreter } from './lib/js-interpreter/interpreter';
const { Interpreter } = require("./lib/js-interpreter/interpreter");
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
   * Step through the code one AST node at a time 
   * attention: this is not the same as a line of code; every piece of code can consist multiple AST nodes
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

/**
 * Represents a statement in the code with its position and type
 */
export interface Statement {
  type: string;
  start: number;
  end: number;
  value: any;
}

/**
 * Enhanced interpreter instance with statement-level stepping
 */
export interface EnhancedInterpreterInstance extends InterpreterInstance {
  /**
   * Execute one complete statement (which may consist of multiple AST nodes)
   * when starting at the beginning of the program, ignores the program node and the block node
   * @returns Information about the executed statement, or null if execution is complete
   */
  stepStatement(): Statement | null;
}

/**
 * Determines if a node type represents a complete statement
 */
function isStatementNode(node: astTypes.Node): boolean {
  return node.type === 'VariableDeclaration' ||
    node.type === 'CallExpression' ||
    node.type === 'ReturnStatement' ||
    node.type === 'LogicalExpression' ||
    node.type === 'AssignmentExpression';
}

/**
 * Create an enhanced interpreter instance with statement-level stepping
 */
export function createEnhancedInterpreter(code: string): EnhancedInterpreterInstance {
  const interpreter = new Interpreter(code) as InterpreterInstance;
  const enhanced = interpreter as EnhancedInterpreterInstance;

  /**
   * Step through the code one statement at a time
   * A statement is a complete unit of code that can be executed in one go and contains multiple AST nodes.
   * A statement is what the user expects to execute in a single step (e.g. typical line of code).
   * At the beginning of the program, the first statement is the program node and the second statement is the block node.
   * These are not considered statements by this function.
   * 
   * @returns Information about the executed statement, or null if execution is complete
   */
  enhanced.stepStatement = function(): Statement | null {
    if (this.getStatus() === Status.DONE) {
      return null;
    }

    let currentStatement: Statement | null = null;
    let statementStarted = false;

    while (this.step()) {
      const stack = this.getStateStack();
      if (stack.length === 0) continue;

      const currentNode = stack[stack.length - 1].node;
      if (!currentNode) continue;

      // If we haven't started a statement yet and this is a statement node, start tracking
      if (!statementStarted && isStatementNode(currentNode)) {
        statementStarted = true;
        currentStatement = {
          type: currentNode.type,
          start: currentNode.start,
          end: currentNode.end,
          value: this.value
        };
      }

      // If we're tracking a statement and encounter a new statement node,
      // or if we've moved past the current statement's range, return the completed statement
      if (statementStarted && 
          ((isStatementNode(currentNode) && currentNode.start > currentStatement!.start) ||
           currentNode.start >= currentStatement!.end)) {
        return currentStatement;
      }
    }

    // Return the last statement if we have one
    return currentStatement;
  };

  return enhanced;
}

/**
 * Create a new interpreter with initialization function and statement-level stepping
 */
export function createEnhancedInterpreterWithInit(
  code: string,
  initFunc: (interpreter: InterpreterInstance, scope: any) => void
): EnhancedInterpreterInstance {
  const interpreter = new Interpreter(code, initFunc) as InterpreterInstance;
  const enhanced = interpreter as EnhancedInterpreterInstance;

  enhanced.stepStatement = function(): Statement | null {
    // Same implementation as above
    if (this.getStatus() === Status.DONE) {
      return null;
    }

    let currentStatement: Statement | null = null;
    let statementStarted = false;

    while (this.step()) {
      const stack = this.getStateStack();
      if (stack.length === 0) continue;

      const currentNode = stack[stack.length - 1].node;
      if (!currentNode) continue;

      if (!statementStarted && isStatementNode(currentNode)) {
        statementStarted = true;
        currentStatement = {
          type: currentNode.type,
          start: currentNode.start,
          end: currentNode.end,
          value: this.value
        };
      }

      if (statementStarted && 
          ((isStatementNode(currentNode) && currentNode.start > currentStatement!.start) ||
           currentNode.start >= currentStatement!.end)) {
        return currentStatement;
      }
    }

    return currentStatement;
  };

  return enhanced;
}