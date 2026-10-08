export type FormState<K extends string = string> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<K, string>>;
  redirectTo?: string;
};

export const GENERIC_ERROR = "Un souci technique, réessayez.";
