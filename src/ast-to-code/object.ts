import {
	Expression,
	ObjectExpression,
	ObjectMethod,
	ObjectProperty,
} from "@babel/types"
import { expressionToString } from "./expression"
import { paramList } from "./function"
import { statementToString } from "./statement"
import { spread } from "./pattern"

function object(expression: ObjectExpression) {
	return `{${expression.properties
		.map((prop) => {
			switch (prop.type) {
				case "ObjectMethod":
					return objectMethod(prop)
				case "SpreadElement":
					return spread(prop)
				default:
					return objectProperty(prop)
			}
		})
		.join(",")}}`
}

function objectMethod(method: ObjectMethod): string {
	const methodName = expressionToString(method.key)
	const body = statementToString(method.body)
	return `${methodName}(${paramList(method.params)})${body}`
}

function objectProperty(property: ObjectProperty) {
	return `${expressionToString(property.key)}:${expressionToString(
		property.value as Expression,
	)}`
}

export { object, objectProperty }
