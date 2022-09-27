// Plan:
//     1. calculate initial velocitiy field
//     2. solve for diffusion
//     3. calculate Divergance(initial velocity field)
//     4. solve for pressure
//     5. calculate pressure Grandient
//     6. from initial velocity field substract velocities created by pressure


// global variables
const canvas = document.querySelector("canvas"),
      ctx = canvas.getContext("2d"),
      color = [255, 51, 255],
      rectWidth = 1,
      rectHeight = 1,
      cellCount = 5,
      solverError = 0.01,
      cells = [],
      diffusionFactor = 0.6,
      velMultiplier = 0.5,
      densityInput = 1;

let lastClick,
    lastTime, 
    flag = false,
    userInput;


const debugInterval = 17;

// listeners
document.addEventListener('mousedown', (e) => {
    lastClick = getMousePos(e);
    // console.log(`mouse clicked at ${pos}`);
});

document.addEventListener('mouseup', (e) => {
    const x = Math.floor(lastClick[0]),
          y = Math.floor(lastClick[1]),
          currPos = getMousePos(e),
          vel = [velMultiplier * (currPos[0] - lastClick[0]),
            velMultiplier * (currPos[1] - lastClick[1])];
    userInput = {
        x,
        y,
        vel
    };
    lastClick = undefined;
    
    console.log(userInput);
    // console.log(`mouse dragged from ${lastClick} to ${getMousePos(e)}`);

});


// main loop
function loop(currTime){
    if (!flag){
        lastTime = currTime;
        flag = true;
        initializeCells();
    }
    // const interval = currTime - lastTime;
    const interval = debugInterval;
    resetPressure();
    ctx.clearRect(0, 0, canvas.widtkh, canvas.height);
    if (userInput){
        console.log("do nothing")
    }
    handleUserInput();

    calcVelDivergance(cells);
    const vDivDebug = generateQuery(cells, 'vDiv');

    solve(pSolverFunction);
    const pDebug = generateQuery(cells, 'p');

    calcPGrandient(cells);
    const pGradDebug = generateQuery(cells, 'pGrad', formatVel);

    substractFields("vel", "pGrad");
    const velDebug = generateQuery(cells, 'vel', formatVel);
    
    updateDiffusion(interval);
    // const dDebug = generateQuery(cells, 'd', formatVel);

    updateAdvection(interval);


    updateCanvas();
    requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop)

// function updateVelocities(){

// }


// inits, resets and handlers
function initializeCells(){
    for(let i = 0; i < cellCount; i++){
        cells[i] = [];
        for(let j = 0; j < cellCount; j++){ 
            cells[i][j] = {
                vel: [0, 0],        // velocity
                p: 0,               // pressure
                d: 0,               // density
                vDiv: undefined,    // velocity divergance
                pGrad: undefined    // pressure gradient
            };
        } 
    }
}


function resetPressure(){
    for(let i = 0; i < cellCount; i++){
        for(let j = 0; j < cellCount; j++){
            cells[i][j].p = 0;
        }
    }

}


function handleUserInput(){
    if (userInput){
        const cell = cells[userInput.y][userInput.x];
        cell.vel = userInput.vel;
        cell.d = densityInput;
        userInput = undefined;
    }
}


// symulation functions
function calcVelDivergance(field){
    for(let i = 0; i < field.length; i++){
        for(let j = 0; j < field.length; j++){
            let div = 0;
            if (field[i] !== undefined && field[i][j - 1] !== undefined){           // left
                div -= field[i][j - 1].vel[0];       
            }
            if (field[i] !== undefined &&  field[i][j + 1] !== undefined){          // right
                div += field[i][j + 1].vel[0];       
            }
            if (field[i - 1] !== undefined &&  field[i - 1][j] !== undefined){       // top
                div -= field[i - 1][j].vel[1];       
            }
            if (field[i + 1] !== undefined &&  field[i + 1][j] !== undefined){      // bottom
                div += field[i + 1][j].vel[1];       
            }
            field[i][j].vDiv = div;
        }   
    }
}


function calcPGrandient(field){
    for(let i = 0; i < field.length; i++){
        for(let j = 0; j < field.length; j++){
            const grad = [0, 0];
            if (field[i] !== undefined && field[i][j - 1] !== undefined){     // left
                grad[0] -= field[i][j - 1].p;       
            }
            if (field[i] !== undefined && field[i][j + 1] !== undefined){     // right
                grad[0] += field[i][j + 1].p;       
            }
            if (field[i - 1] !== undefined && field[i - 1][j] !== undefined){     // top
                grad[1] -= field[i - 1][j].p;       
            }
            if (field[i + 1] !== undefined && field[i + 1][j] !== undefined){     // bottom
                grad[1] += field[i + 1][j].p;       
            }
            field[i][j].pGrad = grad;
        }   
    }
}


function pSolverFunction(i, j){
    let newP = 0;
    if (cells[i] !== undefined && cells[i][j - 1] !== undefined)   newP += cells[i][j - 1].p;
    if (cells[i] !== undefined && cells[i][j + 1] !== undefined)   newP += cells[i][j + 1].p;
    if (cells[i - 1] !== undefined && cells[i - 1][j] !== undefined)   newP += cells[i - 1][j].p;
    if (cells[i + 1] !== undefined && cells[i + 1][j] !== undefined)   newP += cells[i + 1][j].p;
    
    const tmp = cells[i][j].p;
    cells[i][j].p = (newP - cells[i][j].vDiv) / 4;
    return Math.abs(tmp - cells[i][j].p);
}


