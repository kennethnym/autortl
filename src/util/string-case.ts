function camelToPascal(str: string) {
	return str[0].toUpperCase() + str.slice(1)
}

function pascalToCamel(str: string) {
	return str[0].toLowerCase() + str.slice(1)
}

export { camelToPascal, pascalToCamel }
