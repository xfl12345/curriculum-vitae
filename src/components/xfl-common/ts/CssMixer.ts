import { PartialCssStyleType } from "./PartialCssStyleType";

export const cssMixer = (
  defaultCssStyle: PartialCssStyleType,
  inputCssStyle: PartialCssStyleType
): PartialCssStyleType => {
  const theStyle: PartialCssStyleType = { ...(defaultCssStyle as any) };
  if (defaultCssStyle !== inputCssStyle) {
    Object.keys(inputCssStyle).forEach((key) => {
      (theStyle as any)[key] = inputCssStyle[key as keyof typeof inputCssStyle];
    });
  }
  return theStyle;
};
