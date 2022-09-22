import { promises } from "fs"
import * as path from "path"
import { parse, ParseResult } from "@babel/parser"
import {
	CallExpression,
	ExpressionStatement,
	File,
	identifier,
	importDeclaration,
	importSpecifier,
	program,
	Statement,
	stringLiteral,
} from "@babel/types"
import generate from "@babel/generator"
import { transform } from "./src/transformer/transformer"
import { camelToPascal } from "./src/util/string-case"
import { findReactComponentByName } from "./src/analyzer/jsx"

async function main() {
	const inputFile = process.argv[2]
	const fullTestFilePath = path.resolve(inputFile)
	const fullTestTargetFilePath = fullTestFilePath.replace(/\.test/, "")
	const targetComponentName = camelToPascal(
		path.basename(fullTestTargetFilePath).replace(/\.component.tsx/, ""),
	)

	const [{ program: testFileAst }, { program: testTargetAst }] =
		await Promise.all([
			parseFile(fullTestFilePath),
			parseFile(fullTestTargetFilePath),
		])

	const describeCall = testFileAst.body.find(
		(statement): statement is ExpressionStatement =>
			statement.type === "ExpressionStatement" &&
			statement.expression.type === "CallExpression" &&
			statement.expression.callee.type === "Identifier" &&
			statement.expression.callee.name === "describe",
	)?.expression as CallExpression
	if (!describeCall) return

	const targetComponent = findReactComponentByName(
		targetComponentName,
		testTargetAst,
	)
	if (!targetComponent) {
		throw new Error(`Cannot find test target ${targetComponentName}`)
	}

	console.log(
		generate(
			program(
				[
					...generateRtlImports(),
					...transform(testFileAst.body, targetComponent),
				],
				testFileAst.directives,
				testFileAst.sourceType,
				testFileAst.interpreter,
			),
		).code,
	)
}

async function parseFile(path: string): Promise<ParseResult<File>> {
	const content = await promises.readFile(path)
	return parse(content.toString(), {
		sourceType: "module",
		plugins: ["jsx", "typescript"],
	})
}

function generateRtlImports(): Statement[] {
	return [
		importDeclaration(
			[
				importSpecifier(identifier("render"), identifier("render")),
				importSpecifier(identifier("screen"), identifier("screen")),
			],
			stringLiteral("@testing-library/react"),
		),
	]
}

main()
