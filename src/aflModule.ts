// AFL Module
import Parser from 'tree-sitter';
import treeSitterTypescript from 'tree-sitter-typescript';

/**
 * Parses and validates a TypeScript code string using Tree-sitter.
 * @param code - The TypeScript code string to parse.
 * @returns An object containing the parse tree and any errors encountered.
 */
export function parseAndValidateTypeScript(code: string): { tree: Parser.Tree | null; errors: string[] } {
  const parser = new Parser();
  parser.setLanguage(treeSitterTypescript.typescript); // Access the language property from the default export

  const tree = parser.parse(code);
  const errors: string[] = [];

  // Start at the root node using the external visitTree function.
  // remember the level of depth
  let depth = 0;
  visitTree(tree.rootNode, errors, depth);
  console.log('Tree has errors?:', tree.rootNode.hasError);

  return { tree, errors };
}

/**
 * Recursively visits every node in the parse tree and collects syntax errors.
 * @param node - The syntax node to visit.
 * @param errors - An array where error messages are pushed.
 */
export function visitTree(node: Parser.SyntaxNode, errors: string[], depth: number): void {
  // log the node type
  // the indent is 2 spaces for each level of depth
  const indent = ' '.repeat(depth * 2);
  // add "missing" if the node is missing 
  const missing = node.isMissing ? 'is missing!' : '';
  console.log(indent + 'Node type:', node.type, missing);

  if (node.type === 'ERROR' || node.isMissing) {
    errors.push(
      `Syntax error at line ${node.startPosition.row + 1}, column ${node.startPosition.column + 1}`
    );
  }
  // Recursively visit all children of the current node.
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      visitTree(child, errors, depth + 1);
    }
  }
}

// Example Usage (for demonstration - you'd typically call these from tests or other modules)
const validCode = `
function add(a: number, b: number): number {
  return a + b;
}
`;

const invalidCode = `
function add(a: number, b: number): number {
  return a + ; // Syntax error
}
`;

const validResult = parseAndValidateTypeScript(validCode);
console.log('Valid Code Parse Tree:', validResult.tree?.rootNode.toString());
console.log('Valid Code Errors:', validResult.errors);

const invalidResult = parseAndValidateTypeScript(invalidCode);
console.log('Invalid Code Parse Tree:', invalidResult.tree?.rootNode.toString());
console.log('Invalid Code Errors:', invalidResult.errors);