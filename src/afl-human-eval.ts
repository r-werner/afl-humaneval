/*
    This script is used to evaluate the AFL-TS transpiler on the HumanEval dataset.
    It uses the Gemini API to generate test cases for the transpiler.

    It reads the HumanEval dataset from the file `data/typescript/English.jsonl`.

    Every row in the dataset is a JSON object with the following properties:
    - `task_id`: The id of the task.
    - `prompt`: The prompt for the test case.
    - `test`: The name of the test case.
    - `language`: The language of the test case.
    - `description`: The description of the test case.
    - `entry_point`: The entry point of the test case.
    - `test_code`: The code for the test case.
    - `canonical_solution`: The canonical solution for the test case.
    - `natural_language`: The natural language description of the test case and the prompt.

    For every row in the dataset, it uses the Gemini API to generate the code for the prompt
    and adds the test code. The combined code is written to a file in the `temp` directory.
    The file name is the task_id with any special characters replaced with an underscore.
    Once the file is written, the program code is executed.

    The program code is executed using the `executeTypescriptString` function.
    The result is evaluated using the `executeTypescriptString` function.
    A statistic is kept to count how many returned program codes are correct (according to the test code)
    It then prints the results to the console.
*/
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import * as ts from "typescript";

dotenv.config();

// Initialize Gemini client
console.log(
  `Initializing Gemini client... using API key: ${process.env.GOOGLE_API_KEY}`
);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const modelGemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// load the HumanEval dataset
const dataset = loadDataset();
executeTasks(dataset);

type TestCaseRow = {
  task_id: string;
  prompt: string;
  test: string;
  language: string;
  description: string;
  entry_point: string;
  natural_language: string;
}

// function to iterate over the dataset and generate test cases
async function executeTasks(dataset: any[]) {
  for (const row of dataset) {
    printTaskDetails(row);
    // call the Gemini API to generate a test case
    const promise = generateCodeFromPrompt(row.prompt);
    const task_response = await promise;

    // extract the program code from the markdown
    const task_program_code = extractProgramCodeFromMarkdown(task_response);

    if (task_program_code !== null) {
      // write the task program code to a file
      writeProgramCodeToFile(row.task_id, task_program_code);
      // write the test code to a file
      writeTestCodeToFile(row.task_id, row.test);
      // execute the program code
      //const result = executeProgram(task_program_code);
      //console.log(result);
    } else {
      console.error("No code extracted from the markdown.");
    }
  }
}

function writeProgramCodeToFile(task_id: string, code: string) {
  // make sure the temp directory exists
  fs.mkdirSync("temp", { recursive: true });
  // write the code to a file
  // make sure task_id does not contain any special characters
  const task_id_sanitized = task_id.replace(/[^a-zA-Z0-9]/g, "_");
  fs.writeFileSync(`temp/task_${task_id_sanitized}_code.ts`, code);
}

function writeTestCodeToFile(task_id: string, test_code: string) {
  // make sure the temp directory exists
  fs.mkdirSync("temp", { recursive: true });
  // write the test code to a file
  // make sure task_id does not contain any special characters
  const task_id_sanitized = task_id.replace(/[^a-zA-Z0-9]/g, "_");
  fs.writeFileSync(`temp/task_${task_id_sanitized}_test.ts`, test_code);
}

function executeProgram(code: string) {
  // execute the program code
  const result = executeTypescriptString(code);
  return result;
}

function loadDataset(): TestCaseRow[] {
  // load the HumanEval dataset
  const dataset = fs.readFileSync("data/typescript/English.jsonl", "utf8");

  // filter out empty lines and parse the dataset
  const datasetParsed = dataset
    .split("\n")
    .filter((row) => row.trim() !== "")
    .map((row) => JSON.parse(row));

  return datasetParsed;
}

/**
 * Generates code from a prompt using the Gemini API.
 * 
 * @param row The task row from the dataset.
 * @returns The generated code as a string.
 */
