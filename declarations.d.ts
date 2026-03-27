declare module '*.wav' {
  const asset: number;
  export default asset;
}

declare module 'vitest' {
  interface Expectation {
    not: Expectation;
    toBe(expected: unknown): void;
    toBeLessThan(expected: number): void;
    toContain(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
  }

  interface Spy {
    mockReturnValue(value: number): void;
  }

  interface Vitest {
    restoreAllMocks(): void;
    spyOn<T extends object, K extends keyof T>(target: T, method: K): Spy;
  }

  export const beforeEach: (callback: () => void) => void;
  export const describe: (name: string, callback: () => void) => void;
  export const expect: (actual: unknown) => Expectation;
  export const it: (name: string, callback: () => void) => void;
  export const vi: Vitest;
}
