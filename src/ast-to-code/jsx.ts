import {
	JSXElement,
	JSXExpressionContainer,
	JSXFragment,
	JSXSpreadChild,
	JSXText,
} from "@babel/types"
import { expressionToString } from "./expression"

function jsxToString(
	node:
		| JSXElement
		| JSXFragment
		| JSXText
		| JSXExpressionContainer
		| JSXSpreadChild,
): string {
	if (node.type === "JSXFragment") return "<></>"
	if (node.type === "JSXText") return node.value
	if (node.type === "JSXExpressionContainer") {
		switch (node.expression.type) {
			case "JSXEmptyExpression":
				return "{}"
			default:
				return `{${expressionToString(node.expression)}}`
		}
	}
	if (node.type === "JSXSpreadChild") {
		return `{...${expressionToString(node.expression)}}`
	}

	let elementName: string
	switch (node.openingElement.name.type) {
		case "JSXIdentifier":
			elementName = node.openingElement.name.name
			break
		default:
			throw new Error("Unsupported JSX syntax")
	}

	return `<${elementName}>${node.children
		.map(jsxToString)
		.join()}</${elementName}>`
}

export { jsxToString }
