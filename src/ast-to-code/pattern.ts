import { ArrayPattern, Pattern, RestElement, SpreadElement } from "@babel/types"
import { expressionToString } from "./expression"

function spread(element: SpreadElement): string {
	return `...${expressionToString(element.argument)}`
}

function rest(element: RestElement): string {
	return `...${expressionToString(element.argument)}`
}

function patternToString(pattern: Pattern): string {
	switch (pattern.type) {
		case "ArrayPattern":
			return arrayDestructure(pattern)

		default:
			throw new Error(`Unsupported pattern type ${pattern.type}`)
	}
}

function arrayDestructure(pattern: ArrayPattern): string {
	const elements = pattern.elements.map((elem) => {
		if (!elem) return ""
		switch (elem.type) {
			case "Identifier":
				return expressionToString(elem)
			case "RestElement":
				return
		}
	})
}

export { spread }
