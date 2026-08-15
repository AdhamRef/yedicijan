"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldResetIntegrationUiState = shouldResetIntegrationUiState;
function shouldResetIntegrationUiState(previousProvider, nextProvider) {
    return previousProvider !== nextProvider;
}
