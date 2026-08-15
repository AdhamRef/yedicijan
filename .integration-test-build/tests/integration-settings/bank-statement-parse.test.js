"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = require("node:test");
const XLSX = __importStar(require("xlsx"));
const statement_parser_1 = require("../../lib/bank-transfers/statement-parser");
/**
 * End-to-end coverage for the التحويلات البنكية importer: builds real .xlsx
 * buffers and asserts on the amounts that come out.
 *
 * The regression these guard is the one reported from the dashboard — donation
 * figures imported wrong. Two defects combined to cause it:
 *   1. The header row was located by "first row whose text mentions tarih/
 *      amount/…", so a preamble line like "Rapor Tarihi: 01.02.2026" was taken
 *      as the header and no column resolved at all.
 *   2. With no amount column, the parser took the first number anywhere in the
 *      row — which is the reference number, not the money.
 * Together they imported "20250114887" as a donation.
 */
function sheet(rows) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Hesap");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
const BASE = { fileName: "ekstre.xlsx", currency: "TRY", donorLocale: "tr", bankId: "ZIRAAT" };
/** `amount` is always absolute; the sign lives in `direction`. */
function shape(rows) {
    return rows.map((r) => `${r.amount} ${r.direction}`);
}
(0, node_test_1.describe)("parseBankStatementFile — amount extraction", () => {
    (0, node_test_1.test)("preamble rows do not hijack the header, and «Tutar» wins over «Bakiye Tutarı»", async () => {
        const parsed = await (0, statement_parser_1.parseBankStatementFile)({
            ...BASE,
            buffer: sheet([
                ["T.C. ZİRAAT BANKASI A.Ş."],
                ["Rapor Tarihi: 01.02.2026"],
                ["IBAN: TR330006100519786457841326"],
                [],
                ["Tarih", "Açıklama", "Fiş No", "Bakiye Tutarı", "Tutar"],
                ["01.01.2026", "Gelen FAST SN:20250114887 AHMET YILMAZ Açıklama Gazze yardım", "20250114887", "11.250,00", "250,00"],
                ["02.01.2026", "Gelen FAST SN:20250114912 AYSE DEMIR Açıklama zekat", "20250114912", "12.350,50", "1.100,50"],
                ["03.01.2026", "Giden EFT OMER KAYA", "20250115003", "12.275,25", "75,25-"],
            ]),
        });
        node_assert_1.strict.equal(parsed.amountColumn.source, "header:tutar");
        node_assert_1.strict.equal(parsed.amountColumn.header, "Tutar");
        node_assert_1.strict.deepEqual(shape(parsed.rows), ["250 CREDIT", "1100.5 CREDIT", "75.25 DEBIT"]);
        // The exact old failure: the reference number imported as the donation.
        for (const row of parsed.rows) {
            node_assert_1.strict.ok((row.amount ?? 0) < 1_000_000, `reference number leaked as amount: ${row.amount}`);
        }
    });
    (0, node_test_1.test)("plain Tarih / Açıklama / Tutar sheet", async () => {
        const parsed = await (0, statement_parser_1.parseBankStatementFile)({
            ...BASE,
            buffer: sheet([
                ["Tarih", "Açıklama", "Tutar"],
                ["05.01.2026", "Gönderen: MEHMET ARSLAN sadaka", "500,00"],
                ["06.01.2026", "Gönderen: FATMA CELIK kurban", "2.750,00"],
            ]),
        });
        node_assert_1.strict.equal(parsed.amountColumn.source, "header:tutar");
        node_assert_1.strict.deepEqual(shape(parsed.rows), ["500 CREDIT", "2750 CREDIT"]);
    });
    (0, node_test_1.test)("Alacak / Borç pair when the sheet has no Tutar column", async () => {
        const parsed = await (0, statement_parser_1.parseBankStatementFile)({
            ...BASE,
            buffer: sheet([
                ["İşlem Tarihi", "Açıklama", "Alacak", "Borç", "Bakiye"],
                ["07.01.2026", "Gelen havale ALI VELI", "300,00", "", "5.300,00"],
                ["08.01.2026", "Komisyon", "", "12,50", "5.287,50"],
            ]),
        });
        node_assert_1.strict.equal(parsed.amountColumn.source, "header:credit");
        node_assert_1.strict.equal(parsed.amountColumn.header, "Alacak");
        node_assert_1.strict.deepEqual(shape(parsed.rows), ["300 CREDIT", "12.5 DEBIT"]);
    });
    (0, node_test_1.test)("headerless sheet — detection finds the money column, not the reference", async () => {
        const parsed = await (0, statement_parser_1.parseBankStatementFile)({
            ...BASE,
            buffer: sheet([
                ["09.01.2026", "20250116001", "Gelen FAST HASAN SAHIN yetim", "420,00"],
                ["10.01.2026", "20250116044", "Gelen FAST ZEYNEP AK filistin", "1.980,75"],
                ["11.01.2026", "20250116099", "Gelen FAST SELIM OZ", "60,00"],
            ]),
        });
        node_assert_1.strict.equal(parsed.amountColumn.source, "detected");
        node_assert_1.strict.deepEqual(shape(parsed.rows), ["420 CREDIT", "1980.75 CREDIT", "60 CREDIT"]);
        // Detection is a guess, so the admin is told to check before importing.
        node_assert_1.strict.ok(parsed.warning && parsed.warning.length > 0);
    });
    (0, node_test_1.test)("a Tutar sheet imports without a review warning", async () => {
        const parsed = await (0, statement_parser_1.parseBankStatementFile)({
            ...BASE,
            buffer: sheet([
                ["Tarih", "Açıklama", "Tutar"],
                ["05.01.2026", "Gelen FAST AHMET", "500,00"],
            ]),
        });
        node_assert_1.strict.equal(parsed.warning, null);
    });
});