async function generateCodeFromPrompt(prompt: string): Promise<string> {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\rElapsed time: ${elapsed}s`);
  }, 1000);

  const promise = modelGemini.generateContent(prompt);
  const response = await promise;

  clearInterval(interval);
  process.stdout.write("\n");

  const responseText = response.response.text();
  console.log(responseText);

  return responseText;
}

/**
 * Extracts the program code from a markdown string.
 * Assumes the code is within a fenced code block, typically using triple backticks (```).
 * It looks for code blocks that are marked as 'typescript' or no language specified (plain ```).
 *
 * @param markdownString The markdown string containing the code example.
 * @returns The extracted program code as a string, or null if not found.
 */
function extractProgramCodeFromMarkdown(markdownString: string): string | null {
  const startDelimiter = "```typescript"; // Look for TypeScript code block specifically
  const genericStartDelimiter = "```"; // Or generic code block (can assume TypeScript)
  const endDelimiter = "```";

  let codeStartIndex = markdownString.indexOf(startDelimiter);
  let delimiterLength = startDelimiter.length;

  if (codeStartIndex === -1) {
    codeStartIndex = markdownString.indexOf(genericStartDelimiter);
    delimiterLength = genericStartDelimiter.length;
    if (codeStartIndex === -1) {
      return null; // No code block delimiters found
    }
  }

  codeStartIndex += delimiterLength; // Start after the opening delimiter

  let codeEndIndex = markdownString.indexOf(endDelimiter, codeStartIndex); // Search for closing delimiter after the start

  if (codeEndIndex === -1) {
    return null; // Closing delimiter not found
  }

  let extractedCode = markdownString
    .substring(codeStartIndex, codeEndIndex)
    .trim();

  // Remove any leading/trailing newlines within the code block itself for cleaner output
  extractedCode = extractedCode.replace(/^\n+|\n+$/g, "");
  console.log(extractedCode);
  return extractedCode;
}

/**
 * Prints the details of a task to the console.
 * 
 * @param row The task row from the dataset.
 */
function printTaskDetails(row: TestCaseRow): void {
  console.log("--------------------------------");
  console.log(`Task ID: ${row.task_id}`);
  console.log(`Prompt:\n${row.prompt}`);
  console.log(`Test: ${row.test}`);
  console.log(`Language: ${row.language}`);
  console.log(`Description: ${row.description}`);
  console.log(`Entry Point: ${row.entry_point}`);
  console.log(`Natural Language: ${row.natural_language}`);
  console.log("--------------------------------");
}

/**
 * WARNING: Executing code from a string is inherently risky and should be done with extreme caution.
 * This is for illustrative purposes and should NOT be used in production environments
 * unless you have very strict control over the input string and understand the security implications.
 *
 * This function executes TypeScript code from a string within a TypeScript function.
 * It first transpiles the TypeScript code to JavaScript using the TypeScript compiler API,
 * and then executes the resulting JavaScript using the Function constructor.
 *
 * @param typescriptCode The TypeScript code as a string to execute.
 * @returns The result of executing the code, or undefined if there's an error.
 *          Returns `null` if compilation fails.
 */
function executeTypescriptString(typescriptCode: string): any | null {
  try {
    // 1. Compile TypeScript to JavaScript using the TypeScript compiler API
    const transpiledOutput = ts.transpileModule(typescriptCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, // Or ESNext, depending on your environment
        target: ts.ScriptTarget.ESNext, // Or your target ES version
        // You can add more compiler options as needed (e.g., jsx, strict, etc.)
      },
    });

    if (
      transpiledOutput.diagnostics &&
      transpiledOutput.diagnostics.length > 0
    ) {
      console.error("TypeScript Compilation Errors:");
      transpiledOutput.diagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
          const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
          );
          console.log(
            `  ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
          );
        } else {
          console.log(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
          );
        }
      });
      return null; // Compilation failed due to errors
    }

    const javascriptCode = transpiledOutput.outputText;

    // 2. Execute the JavaScript code using the Function constructor
    // WARNING: Using Function is similar to eval() and has security risks.
    //          Only use this if you absolutely trust the source of the typescriptCode.
    const executableFunction = new Function(javascriptCode); // Creates a function from the JS code string
    const result = executableFunction(); // Execute the dynamically created function
    return result;
  } catch (error) {
    console.error("Error executing TypeScript string:", error);
    return undefined; // Execution error
  }
}
