import { parseAndValidateTypeScript } from '../src/aflModule';

describe('Tree-sitter Integration', () => {
  it('should correctly parse valid TypeScript code', async () => {
    const validCode = `function add(a: number, b: number): number { return a + b; }`;
    const result = await parseAndValidateTypeScript(validCode);
    expect(result.errors).toEqual([]);
    expect(result.tree).toBeDefined();  // Check if the tree was created
  });

  it('should detect syntax errors in invalid TypeScript code', async () => {
    const invalidCode = `function add(a: number, b: number): number \n{\n\treturn a + ;\n}`; // Syntax error
    const result = await parseAndValidateTypeScript(invalidCode);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tree).toBeDefined();
    console.log(result.errors);
  });
});
