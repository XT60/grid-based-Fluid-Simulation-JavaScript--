const canvas = document.querySelector("canvas"),
      ctx = canvas.getContext("2d"),
      color = [255, 51, 255],
      rectWidth = 1,
      rectHeight = 1,
      rectCount = 20,
      solverError = 0.01;

const cells = []
for(let i = 0; i < rectCount; i++){
    for(let j = 0; j < rectCount; j++){ 
        cells[i][j] = {
            vel: 0,     // velocity
            div: 0,     // divergance
            d: 0        // density
        };
    } 
}

let lastClick;

document.addEventListener('mousedown', (e) => {
    lastClick = getMousePos(e);
    // console.log(`mouse clicked at ${pos}`);
});

document.addEventListener('mouseup', (e) => {
    lastClick = undefined;
    // console.log(`mouse dragged from ${lastClick} to ${getMousePos(e)}`);
});


function getMousePos(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    const y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    return [x, y];
}

function drawRect(x, y, alpha){
    ctx.beginPath();
    ctx.rect(x, y, rectWidth, rectHeight);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.fill(); 
}

function divSolverFunction(...args){
    if (args.length !== 4){
        const error = new Error("divSolverFunction: wrong number of arguments" + ` (${args.length})`);
        throw error;
    }
    validateArgs(args);
    return 
}

function solver(solveFunction){
    // initialize result array
    const result = [];
    const copy = [];
    for(let i = 0; i < rectCount; i++){
        copy[i] = 0;
    }
    for(let i = 0; i < rectCount; i++){
        result[i] = copy.slice(0);
    } 
    
    // activate solver
    minError = 10;
    while (minError < solverError){
        for(let i = 0; i < rectCount; i++){
            for(let j = 0; j < rectCount; j++){
                const tmp = result[i][j]; 
                result[i][j] = solveFunction(
                    result[j][i - 1],       // left
                    result[j][i + 1],       // right
                    result[j - 1][i],       // top
                    result[j + 1][i]        // bottom
                );
                minError = Math.max(Math.abs(tmp - result[i][j]))
            } 
        } 
    }
}

function validateArgs(args){
    for(const [i, val] of args.entries()){
        if (val === undefined) args[i] = 0;
    }
}