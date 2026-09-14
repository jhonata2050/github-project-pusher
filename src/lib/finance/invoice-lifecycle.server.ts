/**
 * Law #6 (Preservation of Facades): This file serves as the backwards-compatible
 * facade for all invoice lifecycle functions and types, delegating to the modularized
 * src/lib/finance/invoice-lifecycle/ submodules.
 */
export * from "./invoice-lifecycle/index";

