import { Expression, ObjectExpression, PrivateName } from "@babel/types"
import { jsxToString } from "./jsx"

function expressionToString(expr: Expression | PrivateName | null): string {
	if (expr === null) return ""
	switch (expr.type) {
		case "ArrayExpression":
			return `[${expr.elements
				.map((elem) =>
					elem?.type === "SpreadElement"
						? `...${expressionToString(elem.argument)}`
						: expressionToString(elem),
				)
				.join(",")}]`

		case "AwaitExpression":
			return `await ${expressionToString(expr.argument)}`

		case "BinaryExpression":
			return (
				expressionToString(expr.left) +
				expr.operator +
				expressionToString(expr.right)
			)

		case "CallExpression":
			return `${expressionToString(
				expr.callee as Expression,
			)}(${expr.arguments.map((arg) =>
				arg.type === "SpreadElement"
					? `...${expressionToString(arg.argument)}`
					: expressionToString(arg as Expression),
			)})`

		case "StringLiteral":
			return `"${expr.value}"`

		case "Identifier":
			return expr.name

		case "JSXElement":
		case "JSXFragment":
			return jsxToString(expr)

		default:
			throw new Error(`Unsupported syntax. Encountered ${expr.type}`)
	}
}

export { expressionToString }
