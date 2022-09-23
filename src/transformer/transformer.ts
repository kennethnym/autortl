import { Statement } from "@babel/types"
import { transformTestSuite } from "./test-suite"
import { ReactComponentDefinition } from "../analyzer/jsx"

function transform(
	statements: Statement[],
	testTarget: ReactComponentDefinition,
): Statement[] {
	return statements.flatMap((statement) => {
		switch (statement.type) {
			case "ImportDeclaration":
				const source = statement.source
				return source.value === "@testing-library/react" ||
					source.value === "enzyme"
					? []
					: statement

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
