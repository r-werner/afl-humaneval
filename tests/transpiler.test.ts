import { transpileToES5 } from '../src/transpiler';

describe('transpileToES5', () => {
  it('transpiles valid ES6 code to ES5', () => {
    const input = "const add = (a, b) => a + b;";
    const output = transpileToES5(input);
    // Check that the arrow function is converted to a regular function
    expect(output).toMatch(/var\s+add\s*=\s*function/);
    // Ensure arrow function syntax is absent
    expect(output).not.toMatch(/=>/);
  });

  it('throws an error for invalid JavaScript code', () => {
    const input = "const a = (b, c) => {"; // missing closing brace
    expect(() => transpileToES5(input)).toThrow();
  });

  it('returns empty string for empty input', () => {
    const input = "";
    const output = transpileToES5(input);
    expect(output).toBe("");
  });
}); 