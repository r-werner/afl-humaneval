import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

// Response validation schema
const InvoiceSchema = z.object({
  isInvoice: z.boolean(),
  invoiceDate: z.string().nullable(),
  sellerName: z.string().nullable(),
  firstItem: z.string().nullable(),
});

const OtherDocumentSchema = z.object({
  documentDate: z.string().nullable(),
  documentCategory: z.string().nullable(),
  originatorName: z.string().nullable(),
  documentPurpose: z.string().nullable(),
});

type InvoiceData = z.infer<typeof InvoiceSchema> & { fileName: string };
type OtherDocumentData = z.infer<typeof OtherDocumentSchema> & {
  fileName: string;
};

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const modelGemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

async function processDocuments(folderPath: string) {
  try {
    // Get and filter files
    const files = fs.readdirSync(folderPath);
    const validExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".gif"]);

    const results: InvoiceData[] = [];
    for (const file of files) {
      if (validExtensions.has(path.extname(file).toLowerCase())) {
        console.log("Processing file:", file);

        // New code: Prepare file data here
        const filePath = path.join(folderPath, file);
        const fileData = fs.readFileSync(filePath);
        const base64Data = fileData.toString("base64");
        const ext = path.extname(filePath).toLowerCase();

        const mimeTypes: { [key: string]: string } = {
          ".pdf": "application/pdf",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
        };

        const filePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeTypes[ext],
          },
        };

        const result = await uploadFileToAIandCheckContent(filePart);
        // If it's not an invoice, check for other document types
        if (result.isInvoice) {
          result.fileName = path.basename(filePath);
          moveAndRenameInputFileToResultFolder(result, folderPath);
          results.push(result);
        } else {
          await checkOtherDocumentTypes(filePart);
        }
      } else {
        console.log("no Document type, Skipping file:", file);
      }
    }

    // Display results
    console.log("Invoice Processing Results:");
    console.table(
      results
        .filter((r) => r.isInvoice)
        .map((r) => ({
          File: r.fileName,
          Date: r.invoiceDate,
          Seller: r.sellerName,
          Item: r.firstItem,
        }))
    );

    // Save full results
    fs.writeFileSync(
      path.join(folderPath, "results.json"),
      JSON.stringify(results, null, 2)
    );
  } catch (error) {
    console.error("Error processing invoices:", error);
  }
}

async function uploadFileToAIandCheckContent(filePart: {
  inlineData: { data: string; mimeType: string };
}): Promise<InvoiceData> {
  try {
    // Prepare the prompt
    const prompt = `
      Analyze this document and:
      1. Verify if it's an invoice
      2. If it is an invoice, extract:
         - Invoice date (YYYY-MM-DD format)
         - Seller's company name
         - First item name from the list of goods/services
      3. Return JSON format: {
        "isInvoice": boolean,
        "invoiceDate": string|null,
        "sellerName": string|null,
        "firstItem": string|null
      }
    `;

    // Get response from Gemini
    console.log("Processing file, please wait...");
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\rElapsed time: ${elapsed}s`);
    }, 1000);

    const promise = modelGemini.generateContent([prompt, filePart]);
    const result = await promise;

    clearInterval(interval);
    process.stdout.write("\n");

    const responseText = result.response.text();
    console.log(responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format from Gemini");

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = InvoiceSchema.parse(parsed);

    return {
      fileName: "",
      ...validated,
    };
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      fileName: "",
      isInvoice: false,
      invoiceDate: null,
      sellerName: null,
      firstItem: null,
    };
  }
}

async function checkOtherDocumentTypes(filePart: {
  inlineData: { data: string; mimeType: string };
}): Promise<OtherDocumentData> {
  try {
    const prompt = `
      Analyze this document and:
      1. Determine the category of the document from the following list:
      - insurance document
      - health care document
      - tax document
      - car document
      - other
    2. extract:
       - document date (YYYY-MM-DD format)
       - document category
       - originator name
       - document purpose
    3. Return JSON format: {
      "documentDate": string|null,
      "documentCategory": string|null,
      "originatorName": string|null,
      "documentPurpose": string|null
    }
  `;

    // Get response from Gemini
    console.log("Checking document type, please wait...");
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\rElapsed time: ${elapsed}s`);
    }, 1000);

    const promise = modelGemini.generateContent([prompt, filePart]);
    const result = await promise;

    clearInterval(interval);
    process.stdout.write("\n");

    const responseText = result.response.text();
    console.log(responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format from Gemini");

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = OtherDocumentSchema.parse(parsed);

    return {
      fileName: "",
      ...validated,
    };
  } catch (error) {
    console.error("Error processing document:", error);
    return {
      fileName: "",
      documentDate: null,
      documentCategory: null,
      originatorName: null,
      documentPurpose: null,
    };
  }
}

function moveAndRenameInputFileToResultFolder(
  result: InvoiceData,
  folderPath: string
) {
  const invoiceFolder = path.join(folderPath, "invoices");
  const nonInvoiceFolder = path.join(folderPath, "non-invoices");

  // Create folders if they don't exist
  if (!fs.existsSync(invoiceFolder)) fs.mkdirSync(invoiceFolder);
  if (!fs.existsSync(nonInvoiceFolder)) fs.mkdirSync(nonInvoiceFolder);

  const originalFilePath = path.join(folderPath, result.fileName);
  if (result.isInvoice) {
    // for the new file name, we will use the format "Date-Seller-Item.ext"
    // make sure to remove any spaces and special characters from the seller name and the first item name
    const sanitizedSellerName =
      result.sellerName?.replace(/[^a-zA-Z0-9]/g, "") || "UnknownSeller";
    const sanitizedFirstItem =
      result.firstItem?.replace(/[^a-zA-Z0-9]/g, "") || "UnknownItem";
    const newFileName = `${result.invoiceDate}-${sanitizedSellerName}-${sanitizedFirstItem}${path.extname(result.fileName)}`;
    const newFilePath = path.join(invoiceFolder, newFileName);
    fs.renameSync(originalFilePath, newFilePath);
  } else {
    const newFilePath = path.join(nonInvoiceFolder, result.fileName);
    fs.renameSync(originalFilePath, newFilePath);
  }
}

// Run from command line
const folderPath = process.argv[2];
if (!folderPath) {
  console.error("Please provide a folder path as an argument");
  process.exit(1);
}

processDocuments(folderPath);
