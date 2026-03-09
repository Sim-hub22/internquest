// @ts-expect-error - import.meta.glob is a Vite/Vitest feature
/// <reference types="vite/client" />
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
