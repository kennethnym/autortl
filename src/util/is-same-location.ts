import { Node } from "@babel/types"

function isSameLocation(node1: Node, node2: Node): boolean {
	return node1.start === node2.start && node1.end === node2.end
}

export { isSameLocation }
