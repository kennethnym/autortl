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

function transformTestCase(
	testCase: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): ExpressionStatement {
	const expression = testCase.expression as CallExpression
	const testBody = (expression.arguments[1] as ArrowFunctionExpression)
		.body as BlockStatement

	return expressionStatement(
		callExpression(identifier("it"), [
			(testCase.expression as CallExpression).arguments[0],
			arrowFunctionExpression(
				[],
				blockStatement(
					testBody.body.flatMap((s) =>
						transformTestCaseStatement(s, testTarget),
					),
				),
				true,
			),
		]),
	)
}

function transformTestCaseStatement(
	statement: Statement,
	testTarget: ReactComponentDefinition,
): Statement[] {
	switch (statement.type) {
		case "VariableDeclaration":
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
					return transformExpectCall(statement, testTarget)
			}

			return callee?.name === "wrapper"
				? transformWrapperCalls(statement, testTarget)
				: [statement]

		default:
			return [statement]
	}
}

function transformExpectCall(
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
			if (
				expectValue.property.type === "Identifier" &&
				expectValue.property.name === "disabled" &&
				expectValue.object.type === "CallExpression"
			) {
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

		default:
			break
	}

	return transformedStatements.length > 0 ? transformedStatements : [statement]
}

export { transformTestCase }