function updateDiffusion(interval){
    // saving data before update
    const prevData = [];
    for(let i = 0; i < cellCount; i++){
        prevData[i] = [];
        for(let j = 0; j < cellCount; j++){
            prevData[i][j] = {
                d: cells[i][j].d,
            }
        }
    }

    function diffSolverFunction(i, j){
        let sum = 0;
        if (cells[i] !== undefined && cells[i][j - 1] !== undefined)   sum += cells[i][j - 1].d;
        if (cells[i] !== undefined && cells[i][j + 1] !== undefined)   sum += cells[i][j + 1].d;
        if (cells[i - 1] !== undefined && cells[i - 1][j] !== undefined)   sum += cells[i - 1][j].d;
        if (cells[i + 1] !== undefined && cells[i + 1][j] !== undefined)   sum += cells[i + 1][j].d;
        const tmp = cells[i][j].d;
        cells[i][j].d = (prevData[i][j] + diffusionFactor * interval * sum) / (1 + 4 * diffSolverFunction * interval);
        return Math.abs(tmp - cells[i][j].d);
    }

    solve(diffSolverFunction);
}


function solve(solveFunction){
    let maxError = 1;
    while (maxError > solverError){
        maxError = 0;
        for(let i = 0; i < cellCount; i++){
            for(let j = 0; j < cellCount; j++){
                maxError = Math.max(maxError, solveFunction(i, j));
            } 
        } 
    }
}


function updateAdvection(interval){
    // saving data before update
    const prevData = [];
    for(let i = 0; i < cellCount; i++){
        prevData[i] = [];
        for(let j = 0; j < cellCount; j++){
            prevData[i][j] = {
                d: cells[i][j].d,
                vel: cells[i][j].vel
            }
        }
    }
    
    // updating data
    for(let y = 0; y < cellCount; y++){
        for(let x = 0; x < cellCount; x++){
            const data = prevData[y][x],
                  prevPos = [x + 0.5 - data.vel[0] * interval, y + 0.5 - data.vel[1] * interval];
            advectData(cells[y][x], prevData, prevPos);
        }
    }
}


function advectData(cell, prevData, prevPos){
    const newVel = [0, 0];
    let newD = 0;
    
    // geting positions: cell (fx, fy) and relative to cell middlepoints (dx, dy) 
    let fx = Math.floor(prevPos[0]),   
        dx = prevPos[0] - fx - 0.5;              
    if(dx < 0){
        fx -= 1;
        dx += 1;
    }
    let fy = Math.floor(prevPos[1]),
        dy = prevPos[1] - fy - 0.5;
    if(dy < 0){
        fy -= 1;
        dy += 1;
    }

    // calculating newValues depedning on prevPos
    if (prevData[fy] !== undefined && prevData[fy][fx] !== undefined){            // topLeft
        const k = (1 - dx) * (1 - dy);
        newD += prevData[fy][fx].d * k;
        newVel[0] += prevData[fy][fx].vel[0] * k;
        newVel[1] += prevData[fy][fx].vel[1] * k;
    }
    if (prevData[fy + 1] !== undefined && prevData[fy + 1][fx] !== undefined){        // bottomLeft
        const k = (1 - dx) * dy;
        newD += prevData[fy + 1][fx].d * k;
        newVel[0] += prevData[fy + 1][fx].vel[0] * k;
        newVel[1] += prevData[fy + 1][fx].vel[1] * k;
    }
    if (prevData[fy] !== undefined && prevData[fy][fx + 1] !== undefined){        // topRight
        const k = dx * (1 - dy);
        newD += prevData[fy][fx + 1].d * k;
        newVel[0] += prevData[fy][fx + 1].vel[0] * k;
        newVel[1] += prevData[fy][fx + 1].vel[1] * k;
    }
    if (prevData[fy + 1] !== undefined && prevData[fy + 1][fx + 1] !== undefined){    // bottomRight
        const k = dx * dy;
        newD += prevData[fy + 1][fx + 1].d * k;
        newVel[0] += prevData[fy + 1][fx + 1].vel[0] * k;
        newVel[1] += prevData[fy + 1][fx + 1].vel[1] * k;
    }
    
    // updating cell
    cell.vel = newVel;
    cell.d = newD;
}


function substractFields(from, what){
    for(let i = 0; i < cellCount; i++){
        for(let j = 0; j < cellCount; j++){
            cells[i][j][from][0] -= cells[i][j][what][0];
            cells[i][j][from][1] -= cells[i][j][what][1];
        }
    }
}


// DOM elements functions
function updateCanvas(){
    for(let y = 0; y < cellCount; y++){
        for(let x = 0; x < cellCount; x++){
            drawRect(x, y, cells[y][x].d);
        }   
    }
}


function getMousePos(e){
    const rect = canvas.getBoundingClientRect(),
          x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
          y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    return [x, y];
}


function drawRect(x, y, alpha){
    ctx.beginPath();
    ctx.rect(x, y, rectWidth, rectHeight);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.fill(); 
}


// debug
function generateQuery(objects, attr, formatFunc){
    const res = [];
    for(let i = 0; i < objects.length; i++){
        res[i] = [];
        for(let j = 0; j < objects.length; j++){
            if (formatFunc){
                res[i][j] = formatFunc(objects[i][j][attr]);
            }
            else{
                res[i][j] = objects[i][j][attr];
            }
        }    
    }
    return res;
}


function formatVel(vel){
    return `${vel[0]},${vel[1]}`;
}