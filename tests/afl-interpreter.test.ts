import {
  run,
  createInterpreter,
  createInterpreterWithInit,
  Status,
  InterpreterInstance,
  createEnhancedInterpreter,
  Statement,
} from "../src/afl-interpreter";
import { namedTypes as astTypes, builders as astBuilders } from "ast-types";

describe("afl-interpreter", () => {
  describe("statement-level stepping", () => {
    it("steps through statements one at a time", () => {
      const code = `
        var x = 1;
        x = x + 1;
        if (x === 2) {
          x = x * 2;
        }
        x;
      `;

      const interpreter = createEnhancedInterpreter(code);
      const ast = interpreter.ast;
      console.log(ast);

      const statements: Array<{ type: string; value: any }> = [];

      let statement: Statement | null;
      while ((statement = interpreter.stepStatement()) !== null) {
        statements.push({
          type: statement.type,
          value: interpreter.value,
        });
      }

      expect(statements).toEqual([
        { type: "VariableDeclaration", value: undefined },
        { type: "ExpressionStatement", value: 2 },
        { type: "IfStatement", value: true },
        { type: "BlockStatement", value: 4 },
        { type: "ExpressionStatement", value: 4 },
      ]);

      expect(interpreter.value).toBe(4);
    });

    it("handles function declarations and calls", () => {
      const code = `
        function double(x) {
          return x * 2;
        }
        var result = double(3);
        result;
      `;

      const interpreter = createEnhancedInterpreter(code);
      const statements: Array<{ type: string; value: any }> = [];

      let statement: Statement | null;
      while ((statement = interpreter.stepStatement()) !== null) {
        statements.push({
          type: statement.type,
          value: interpreter.value,
        });
      }

      expect(statements).toEqual([
        { type: "FunctionDeclaration", value: undefined },
        { type: "VariableDeclaration", value: 6 },
        { type: "ExpressionStatement", value: 6 },
      ]);

      expect(interpreter.value).toBe(6);
    });

    it("provides statement position information", () => {
      const code = "var x = 1;\nx += 1;";
      const interpreter = createEnhancedInterpreter(code);

      const firstStatement = interpreter.stepStatement();
      expect(firstStatement).toMatchObject({
        type: "VariableDeclaration",
        start: 0,
        end: 9, // 'var x = 1;'
      });

      const secondStatement = interpreter.stepStatement();
      expect(secondStatement).toMatchObject({
        type: "ExpressionStatement",
        start: 10, // '\nx += 1;'
        end: 17,
      });
    });
  });
});
