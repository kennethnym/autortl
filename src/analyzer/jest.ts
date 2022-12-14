import { ExpressionStatement, Statement } from "@babel/types"

interface TestCase {
	testName: string
	statement: ExpressionStatement
	body: Statement[]
}

function extractTestCase(statement: Statement): TestCase | null {
	if (
		statement.type !== "ExpressionStatement" ||
		statement.expression.type !== "CallExpression" ||
		statement.expression.arguments.length !== 2 ||
		statement.expression.arguments[0].type !== "StringLiteral" ||
		statement.expression.arguments[1].type !== "ArrowFunctionExpression" ||
		statement.expression.arguments[1].body.type !== "BlockStatement"
	) {
		return null
	}

	return {
		testName: statement.expression.arguments[0].value,
		statement,
		body: statement.expression.arguments[1].body.body,
	}
}

export { extractTestCase }
export type { TestCase }
