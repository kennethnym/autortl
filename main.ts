import { promises } from "fs"
import * as path from "path"
import { parse, ParseResult } from "@babel/parser"
import {
	CallExpression,
	ExpressionStatement,
	File,
	identifier,
	importDeclaration,
	importDefaultSpecifier,
	importSpecifier,
	program,
	Statement,
	stringLiteral,
} from "@babel/types"
import generate from "@babel/generator"
import { transform } from "./src/transformer/transformer"
import { camelToPascal, pascalToCamel } from "./src/util/string-case"
import { findReactComponentByName } from "./src/analyzer/jsx"
import prettier from "prettier"

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

	const { code } = generate(
		program(
			[
				...generateRtlImports(),
				...transform(testFileAst.body, targetComponent),
			],
			testFileAst.directives,
			testFileAst.sourceType,
			testFileAst.interpreter,
		),
	)

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

	const formattedCode = await formatCode(
		code,
		(await prettier.resolveConfigFile(fullTestFilePath)) ?? "",
	)

	await promises.writeFile(
		path.join(
			...fullTestFilePath.split(path.sep).slice(0, -1),
			`${pascalToCamel(targetComponentName)}.component.rtl.test.tsx`,
		),
		formattedCode,
	)
}

async function parseFile(path: string): Promise<ParseResult<File>> {
	const content = await promises.readFile(path)
	return parse(content.toString(), {
		sourceType: "module",
		plugins: ["jsx", "typescript"],
	})
}

async function formatCode(
	code: string,
	formatConfigPath: string,
): Promise<string> {
	const config = await prettier.resolveConfig(formatConfigPath)
	return prettier.format(code, config || {})
}

function generateRtlImports(): Statement[] {
	const renderResultImport = importSpecifier(
		identifier("RenderResult"),
		identifier("RenderResult"),
	)
	renderResultImport.importKind = "type"

	return [
		importDeclaration(
			[
				importSpecifier(identifier("render"), identifier("render")),
				importSpecifier(identifier("screen"), identifier("screen")),
				renderResultImport,
			],
			stringLiteral("@testing-library/react"),
		),
		importDeclaration(
			[importDefaultSpecifier(identifier("userEvent"))],
			stringLiteral("@testing-library/user-event"),
		),
		(() => {
			const imp = importDeclaration(
				[importSpecifier(identifier("UserEvent"), identifier("UserEvent"))],
				stringLiteral("@testing-library/user-event/setup/setup"),
			)
			imp.importKind = "type"
			return imp
		})(),
	]
}

main()
