import { Statement } from "@babel/types"
import { transformTestSuite } from "./test-suite"
import { ReactComponent, ReactComponentDefinition } from "../analyzer/jsx"

function transform(
	statements: Statement[],
	testTarget: ReactComponentDefinition,
): Statement[] {
	return statements.map((statement) => {
		switch (statement.type) {
			case "ExpressionStatement":
				const expression = statement.expression
				if (
					expression.type === "CallExpression" &&
					expression.callee.type === "Identifier" &&
					expression.callee.name === "describe"
				) {
					return transformTestSuite(statement, testTarget)
				}
				return statement

			default:
				return statement
		}
	})
}

export { transform }
