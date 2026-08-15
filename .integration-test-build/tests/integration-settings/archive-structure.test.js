"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const read = (path) => (0, node_fs_1.readFileSync)(path, "utf8");
/**
 * Was operations-archive-structure.test.ts. Every operations assertion in it described pages that
 * no longer exist — the التشغيل nav group, the five approved operations pages, their legacy
 * redirect targets, and the donor-reactivation masking page. Those tests could only fail, and a
 * test that pins removed behaviour is worse than no test. What remains is the archive half, which
 * is untouched by that removal.
 */
(0, node_test_1.default)("archive is protected before nested page reads", () => {
    const source = read("app/(dashboard)/dashboard/archive/layout.tsx");
    strict_1.default.match(source, /getServerSession/);
    strict_1.default.match(source, /resolveDashboardPageAccess/);
    strict_1.default.match(source, /redirect\(access\.redirectTo\)/);
});
(0, node_test_1.default)("archive root and duplicate upload routes redirect to canonical pages", () => {
    const redirects = {
        "app/(dashboard)/dashboard/archive/page.tsx": "/dashboard/archive/collections",
        "app/(dashboard)/dashboard/archive/marketing-files/page.tsx": "/dashboard/archive/assets?category=MARKETING",
        "app/(dashboard)/dashboard/archive/documents/page.tsx": "/dashboard/archive/assets?category=DOCUMENTS",
    };
    for (const [path, destination] of Object.entries(redirects)) {
        strict_1.default.ok(read(path).includes(`redirect("${destination}")`));
    }
});
