export function Eval(ctx: Processor, expr: AttributeExpression): string|null|boolean {
  switch (expr.kind) {
    case "Literal": return expr.value;
    case "Property": return ctx.properties[expr.value] ?? null;
    case "Equals": return Eval(ctx, expr.arguments[0]) === Eval(ctx, expr.arguments[1]);
    case "Or": return AsBool(Eval(ctx, expr.arguments[0])) || AsBool(Eval(ctx, expr.arguments[1]));
    case "And": return AsBool(Eval(ctx, expr.arguments[0])) && AsBool(Eval(ctx, expr.arguments[1]));
    case "Not": return !AsBool(Eval(ctx, expr.arguments[0]));
    default:
      throw new Error(`Unknown expression: ${expr}`);
  }
}

function AsBool(val: any): boolean {
  if (typeof val !== "boolean") throw new Error("Logical operators cannot be applied to non-boolean values");
  return val;
}