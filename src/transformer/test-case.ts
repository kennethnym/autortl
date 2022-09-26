import {
	arrowFunctionExpression,
	ArrowFunctionExpression,
	blockStatement,
	BlockStatement,
	callExpression,
	CallExpression,
	expressionStatement,
	ExpressionStatement,
	identifier,
	memberExpression,
	objectPattern,
	objectProperty,
	Statement,
	stringLiteral,
	variableDeclaration,
	variableDeclarator,
} from "@babel/types"
import {
	findCreateRtlWrapperCall,
	findCreateWrapperCall,
	findEnzymeFind,
} from "../analyzer/enzyme"
import { transformEnzymeFind, transformWrapperCalls } from "./enzyme"
import { ReactComponentDefinition } from "../analyzer/jsx"
import {
	analyzeCallExpression,
	findMethodChainReference,
} from "../analyzer/ast"
import { TestCase } from "../analyzer/jest"

function transformTestCase(
	testCase: TestCase,
	testTarget: ReactComponentDefinition,
): ExpressionStatement {
	const expression = testCase.statement.expression as CallExpression
	const testBody = (expression.arguments[1] as ArrowFunctionExpression)
		.body as BlockStatement

	return expressionStatement(
		callExpression(identifier("it"), [
			stringLiteral(testCase.testName),
			arrowFunctionExpression(
				[],
				blockStatement(
					testBody.body.flatMap((s) =>
						transformTestCaseStatement(testCase, s, testTarget),
					),
				),
				true,
			),
		]),
	)
}

function transformTestCaseStatement(
	testCase: TestCase,
	statement: Statement,
	testTarget: ReactComponentDefinition,
): Statement[] {
	switch (statement.type) {
		case "VariableDeclaration":
			const declaration = statement.declarations[0]
			const assignedValue = declaration.init
			if (
				assignedValue?.type === "CallExpression" &&
				assignedValue.callee.type === "Identifier"
			) {
				switch (assignedValue.callee.name) {
					case "createWrapper":
						return [
							expressionStatement(
								callExpression(
									identifier("renderComponent"),
									assignedValue.arguments,
								),
							),
						]

					case "createRTLWrapper":
						return [
							variableDeclaration("const", [
								variableDeclarator(
									objectPattern([
										objectProperty(
											identifier("asFragment"),
											identifier("asFragment"),
											false,
											true,
										),
									]),
									callExpression(
										identifier("renderComponent"),
										assignedValue.arguments,
									),
								),
							]),
						]

					case "shallow":
						if (testCase.testName === "renders correctly") {
							return [
								variableDeclaration("const", [
									variableDeclarator(
										objectPattern([
											objectProperty(
												identifier("asFragment"),
												identifier("asFragment"),
												false,
												true,
											),
										]),
										callExpression(
											identifier("render"),
											assignedValue.arguments,
										),
									),
								]),
							]
						}

						return [
							expressionStatement(
								callExpression(identifier("render"), assignedValue.arguments),
							),
						]
				}
			}
			const createWrapperCall = findCreateWrapperCall(statement)
			if (createWrapperCall) {
				return [
					expressionStatement(
						callExpression(
							identifier("renderComponent"),
							createWrapperCall.arguments,
						),
					),
				]
			}

			const createRtlWrapperCall = findCreateRtlWrapperCall(statement)
			if (createRtlWrapperCall) {
				return [
					variableDeclaration("const", [
						variableDeclarator(
							objectPattern([
								objectProperty(
									identifier("asFragment"),
									identifier("asFragment"),
									false,
									true,
								),
							]),
							callExpression(
								identifier("renderComponent"),
								createRtlWrapperCall.arguments,
							),
						),
					]),
				]
			}

			return [statement]

		case "ExpressionStatement":
			if (statement.expression.type !== "CallExpression") return [statement]

			const callee = findMethodChainReference(statement.expression)
			switch (callee?.name) {
				case "wrapper":
					return transformWrapperCalls(statement, testTarget)

				case "expect":
					return transformExpectCall(testCase, statement, testTarget)
			}

			return callee?.name === "wrapper"
				? transformWrapperCalls(statement, testTarget)
				: [statement]

		default:
			return [statement]
	}
}

function transformExpectCall(
	testCase: TestCase,
	statement: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): Statement[] {
	const expression = statement.expression as CallExpression
	const callExpressionInfo = analyzeCallExpression(expression)
	const expectCall = callExpressionInfo.methods.get("expect")
	if (!expectCall) return [statement]

	const expectValue = expectCall.arguments[0]
	if (!expectValue) return [statement]

	const transformedStatements: ExpressionStatement[] = []

	switch (expectValue.type) {
		case "CallExpression":
			const expectValueExpressionInfo = analyzeCallExpression(expectValue)
			if (expectValueExpressionInfo.reference?.name === "wrapper") {
				if (expectValueExpressionInfo.methods.has("find")) {
					const rtlQuery = transformEnzymeFind(expectValue, testTarget)
					if (!rtlQuery) return [statement]

					if (callExpressionInfo.methods.has("toBeTruthy")) {
						transformedStatements.push(
							expressionStatement(
								callExpression(
									memberExpression(
										callExpression(identifier("expect"), [rtlQuery]),
										identifier("toBeInTheDocument"),
									),
									[],
								),
							),
						)
					}
				} else if (expectValueExpressionInfo.methods.has("asFragment")) {
					transformedStatements.push(
						expressionStatement(
							callExpression(
								memberExpression(
									callExpression(identifier("expect"), [
										callExpression(identifier("asFragment"), []),
									]),
									identifier("toMatchSnapshot"),
								),
								[],
							),
						),
					)
				}
			}
			break

		case "MemberExpression":
			switch (expectValue.property.type) {
				case "Identifier":
					switch (expectValue.property.name) {
						case "disabled":
							if (expectValue.object.type === "CallExpression") {
								const wrapperFind = findEnzymeFind(expectValue.object)
								if (!wrapperFind) return [statement]

								const rtlQuery = transformEnzymeFind(wrapperFind, testTarget)
								if (!rtlQuery) return [statement]

								transformedStatements.push(
									expressionStatement(
										callExpression(
											memberExpression(
												callExpression(identifier("expect"), [rtlQuery]),
												identifier("toBeDisabled"),
											),
											[],
										),
									),
								)
							}
							break
					}
			}
			break

		case "Identifier":
			if (
				expectValue.name === "wrapper" &&
				callExpressionInfo.methods.has("toMatchSnapshot")
			) {
				transformedStatements.push(
					expressionStatement(
						callExpression(
							memberExpression(
								callExpression(identifier("expect"), [
									callExpression(identifier("asFragment"), []),
								]),
								identifier("toMatchSnapshot"),
							),
							[],
						),
					),
				)
			}
			break

		default:
			break
	}

	return transformedStatements.length > 0 ? transformedStatements : [statement]
}

export { transformTestCase }
