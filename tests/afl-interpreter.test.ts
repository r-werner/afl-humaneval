import { run, createInterpreter, createInterpreterWithInit, Status, InterpreterInstance } from '../src/afl-interpreter';

describe('afl-interpreter', () => {
  describe('run', () => {
    describe('basic operations', () => {
      it('executes simple arithmetic operations', () => {
        expect(run('2 + 2 === 4').value).toBe(true);
        expect(run('10 - 5 === 5').value).toBe(true);
        expect(run('3 * 4 === 12').value).toBe(true);
        expect(run('15 / 3 === 5').value).toBe(true);
      });

      it('handles boolean operations', () => {
        expect(run('true && true').value).toBe(true);
        expect(run('true && false').value).toBe(false);
        expect(run('true || false').value).toBe(true);
        expect(run('!false').value).toBe(true);
      });

      it('handles string operations', () => {
        expect(run('"hello" + " world" === "hello world"').value).toBe(true);
        expect(run('"abc".length === 3').value).toBe(true);
      });
    });

    describe('variables and assignments', () => {
      it('handles variable declarations and assignments', () => {
        expect(run('var x = 5; x === 5').value).toBe(true);
        expect(run('var x = 10; x += 5; x === 15').value).toBe(true);
        expect(run('var str = "test"; str === "test"').value).toBe(true);
      });

      it('handles multiple variable operations', () => {
        expect(run('var x = 5; var y = 10; x + y === 15').value).toBe(true);
        expect(run('var a = 1; var b = 2; var c = 3; a + b + c === 6').value).toBe(true);
      });
    });

    describe('control flow', () => {
      it('executes if statements', () => {
        expect(run('var x = 5; if (x > 3) { x = 10; } x === 10').value).toBe(true);
        expect(run('var x = 2; if (x > 3) { x = 10; } else { x = 0; } x === 0').value).toBe(true);
      });

      it('executes loops', () => {
        expect(run('var sum = 0; for(var i = 1; i <= 5; i++) { sum += i; } sum === 15').value).toBe(true);
        expect(run('var x = 0; while(x < 5) { x++; } x === 5').value).toBe(true);
      });
    });

    describe('functions', () => {
      it('handles function declarations and calls', () => {
        expect(run('function add(a, b) { return a + b; } add(2, 3) === 5').value).toBe(true);
        expect(run('function fact(n) { if (n <= 1) return 1; return n * fact(n-1); } fact(5) === 120').value).toBe(true);
      });

      it('handles function expressions', () => {
        expect(run('var multiply = function(a, b) { return a * b; }; multiply(4, 3) === 12').value).toBe(true);
      });
    });
  });

  describe('createInterpreter', () => {
    it('creates an interpreter instance without running it', () => {
      const interpreter = createInterpreter('var x = 5; x + 3;');
      expect(interpreter.run()).toBe(false);
      expect(interpreter.value).toBe(8);
      expect(interpreter.getStatus()).toBe(Status.DONE);
    });

    it('allows step-by-step execution', () => {
      const interpreter = createInterpreter('var x = 1;\nx++;\nx++;');
      
      var start = 0;
      var end = 0;
      var nodeType = "";
      let steps = 0;
      while (interpreter.step()) {
        steps++;
        var stack = interpreter.getStateStack();
        if (stack.length) {
          var node = stack[stack.length - 1].node;
          start = node.start;
          end = node.end;   
          nodeType = node.type;
        }
        console.log(`step: ${steps} - node:${nodeType} status: ${interpreter.getStatus()} - value: ${interpreter.value} - start: ${start} - end: ${end}`);
        if (steps > 100) throw new Error('Too many steps, possible infinite loop');
      }
      
      expect(interpreter.getStatus()).toBe(Status.DONE);
      expect(interpreter.value).toBe(3);
    });

    it('demonstrates step-by-step state changes', () => {
      const interpreter = createInterpreter('var x = 1; x = x + 1;');
      
      expect(interpreter.getStatus()).toBe(Status.STEP);
      
      while (interpreter.step()) {
        expect(interpreter.getStatus()).toBe(Status.STEP);
      }
      
      expect(interpreter.getStatus()).toBe(Status.DONE);
      expect(interpreter.value).toBe(2);
    });

    it('allows accessing global scope', () => {
      const interpreter = createInterpreter('var x = 42;');
      interpreter.run();
      
      const globalScope = interpreter.getGlobalScope();
      expect(interpreter.getProperty(globalScope.object, 'x')).toBe(42);
    });
  });

  describe('createInterpreterWithInit', () => {
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
      expect(interpreter.value).toBe(true);
    });
  });

  describe('interpreter features', () => {
    it('supports appending code', () => {
      const interpreter = createInterpreter('var x = 1;');
      interpreter.run();
      interpreter.appendCode('x += 2;');
      interpreter.run();
      expect(interpreter.value).toBe(3);
    });

    it('supports native to pseudo object conversion', () => {
      const interpreter = createInterpreter('');
      const nativeObj = { a: 1, b: 2 };
      const pseudoObj = interpreter.nativeToPseudo(nativeObj);
      
      expect(interpreter.getProperty(pseudoObj, 'a')).toBe(1);
      expect(interpreter.getProperty(pseudoObj, 'b')).toBe(2);
    });

    it('reports correct status', () => {
      const interpreter = createInterpreter('var x = 1;');
      expect(interpreter.getStatus()).toBe(Status.STEP);
      interpreter.run();
      expect(interpreter.getStatus()).toBe(Status.DONE);
    });
  });
}); 