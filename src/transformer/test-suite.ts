import {
	arrowFunctionExpression,
	ArrowFunctionExpression,
	assignmentExpression,
	blockStatement,
	BlockStatement,
	callExpression,
	CallExpression,
	expressionStatement,
	ExpressionStatement,
	functionDeclaration,
	FunctionDeclaration,
	identifier,
	memberExpression,
	returnStatement,
	ReturnStatement,
	tSTypeAnnotation,
	tsTypeAnnotation,
	tSTypeReference,
	tsTypeReference,
	variableDeclaration,
	variableDeclarator,
} from "@babel/types"
import { extractArrowFunctionDeclaration } from "../analyzer/ast"
import { transformTestCase } from "./test-case"
import { ReactComponentDefinition } from "../analyzer/jsx"
import { extractTestCase } from "../analyzer/jest"

const letUserEvent = variableDeclaration("let", [
	variableDeclarator(
		(() => {
			const id = identifier("user")
			id.typeAnnotation = tSTypeAnnotation(
				tSTypeReference(identifier("UserEvent")),
			)
			return id
		})(),
	),
])

function transformTestSuite(
	testSuite: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): ExpressionStatement {
	const expression = testSuite.expression as CallExpression
	const suiteBody = (expression.arguments[1] as ArrowFunctionExpression)
		.body as BlockStatement

	const transformed = suiteBody.body.flatMap((statement) => {
		switch (statement.type) {
			case "VariableDeclaration":
				const arrowFunction = extractArrowFunctionDeclaration(statement)
				if (arrowFunction) {
					switch (arrowFunction.name) {
						case "createWrapper":
							return generateRenderComponentFunction(arrowFunction.expression)

						case "createRTLWrapper":
							return []

						default:
							return statement
					}
				}

				return statement

			case "ExpressionStatement":
				switch (statement.expression.type) {
					case "CallExpression":
						const callee = statement.expression.callee
						if (callee.type !== "Identifier") return statement

						switch (callee.name) {
							case "beforeEach":
								return transformBeforeEach(statement) ?? statement
							case "it":
								const testCase = extractTestCase(statement)
								return testCase
									? transformTestCase(testCase, testTarget)
									: statement
							default:
								return statement
						}

					default:
						return statement
				}

			default:
				return statement
		}
	})

	return expressionStatement(
		callExpression(expression.callee, [
			expression.arguments[0],
			arrowFunctionExpression(
				[],
				blockStatement([letUserEvent, ...transformed]),
			),
		]),
	)
}

function transformBeforeEach(
	statement: ExpressionStatement,
): ExpressionStatement | null {
	if (statement.expression.type !== "CallExpression") return null

	const beforeEachCallback = statement.expression.arguments[0]
	if (
		!beforeEachCallback ||
		beforeEachCallback.type !== "ArrowFunctionExpression" ||
		beforeEachCallback.body.type !== "BlockStatement"
	) {
		return null
	}

	const userEventInit = expressionStatement(
		assignmentExpression(
			"=",
			identifier("user"),
			callExpression(
				memberExpression(identifier("userEvent"), identifier("setup")),
				[],
			),
		),
	)
	const beforeEachBody = [userEventInit, ...beforeEachCallback.body.body]

	return expressionStatement(
		callExpression(statement.expression.callee, [
			arrowFunctionExpression([], blockStatement(beforeEachBody)),
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

	const func = functionDeclaration(
		identifier("renderComponent"),
		enzymeWrapperFunc.params,
		blockStatement([
			...body.slice(0, -1),
			returnStatement(callExpression(identifier("render"), [jsx])),
		]),
	)
	func.returnType = tsTypeAnnotation(
		tsTypeReference(identifier("RenderResult")),
	)

	return func
}

export { transformTestSuite }
