"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = require("node:test");
const amount_format_1 = require("../../lib/bank-transfers/amount-format");
const statement_columns_1 = require("../../lib/bank-transfers/statement-columns");
(0, node_test_1.describe)("parseAmount — Turkish and English money formats", () => {
    const cases = [
        ["1.234,56", 1234.56], // TR: dot groups, comma decimal
        ["1,234.56", 1234.56], // EN: comma groups, dot decimal
        ["1.234", 1234], // three trailing digits => grouping
        ["12,50", 12.5],
        ["12.50", 12.5],
        ["1.234.567,89", 1234567.89],
        ["₺1.500,00", 1500],
        ["1.500,00 TL", 1500],
        ["2.500,00-", -2500], // Ziraat writes debits with a trailing minus
        ["-2.500,00", -2500],
        ["(2.500,00)", -2500],
        ["1 234,56", 1234.56], // space-grouped
        [1234.56, 1234.56],
        ["", null],
        ["   ", null],
        ["ABC", null],
        [null, null],
        [undefined, null],
    ];
    for (const [input, expected] of cases) {
        (0, node_test_1.test)(`${JSON.stringify(input)} -> ${expected}`, () => {
            node_assert_1.strict.equal((0, amount_format_1.parseAmount)(input), expected);
        });
    }
    (0, node_test_1.test)("a trailing minus is not swallowed into NaN", () => {
        // The previous cleaner kept the trailing "-" and Number("1234.56-") is NaN,
        // so these rows silently imported with no amount at all.
        node_assert_1.strict.notEqual((0, amount_format_1.parseAmount)("1.234,56-"), null);
    });
});
(0, node_test_1.describe)("foldTurkish", () => {
    (0, node_test_1.test)("dotted and dotless I both fold to i", () => {
        node_assert_1.strict.equal((0, amount_format_1.foldTurkish)("Tutarı"), "tutari");
        node_assert_1.strict.equal((0, amount_format_1.foldTurkish)("TUTARI"), "tutari");
        node_assert_1.strict.equal((0, amount_format_1.foldTurkish)("Tutari"), "tutari");
        node_assert_1.strict.equal((0, amount_format_1.foldTurkish)("İşlem Tutarı"), "islem tutari");
    });
});
(0, node_test_1.describe)("looksLikeIdentifier / looksLikeMoneyText", () => {
    (0, node_test_1.test)("reference and account numbers are identifiers, not money", () => {
        node_assert_1.strict.equal((0, amount_format_1.looksLikeIdentifier)("20250114887"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeIdentifier)("TR330006100519786457841326"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeIdentifier)("F1234567"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeIdentifier)("1.234,56"), false);
    });
    (0, node_test_1.test)("money shape needs a decimal part or grouping", () => {
        node_assert_1.strict.equal((0, amount_format_1.looksLikeMoneyText)("1.234,56"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeMoneyText)("250,00"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeMoneyText)("₺500"), true);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeMoneyText)("20250114887"), false);
        node_assert_1.strict.equal((0, amount_format_1.looksLikeMoneyText)("7"), false);
    });
});
(0, node_test_1.describe)("findHeaderRow", () => {
    (0, node_test_1.test)("skips a preamble line that merely mentions a date", () => {
        const rows = [
            ["Ziraat Bankası"],
            ["Rapor Tarihi: 01.01.2026"], // <- old code stopped here
            ["Hesap No: 12345678"],
            ["Tarih", "Açıklama", "Tutar", "Bakiye"], // <- the real header
            ["01.01.2026", "Gelen FAST AHMET", "250,00", "1.250,00"],
        ];
        node_assert_1.strict.equal((0, statement_columns_1.findHeaderRow)(rows), 3);
    });
    (0, node_test_1.test)("returns -1 when there is no header at all", () => {
        const rows = [
            ["01.01.2026", "Gelen FAST AHMET", "250,00"],
            ["02.01.2026", "Gelen FAST AYSE", "100,00"],
        ];
        node_assert_1.strict.equal((0, statement_columns_1.findHeaderRow)(rows), -1);
    });
});
(0, node_test_1.describe)("resolveStatementColumns — the «Tutar» rule", () => {
    (0, node_test_1.test)("uses the Tutar column when the sheet has one", () => {
        const headers = ["Tarih", "Açıklama", "Tutar", "Bakiye"];
        const dataRows = [
            ["01.01.2026", "Gelen FAST AHMET", "250,00", "1.250,00"],
            ["02.01.2026", "Gelen FAST AYSE", "100,00", "1.350,00"],
        ];
        const cols = (0, statement_columns_1.resolveStatementColumns)(headers, dataRows);
        node_assert_1.strict.equal(cols.amount, 2);
        node_assert_1.strict.equal(cols.amountSource, "header:tutar");
        node_assert_1.strict.equal(cols.amountHeader, "Tutar");
    });
    (0, node_test_1.test)("«Bakiye Tutarı» never wins the Tutar rule even when it comes first", () => {
        // This is the bug: "Bakiye Tutarı" contains "tutar" and sits to the LEFT of
        // the real column, so first-match-wins imported the running balance.
        const headers = ["Tarih", "Açıklama", "Bakiye Tutarı", "Tutar"];
        const dataRows = [
            ["01.01.2026", "Gelen FAST AHMET", "1.250,00", "250,00"],
            ["02.01.2026", "Gelen FAST AYSE", "1.350,00", "100,00"],
        ];
        const cols = (0, statement_columns_1.resolveStatementColumns)(headers, dataRows);
        node_assert_1.strict.equal(cols.amount, 3, "must pick Tutar, not Bakiye Tutarı");
        node_assert_1.strict.equal(cols.amountHeader, "Tutar");
    });
    (0, node_test_1.test)("Tutar beats Alacak when both are present", () => {
        const headers = ["Tarih", "Açıklama", "Alacak", "Borç", "Tutar"];
        const dataRows = [["01.01.2026", "x", "250,00", "", "250,00"]];
        const cols = (0, statement_columns_1.resolveStatementColumns)(headers, dataRows);
        node_assert_1.strict.equal(cols.amount, 4);
        node_assert_1.strict.equal(cols.amountSource, "header:tutar");
    });
    (0, node_test_1.test)("falls back to the Alacak/Borç pair when there is no Tutar", () => {
        const headers = ["Tarih", "Açıklama", "Alacak", "Borç"];
        const dataRows = [
            ["01.01.2026", "Gelen", "250,00", ""],
            ["02.01.2026", "Giden", "", "80,00"],
        ];
        const cols = (0, statement_columns_1.resolveStatementColumns)(headers, dataRows);
        node_assert_1.strict.equal(cols.amount, 2);
        node_assert_1.strict.equal(cols.amountSource, "header:credit");
        node_assert_1.strict.equal(cols.debit, 3);
    });
    (0, node_test_1.test)("case and Turkish letters do not matter", () => {
        for (const header of ["TUTARI", "Tutarı", "tutari", "İşlem Tutarı", "Tutar (TL)"]) {
            const cols = (0, statement_columns_1.resolveStatementColumns)(["Tarih", "Açıklama", header], [["01.01.2026", "x", "250,00"]]);
            node_assert_1.strict.equal(cols.amount, 2, `failed for header ${header}`);
            node_assert_1.strict.equal(cols.amountSource, "header:tutar");
        }
    });
});
(0, node_test_1.describe)("detectAmountColumn — no usable header", () => {
    (0, node_test_1.test)("prefers the money-shaped column over a reference number", () => {
        // col0 date, col1 reference (long digits), col2 description, col3 amount
        const dataRows = [
            ["01.01.2026", "20250114887", "Gelen FAST AHMET", "250,00"],
            ["02.01.2026", "20250114912", "Gelen FAST AYSE", "1.100,50"],
            ["03.01.2026", "20250115003", "Gelen FAST OMER", "75,25"],
        ];
        node_assert_1.strict.equal((0, statement_columns_1.detectAmountColumn)(dataRows), 3);
    });
    (0, node_test_1.test)("picks the movement column, not the running balance", () => {
        // col2 is the amount, col3 is a running balance of it.
        const dataRows = [
            ["01.01.2026", "Gelen FAST AHMET", "250,00", "1.250,00"],
            ["02.01.2026", "Gelen FAST AYSE", "100,00", "1.350,00"],
            ["03.01.2026", "Gelen FAST OMER", "50,00", "1.400,00"],
            ["04.01.2026", "Gelen FAST ALI", "25,00", "1.425,00"],
            ["05.01.2026", "Gelen FAST VELI", "75,00", "1.500,00"],
        ];
        node_assert_1.strict.equal((0, statement_columns_1.detectAmountColumn)(dataRows), 2);
    });
    (0, node_test_1.test)("ignores a constant column", () => {
        const dataRows = [
            ["01.01.2026", "TRY", "250,00"],
            ["02.01.2026", "TRY", "100,00"],
            ["03.01.2026", "TRY", "50,00"],
        ];
        node_assert_1.strict.equal((0, statement_columns_1.detectAmountColumn)(dataRows), 2);
    });
});
