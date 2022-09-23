import {
	CallExpression,
	Identifier,
	Statement,
	TemplateLiteral,
} from "@babel/types"
import type { ArrowFunctionDeclaration, CallExpressionInfo } from "./types"
import { walkMethodChain } from "../util/walk-method-chain"

/**
 * Finds the object that the given method chain expression is chained on.
 *
 * @example
 * // parse is any function that parses JavaScript code to AST.
 *
 * const expression = parse('a.b().c().d()')
 * findMethodChainReference(expression) // returns 'a' as an {@link Identifier}
 *
 * const expression = parse('a().b().c()')
 * findMethodChainReference(expression) // returns 'a' as an {@link Identifier}
 *
 * @param expression The method chain represented as CallExpression.
 * @returns The object that the method chain is chained on represented as an {@link Identifier},
 *          or `null` if the expression is not a method chain.
 */
function findMethodChainReference(
	expression: CallExpression,
): Identifier | null {
	let last: CallExpression | null = null
	for (const expr of walkMethodChain(expression)) {
		last = expr
	}

	switch (last?.callee.type) {
		case "MemberExpression":
			return last.callee.object.type === "Identifier"
				? last.callee.object
				: null

		case "Identifier":
			return last.callee

		default:
			return null
	}
}

function analyzeCallExpression(expression: CallExpression): CallExpressionInfo {
	let last: CallExpression | null = null
	const methods = new Map<string, CallExpression>()
	for (const expr of walkMethodChain(expression)) {
		last = expr
		switch (expr.callee.type) {
			case "Identifier":
				methods.set(expr.callee.name, expr)
				break
			case "MemberExpression":
				if (expr.callee.property.type === "Identifier") {
					methods.set(expr.callee.property.name, expr)
				}
		}
	}

	let reference: Identifier | null = null
	switch (last?.callee.type) {
		case "MemberExpression":
			reference =
				last.callee.object.type === "Identifier" ? last.callee.object : null
			break

		case "Identifier":
			reference = last.callee
			break

		default:
			break
	}

	return { reference, methods, expression }
}

function templateLiteralToString(expression: TemplateLiteral): string {
	return expression.quasis.reduce(
		(str, element) => str + element.value.cooked,
		"",
	)
}

function extractArrowFunctionDeclaration(
	statement: Statement,
): ArrowFunctionDeclaration | null {
	if (statement.type === "VariableDeclaration") {
		for (const declaration of statement.declarations) {
			if (
				declaration.type === "VariableDeclarator" &&
				declaration.id.type === "Identifier" &&
				declaration.init?.type === "ArrowFunctionExpression"
			) {
				return {
					name: declaration.id.name,
					body: declaration.init.body,
					declaration: statement,
					expression: declaration.init,
				}
			}
		}
	}
	return null
}

export {
	analyzeCallExpression,
	findMethodChainReference,
	extractArrowFunctionDeclaration,
	templateLiteralToString,
}
