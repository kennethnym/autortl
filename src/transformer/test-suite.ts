import {
	arrowFunctionExpression,
	ArrowFunctionExpression,
	blockStatement,
	BlockStatement,
	callExpression,
	CallExpression,
	expressionStatement,
	ExpressionStatement,
	functionDeclaration,
	FunctionDeclaration,
	identifier,
	returnStatement,
	ReturnStatement,
	Statement,
} from "@babel/types"
import { extractArrowFunctionDeclaration } from "../analyzer/ast"
import { extractTestCase } from "../analyzer/jest"
import { transformTestCase } from "./test-case"
import { ReactComponentDefinition } from "../analyzer/jsx"

function transformTestSuite(
	testSuite: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): ExpressionStatement {
	const expression = testSuite.expression as CallExpression
	const suiteBody = (expression.arguments[1] as ArrowFunctionExpression)
		.body as BlockStatement

	const transformed = suiteBody.body.reduce<Statement[]>(
		(statements, statement) => {
			const arrowFunction = extractArrowFunctionDeclaration(statement)
			if (arrowFunction) {
				switch (arrowFunction.name) {
					case "createWrapper":
						statements.push(
							generateRenderComponentFunction(arrowFunction.expression),
						)
						break
					case "createRTLWrapper":
						return statements
				}
			}

			const testCase = extractTestCase(statement)
			if (testCase) {
				statements.push(transformTestCase(testCase.statement, testTarget))
			}

			return statements
		},
		[],
	)

	return expressionStatement(
		callExpression(expression.callee, [
			expression.arguments[0],
			arrowFunctionExpression([], blockStatement(transformed)),
		]),
	)
}

function generateRenderComponentFunction(
	enzymeWrapperFunc: ArrowFunctionExpression,
): FunctionDeclaration {
	const hasBody = enzymeWrapperFunc.body.type === "BlockStatement"

	const body = hasBody ? (enzymeWrapperFunc.body as BlockStatement).body : []
	const returnValue = hasBody
		? ((enzymeWrapperFunc.body as BlockStatement).body.find(
				(statement): statement is ReturnStatement =>
					statement.type === "ReturnStatement",
		  )?.argument as CallExpression)
		: undefined

	if (!returnValue)
		throw new Error("createWrapper function has no return value!")

	const jsx = returnValue.arguments[0]

	return functionDeclaration(
		identifier("renderComponent"),
		enzymeWrapperFunc.params,
		blockStatement([
			...body.slice(0, -1),
			returnStatement(callExpression(identifier("render"), [jsx])),
		]),
	)
}

export { transformTestSuite }
