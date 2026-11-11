import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

Object.defineProperty(globalThis, "TextDecoder", { configurable: true, value: TextDecoder });
Object.defineProperty(globalThis, "TextEncoder", { configurable: true, value: TextEncoder });

class TestHeaders {
  private readonly values = new Map<string, string>();

  constructor(initial?: HeadersInit) {
    if (initial && Symbol.iterator in Object(initial)) {
      for (const [key, value] of initial as Iterable<[string, string]>) this.set(key, value);
    }
  }

  set(name: string, value: string) {
    this.values.set(name.toLowerCase(), value);
  }
}

Object.defineProperty(globalThis, "Headers", { configurable: true, value: TestHeaders });
