/*
  Google Apps Script for the CELULARS iPhone catalog.

  1. Create a Google Sheet with this header row:
     ativo | ordem | modelo | linha | capacidade | cor | condicao | preco | status | imagem | whatsapp
  2. In Google Apps Script, paste this file.
  3. Set SHEET_NAME to the tab name.
  4. Deploy as Web App:
     Execute as: Me
     Who has access: Anyone
  5. Paste the Web App URL into index.html:
     window.CELULARS_PRODUCTS_URL = "YOUR_WEB_APP_URL";
*/

const SHEET_NAME = "Produtos";

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    return jsonOutput({ error: `Sheet "${SHEET_NAME}" not found.` });
  }

  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((header) => normalizeHeader(header));

  const products = values
    .map((row) => rowToProduct(headers, row))
    .filter((product) => String(product.ativo || "").trim() !== "");

  return jsonOutput(products);
}

function rowToProduct(headers, row) {
  const product = {};

  headers.forEach((header, index) => {
    product[header] = formatCell(row[index]);
  });

  return product;
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return String(value == null ? "" : value).trim();
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
