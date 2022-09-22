import {
	arrowFunctionExpression,
	ArrowFunctionExpression,
	blockStatement,
	BlockStatement,
	callExpression,
	CallExpression,
	expressionStatement,
	ExpressionStatement,
	Identifier,
	identifier,
	MemberExpression,
	Statement,
} from "@babel/types"
import {
	findCreateWrapperCall,
	findMethodChainReference,
} from "../analyzer/enzyme"
import { transformEnzymeSimulate } from "./enzyme"
import { ReactComponentDefinition } from "../analyzer/jsx"

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
			return createWrapperCall
				? [
						expressionStatement(
							callExpression(
								identifier("renderComponent"),
								createWrapperCall.arguments,
							),
						),
				  ]
				: [statement]

		case "ExpressionStatement":
			if (statement.expression.type !== "CallExpression") return [statement]

			const callee = findMethodChainReference(statement.expression)
			return callee?.name === "wrapper"
				? transformWrapperCalls(statement, testTarget)
				: [statement]

		default:
			return [statement]
	}
}

function transformWrapperCalls(
	statement: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): Statement[] {
	const callExpression = statement.expression as CallExpression
	const enzymeOperation = (
		(callExpression.callee as MemberExpression).property as Identifier
	).name

	switch (enzymeOperation) {
		case "simulate":
			return transformEnzymeSimulate(statement, testTarget)
		default:
			return [statement]
	}
}

export { transformTestCase }
