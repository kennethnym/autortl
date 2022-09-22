import {
	ArrowFunctionExpression,
	BlockStatement,
	Expression,
	Statement,
	TemplateLiteral,
	VariableDeclaration,
} from "@babel/types"

interface ArrowFunctionDeclaration {
	name: string
	body: BlockStatement | Expression
	declaration: VariableDeclaration
	expression: ArrowFunctionExpression
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

export { extractArrowFunctionDeclaration, templateLiteralToString }
