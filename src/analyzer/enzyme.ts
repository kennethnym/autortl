import { CallExpression, Identifier, VariableDeclaration } from "@babel/types"
import { walkMethodChain } from "../util/walk-chain-call"

/**
 * Finds the object that the given method chain expression is chained on.
 *
 * @example
 * // parse is any function that parses JavaScript code to AST.
 *
 * const expression = parse('a.b().c().d()')
 * findMethodChainReference(expression) // returns AST representation of 'a'
 *
 * const expression = parse('a().b().c()')
 * findMethodChainReference(expression) // returns null
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
	return last?.callee.type === "MemberExpression" &&
		last.callee.object.type === "Identifier"
		? last.callee.object
		: null
}

function findCreateWrapperCall(
	statement: VariableDeclaration,
): CallExpression | null {
	for (const declaration of statement.declarations) {
		if (
			declaration.type === "VariableDeclarator" &&
			declaration.init?.type === "CallExpression" &&
			declaration.init.callee.type === "Identifier" &&
			declaration.init.callee.name === "createWrapper"
		) {
			return declaration.init
		}
	}
	return null
}

function findEnzymeFind(expr: CallExpression) {
	for (const expression of walkMethodChain(expr)) {
		if (
			expression.callee.type === "MemberExpression" &&
			expression.callee.property.type === "Identifier" &&
			expression.callee.property.name === "find"
		) {
			return expression
		}
	}
}

export { findMethodChainReference, findCreateWrapperCall, findEnzymeFind }
