const ast = {};
ast.length = 4;
var nodes = new Array(ast.length);
var copy = new Array(ast.length);
for (var i = 0; i < ast.length; i++) {
    copy[i] = 0;
}

for (var i=0; i < nodes.length; i++){
    nodes[i] = copy.slice(0);
}

nodes[0][0] = 1;
console.log(nodes);
