import {
	awaitExpression,
	callExpression,
	CallExpression,
	Expression,
	expressionStatement,
	ExpressionStatement,
	Identifier,
	identifier,
	MemberExpression,
	memberExpression,
	objectExpression,
	objectProperty,
	Statement,
	stringLiteral,
	StringLiteral,
} from "@babel/types"
import { findEnzymeFind } from "../analyzer/enzyme"
import { findByLabelText, ReactComponentDefinition } from "../analyzer/jsx"

function ariaLabelFromSelector(selector: string): string | null {
	const [attr, value] = selector.slice(1, -1).split("=")
	return attr === "aria-label" && value ? value.slice(1, -1) : null
}

function transformEnzymeSimulate(
	statement: ExpressionStatement,
	testTarget: ReactComponentDefinition,
): Statement[] {
	const callExpr = statement.expression as CallExpression
	const simulatedAction = callExpr.arguments[0] as StringLiteral

	const wrapperFind = findEnzymeFind(callExpr)
	if (!wrapperFind) return [statement]

	const rtlQuery = transformEnzymeFind(wrapperFind, testTarget)
	if (!rtlQuery) return [statement]

	switch (simulatedAction.value) {
		case "click":
			return [
				expressionStatement(
					awaitExpression(
						callExpression(
							memberExpression(identifier("user"), identifier("click")),
							[rtlQuery],
						),
					),
				),
			]

		default:
			throw new Error(
				`Unsupported enzyme simulate action: ${simulatedAction.value}`,
			)
	}
}

function transformEnzymeFind(
	findExpression: CallExpression,
	testTarget: ReactComponentDefinition,
): Expression | null {
	if (
		findExpression.callee.type !== "MemberExpression" ||
		findExpression.callee.property.type !== "Identifier" ||
		findExpression.callee.property.name !== "find"
	) {
		return null
	}

	const selector = findExpression.arguments[0]
	if (!selector) return null

	switch (selector.type) {
		case "StringLiteral":
			const ariaLabel = ariaLabelFromSelector(selector.value)
			if (!ariaLabel) return null

			const selectedComponent = findByLabelText(ariaLabel, testTarget.jsx)

			return selectedComponent && selectedComponent.role
				? awaitExpression(
						callExpression(
							memberExpression(identifier("screen"), identifier("findByRole")),
							[
								stringLiteral(selectedComponent.role),
								objectExpression([
									objectProperty(identifier("name"), stringLiteral(ariaLabel)),
								]),
							],
						),
				  )
				: awaitExpression(
						callExpression(
							memberExpression(
								identifier("screen"),
								identifier("findByLabelText"),
							),
							[stringLiteral(ariaLabel)],
						),
				  )

		default:
			return null
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
		case "update":
			return []
		case "simulate":
			return transformEnzymeSimulate(statement, testTarget)
		default:
			return [statement]
	}
}

export {
	ariaLabelFromSelector,
	transformEnzymeSimulate,
	transformEnzymeFind,
	transformWrapperCalls,
}
