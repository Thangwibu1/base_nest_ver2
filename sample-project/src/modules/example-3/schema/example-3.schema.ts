export type Example3Schema = {
  name: string;
};

export const example-3Schema = {
  parse: <T>(payload: T) => payload,
};
