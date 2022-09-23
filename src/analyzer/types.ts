import {
	ArrowFunctionExpression,
	BlockStatement,
	CallExpression,
	Expression,
	Identifier,
	VariableDeclaration,
} from "@babel/types"

type FunctionCallType = "EXPECT" | "ENZYME_SIMULATE" | "ENZYME_FIND"

interface ArrowFunctionDeclaration {
	name: string
	body: BlockStatement | Expression
	declaration: VariableDeclaration
	expression: ArrowFunctionExpression
}

interface CallExpressionInfo {
	reference: Identifier | null
	methods: Map<string, CallExpression>
	expression: CallExpression
}

export type { ArrowFunctionDeclaration, CallExpressionInfo, FunctionCallType }
