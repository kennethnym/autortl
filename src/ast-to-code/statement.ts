import { ImportDeclaration, ImportSpecifier, Statement } from "@babel/types"
import { expressionToString } from "./expression"
import { isSameLocation } from "../util/is-same-location"

function statementToString(statement: Statement): string {
	switch (statement.type) {
		case "BlockStatement":
			return `{${statement.body.map(statementToString).join(";")}`

		case "BreakStatement":
			return "break;"

		case "DebuggerStatement":
			return "debugger;"

		case "ContinueStatement":
			return "continue;"

		case "IfStatement":
			const cond = expressionToString(statement.test)
			const then = statementToString(statement.consequent)
			const else_ = statement.alternate
				? `else ${statementToString(statement.alternate)}`
				: ""
			return `if(${cond})${then}${else_}`

		case "ExpressionStatement":
			return `${expressionToString(statement.expression)};`

		case "ImportDeclaration":
			return importStatement(statement)

		case "FunctionDeclaration":
			return
	}
}

function importStatement(statement: ImportDeclaration): string {
	if (statement.specifiers.length === 0) {
		return `import ${expressionToString(statement.source)};`
	}

	const firstImportSpecifier = statement.specifiers[0]
	const defaultImport =
		firstImportSpecifier.type === "ImportDefaultSpecifier"
			? expressionToString(firstImportSpecifier.local)
			: null
	const namedImports = `{${statement.specifiers
		.filter(
			(member): member is ImportSpecifier => member.type === "ImportSpecifier",
		)
		.map((member) => {
			const hasAlias = isSameLocation(member.imported, member.local)
			return `${expressionToString(member.imported)}${
				hasAlias ? ` as ${expressionToString(member.local)}` : ""
			}`
		})
		.join(",")}}`
	const hasNamedImports = namedImports.length > 0

	return `import ${defaultImport ?? ""}${
		hasNamedImports ? "," : ""
	}${namedImports} from ${expressionToString(statement.source)}`
}

export { statementToString }
