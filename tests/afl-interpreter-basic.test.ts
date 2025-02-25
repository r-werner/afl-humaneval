import { namedTypes as astTypes } from "ast-types";
import { createInterpreter, Status } from '../src/afl-interpreter';
  
describe('afl-interpreter', () => {
  describe('run', () => {
    describe('basic operations', () => {
      it('executes simple arithmetic operations', () => {
        let interpreter = createInterpreter('10 - 5 === 5');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        
        interpreter = createInterpreter('3 * 4 === 12');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('15 / 3 === 5');
        interpreter.run();
        const result3 = interpreter.getValue();
        expect(result3).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
      });

      it('handles boolean operations', () => {
        let interpreter = createInterpreter('true && true');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('true && false');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(false);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('true || false');
        interpreter.run();
        const result3 = interpreter.getValue();
        expect(result3).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('!false');
        interpreter.run();
        const result4 = interpreter.getValue();
      });

      it('handles string operations', () => {
        let interpreter = createInterpreter('"hello" + " world" === "hello world"');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('"abc".length === 3');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
      });
    });

    describe('variables and assignments', () => {
      it('handles variable declarations and assignments', () => {
        let interpreter = createInterpreter('var x = 5; x === 5');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('var x = 10; x += 5; x === 15');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('var str = "test"; str === "test"');
        interpreter.run();
        const result3 = interpreter.getValue();
        expect(result3).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
      });

      it('handles multiple variable operations', () => {
        let interpreter = createInterpreter('var x = 5; var y = 10; x + y === 15');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('var a = 1; var b = 2; var c = 3; a + b + c === 6');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
      });
    });

    describe('control flow', () => {
      it('executes if statements', () => {
        let interpreter = createInterpreter('var x = 5; if (x > 3) { x = 10; } x === 10');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('var x = 2; if (x > 3) { x = 10; } else { x = 0; } x === 0');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
      });

      it('executes loops', () => {
        let interpreter = createInterpreter('var sum = 0; for(var i = 1; i <= 5; i++) { sum += i; } sum === 15');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('var x = 0; while(x < 5) { x++; } x === 5');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
      });
    });

    describe('functions', () => {
      it('handles function declarations and calls', () => {
        let interpreter = createInterpreter('function add(a, b) { return a + b; } add(2, 3) === 5');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
        interpreter = createInterpreter('function fact(n) { if (n <= 1) return 1; return n * fact(n-1); } fact(5) === 120');
        interpreter.run();
        const result2 = interpreter.getValue();
        expect(result2).toBe(true);
      });
      it('handles function expressions', () => {
        let interpreter = createInterpreter('var multiply = function(a, b) { return a * b; }; multiply(4, 3) === 12');
        interpreter.run();
        const result = interpreter.getValue();
        expect(result).toBe(true);
        expect(interpreter.getStatus()).toBe(Status.DONE);
      });
    });
  });

  describe('createInterpreter', () => {
    it('creates an interpreter instance, running some code to the end', () => {
      const interpreter = createInterpreter('var x = 5; x + 3;');
      expect(interpreter.run()).toBe(false);
      expect(interpreter.getValue()).toBe(8);
      expect(interpreter.getStatus()).toBe(Status.DONE);
    });

    it('allows step-by-step execution', () => {
      const interpreter = createInterpreter('var x = 1;\nx++;\nx++;');
      
      let start: string;
      let end: string;
      let nodeType: string;
      let steps = 0;
      while (interpreter.step()) {
        steps++;
        let node: astTypes.Node;
        node = interpreter.getCurrentStatement();
        start = node.loc?.start?.toString() ?? 'not defined';
        end = node.loc?.end?.toString() ?? 'not defined';   
        nodeType = node.type;
        console.log(`step: ${steps} - node:${nodeType} status: ${interpreter.getStatus()} - value: ${interpreter.getValue()} - start: ${start} - end: ${end}`);
        if (steps > 100) throw new Error('Too many steps, possible infinite loop');
        if (steps == 16) {
          console.log('done');
        }
      }
      
      expect(interpreter.getStatus()).toBe(Status.DONE);
      // we expect the value to be 2 because the last statement is x++
      // post-increment operations (x++), the interpreter follows JavaScript semantics where:
      // The value of the expression is the original value (before incrementing)
      // The variable is then incremented afterwards
      expect(interpreter.getValue()).toBe(2);
    });

    it('demonstrates step-by-step state changes', () => {
      const interpreter = createInterpreter('var x = 1; x = x + 1;');
      
      expect(interpreter.getStatus()).toBe(Status.STEP);
      
      while (interpreter.step()) {
        const status = interpreter.getStatus();
        // we expect the status to be either STEP or DONE
        // which is a bit strange, but it's how the interpreter is designed
        expect(status === Status.STEP || status === Status.DONE).toBe(true);
      }
      
      expect(interpreter.getStatus()).toBe(Status.DONE);
      expect(interpreter.getValue()).toBe(2);
    });
  });

  describe('interpreter features', () => {
    it('reports correct status', () => {
      const interpreter = createInterpreter('var x = 1;');
      expect(interpreter.getStatus()).toBe(Status.STEP);
      interpreter.run();
      expect(interpreter.getStatus()).toBe(Status.DONE);
    });
    
    /*
    it('allows accessing global scope', () => {
      const interpreter = createInterpreter('var x = 42;');
      interpreter.run();
      
      const globalScope = interpreter.getGlobalScope();
      expect(interpreter.getProperty(globalScope.object, 'x')).toBe(42);
    });

    it('allows initializing the interpreter with custom functions', () => {
      const initFunc = (interpreter: InterpreterInstance, scope: any) => {
        const wrapper = (text: string) => alert(text);
        interpreter.setProperty(scope, 'alert',
          interpreter.createNativeFunction(wrapper, false));
      };

      const interpreter = createInterpreterWithInit(
        'var msg = "Hello"; alert(msg); true;',
        initFunc
      );

      const mockAlert = jest.fn();
      (global as any).alert = mockAlert;

      interpreter.run();
      
      expect(mockAlert).toHaveBeenCalledWith('Hello');
      expect(interpreter.getValue()).toBe(true);
    });

    it('supports appending code', () => {
      const interpreter = createInterpreter('var x = 1;');
      interpreter.run();
      interpreter.appendCode('x += 2;');
      interpreter.run();
      expect(interpreter.getValue()).toBe(3);
    });

    it('supports native to pseudo object conversion', () => {
      const interpreter = createInterpreter('');
      const nativeObj = { a: 1, b: 2 };
      const pseudoObj = interpreter.nativeToPseudo(nativeObj);
      
      expect(interpreter.getProperty(pseudoObj, 'a')).toBe(1);
      expect(interpreter.getProperty(pseudoObj, 'b')).toBe(2);
    });
    */
  });
});
