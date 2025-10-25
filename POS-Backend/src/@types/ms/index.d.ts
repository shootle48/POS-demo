declare module 'ms' {
  interface Options {
    long?: boolean;
  }

  interface MsFunction {
    (value: string | number, options?: Options): string | number;
    parse(value: string): number;
    format(value: number, options?: Options): string;
  }

  const ms: MsFunction;
  export = ms;
}
