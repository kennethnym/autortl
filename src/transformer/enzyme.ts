import {
	awaitExpression,
	callExpression,
	CallExpression,
	Expression,
	expressionStatement,
	ExpressionStatement,
	identifier,
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

	const selector = wrapperFind.arguments[0]
	if (selector.type !== "StringLiteral") return [statement]

	const ariaLabel = ariaLabelFromSelector(selector.value)
	if (!ariaLabel) return [statement]

	// attempt to find the component by aria-label
	const selectedComponent = findByLabelText(ariaLabel, testTarget.jsx)

	const rtlQuery = selectedComponent
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
					memberExpression(identifier("screen"), identifier("findByLabelText")),
					[stringLiteral(ariaLabel)],
				),
		  )

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

export { ariaLabelFromSelector, transformEnzymeSimulate }
