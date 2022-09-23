import { CallExpression, VariableDeclaration } from "@babel/types"
import { walkMethodChain } from "../util/walk-method-chain"

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

function findCreateRtlWrapperCall(
	statement: VariableDeclaration,
): CallExpression | null {
	for (const declaration of statement.declarations) {
		if (
			declaration.type === "VariableDeclarator" &&
			declaration.init?.type === "CallExpression" &&
			declaration.init.callee.type === "Identifier" &&
			declaration.init.callee.name === "createRTLWrapper"
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

function isWrapperUpdateCall(expr: CallExpression) {
	return (
		expr.callee.type === "MemberExpression" &&
		expr.callee.property.type === "Identifier" &&
		expr.callee.property.name === "update" &&
		expr.callee.object.type === "Identifier" &&
		expr.callee.object.name === "wrapper"
	)
}

export {
	findCreateWrapperCall,
	findCreateRtlWrapperCall,
	findEnzymeFind,
	isWrapperUpdateCall,
}
