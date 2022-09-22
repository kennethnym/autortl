import {
	FunctionDeclaration,
	Identifier,
	Pattern,
	RestElement,
} from "@babel/types"

function functionDeclaration(statement: FunctionDeclaration): string {}

function paramList(params: (Identifier | Pattern | RestElement)[]): string {}

export { functionDeclaration, paramList }
