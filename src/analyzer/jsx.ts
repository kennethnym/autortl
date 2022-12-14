import {
	Identifier,
	JSXAttribute,
	JSXElement,
	JSXExpressionContainer,
	JSXFragment,
	JSXIdentifier,
	JSXSpreadChild,
	JSXText,
	Program,
	ReturnStatement,
	VariableDeclaration,
} from "@babel/types"
import { templateLiteralToString } from "./ast"

interface ReactComponentDefinition {
	name: string
	jsx: JSXElement | JSXFragment
	declaration: VariableDeclaration
}

interface ReactComponent {
	name: string
	label: string | null
	role: string | null
	jsx: JSXElement
}

const roles: Record<string, string> = {
	Button: "button",
	IconButton: "button",
}

function findReactComponentByName(
	name: string,
	program: Program,
): ReactComponentDefinition | null {
	for (const statement of program.body) {
		if (statement.type === "VariableDeclaration") {
			for (const declaration of statement.declarations) {
				if (
					declaration.id.type === "Identifier" &&
					declaration.id.name === name &&
					declaration.init?.type === "ArrowFunctionExpression"
				) {
					switch (declaration.init.body.type) {
						case "JSXElement":
						case "JSXFragment":
							return {
								name,
								jsx: declaration.init.body,
								declaration: statement,
							}

						case "BlockStatement":
							const returnStatement = declaration.init.body.body.find(
								(statement): statement is ReturnStatement =>
									statement.type === "ReturnStatement",
							)
							if (
								!returnStatement ||
								(returnStatement.argument?.type !== "JSXElement" &&
									returnStatement.argument?.type !== "JSXFragment")
							)
								return null

							return {
								name,
								jsx: returnStatement.argument,
								declaration: statement,
							}
					}
				}
			}
		}
	}
	return null
}

function* walkJsx(root: JSXElement | JSXFragment) {
	const stack: (
		| JSXText
		| JSXExpressionContainer
		| JSXSpreadChild
		| JSXElement
		| JSXFragment
	)[] = [root]

	while (stack.length > 0) {
		const current = stack.splice(0, 1)[0]
		if (!current) return

		const nodeType = current.type
		if (nodeType === "JSXElement" || nodeType === "JSXFragment") {
			stack.push(...current.children)
		}

		yield current
	}
}

function findByLabelText(
	labelText: string,
	root: JSXElement | JSXFragment,
): ReactComponent | null {
	for (const node of walkJsx(root)) {
		if (node.type === "JSXElement") {
			const info = extractJSXElementInfo(node)
			if (
				info &&
				info.label &&
				(info.label.includes(labelText) || labelText.includes(info.label))
			)
				return info
		}
	}
	return null
}

function findByComponent(
	componentIdentifier: Identifier,
	root: JSXElement | JSXFragment,
) {
	for (const node of walkJsx(root)) {
		if (
			node.type === "JSXElement" &&
			node.openingElement.name.type === "JSXIdentifier" &&
			node.openingElement.name.name === componentIdentifier.name
		) {
			return node
		}
	}
	return null
}

function extractJSXElementInfo(element: JSXElement): ReactComponent | null {
	const ariaLabelProp = element.openingElement.attributes.find(
		(prop): prop is JSXAttribute =>
			prop.type === "JSXAttribute" &&
			prop.name.type === "JSXIdentifier" &&
			prop.name.name === "aria-label",
	)
	if (!ariaLabelProp) return null

	let ariaLabel: string | null = null
	switch (ariaLabelProp.value?.type) {
		case "StringLiteral":
			ariaLabel = ariaLabelProp.value.value
			break

		case "JSXExpressionContainer":
			const expression = ariaLabelProp.value.expression
			if (expression.type === "TemplateLiteral") {
				ariaLabel = templateLiteralToString(expression)
			}
			break
	}

	const componentName = (element.openingElement.name as JSXIdentifier).name

	return {
		label: ariaLabel,
		role: roles[componentName] ?? null,
		name: componentName,
		jsx: element,
	}
}

export { walkJsx, findReactComponentByName, findByLabelText }
export type { ReactComponentDefinition, ReactComponent }
