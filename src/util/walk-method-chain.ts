import { CallExpression } from "@babel/types"

function* walkMethodChain(expr: CallExpression): Generator<CallExpression> {
	let expression: CallExpression = expr
	while (true) {
		yield expression

		if (
			expression.type !== "CallExpression" ||
			expression.callee.type !== "MemberExpression" ||
			expression.callee.object.type !== "CallExpression"
		) {
			return
		}

		expression = expression.callee.object
	}
}

export { walkMethodChain }
