"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const configPath = "tsconfig.campaign-create.json";
(0, node_test_1.default)("campaign create targeted TypeScript check passes", () => {
    strict_1.default.doesNotThrow(() => {
        (0, node_child_process_1.execFileSync)(process.execPath, ["node_modules/typescript/bin/tsc", "-p", configPath], {
            cwd: process.cwd(),
            encoding: "utf8",
            stdio: "pipe",
        });
    });
});
(0, node_test_1.default)("campaign create targeted TypeScript scope includes the real Prisma adapter and core", () => {
    const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, "utf8"));
    strict_1.default.ok(Array.isArray(config.include));
    strict_1.default.ok(config.include.includes("lib/campaign/admin-create.ts"));
    strict_1.default.ok(config.include.includes("lib/campaign/admin-create-core.ts"));
});
