export function assertNever(value: never): never {
  throw new Error("Unexpected value: " + value + " when the type was never");
}
