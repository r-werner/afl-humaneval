import { Interpreter } from './lib/js-interpreter/interpreter';

const acorn = require('./lib/js-interpreter/acorn');

(global as any).acorn = acorn;

const myCode = `
var result = [];
function fibonacci(n, output) {
  var a = 1, b = 1, sum;
  for (var i = 0; i < n; i++) {
    output.push(a);
    sum = a + b;
    a = b;
    b = sum;
  }
}
fibonacci(16, result);
alert(result.join(', '));
console.log(result.join(', '));
`;

// Set up 'alert' as an interface to Node's console.log.
const initFunc = function(interpreter: any, globalObject: any) {
  const wrapper = function(text: string) {
    console.log(text);
  };
  interpreter.setProperty(globalObject, 'alert',
      interpreter.createNativeFunction(wrapper));
};

const myInterpreter = new Interpreter(myCode, initFunc);

const runToCompletion = function() {
  if (myInterpreter.run()) {
    // Ran until an async call.  Give this call a chance to run.
    // Then start running again later.
    setTimeout(runToCompletion, 10);
  }
};
runToCompletion();