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
      cellCount = 25,
      solverError = 0.01,
      cells = [],
      diffusionFactor = 0.001,
      advectionSpeed = 0.001,
      velMultiplier = 0.5,
      densityInput = 1,
      muteFactor = 0.95;

let lastClick,
    lastTime, 
    flag = false,
    userInput;

const debugInterval = 4;
canvas.setAttribute('width', `${cellCount}px`);
canvas.setAttribute('height', `${cellCount}px`);


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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (userInput){
        console.log("do nothing")
    }
    handleUserInput();

    // velocity handling
    diffuse(interval, "vel");
    projectVelocity();
    advect(interval, "vel");
    projectVelocity();
    

    // density handling
    advect(interval);
    diffuse(interval, "p");
    // let dDebug = generateQuery(cells, 'd');
    // dDebug = generateQuery(cells, 'd');
    

    // drawing results
    updateCanvas();
    requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop)


function projectVelocity(){
    calcVelDivergance(cells);
    solve(pSolverFunction);
    calcPGrandient(cells);
    substractFields("vel", "pGrad");
    // const vDivDebug = generateQuery(cells, 'vDiv');
    // const pDebug = generateQuery(cells, 'p');
    // const pGradDebug = generateQuery(cells, 'pGrad', formatVel);
}

// function muteVelocities(){
//     for(let i = 0; i < cellCount; i++){
//         for(let j = 0; j < cellCount; j++){ 
//             cells[i][j].vel[0] *= muteFactor
//             cells[i][j].vel[1] *= muteFactor;
//         } 
//     }
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
    for(let i = 1; i < cellCount-1; i++){
        for(let j = 1; j < cellCount-1; j++){
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
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            field[i][j].vDiv = field[i][j + 1].vel[0] - field[i][j - 1].vel[0] +
                field[i + 1][j].vel[1] - field[i - 1][j].vel[1];   
        }   
    }
}


function calcPGrandient(field){
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            field[i][j].pGrad = [field[i][j + 1].p - field[i][j - 1].p,
                field[i + 1][j].p - field[i - 1][j].p];  
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


function diffuse(interval, attr){
    // saving data before update
    const prevData = [];
    for(let i = 0; i < cellCount; i++){
        prevData[i] = [];
        for(let j = 0; j < cellCount; j++){
            if (attr === "vel"){
                prevData[i][j][attr] = [...cells[i][j][attr]];
            }
            else{
                prevData[i][j][attr] = cells[i][j][attr];
            }
        }
    }
    const prevDebug = generateQuery(prevData, 'd'); 

    function solveDiffusion(i, j, attr){
        let sum = cells[i][j - 1].d + cells[i][j + 1].d + cells[i - 1][j].d + cells[i + 1][j].d;
        const tmp = cells[i][j].d;
        if (attr === "vel"){
            cells[i][j].vel[0] = (prevData[i][j].vel[0] + diffusionFactor * interval * sum) / (1 + 4 * diffusionFactor * interval);
            cells[i][j].vel[1] = (prevData[i][j].vel[1] + diffusionFactor * interval * sum) / (1 + 4 * diffusionFactor * interval);
        }
        else{
            cells[i][j].d = (prevData[i][j].d + diffusionFactor * interval * sum) / (1 + 4 * diffusionFactor * interval);
        }
        return Math.abs(tmp - cells[i][j].d);
    }

    solve((i, j) => solveDiffusion(i, j, attr));
    set_bnd(attr);
}


function solve(solveFunction){
    let maxError = 1;
    while (maxError > solverError){
        maxError = 0;
        for(let i = 1; i < cellCount - 1; i++){
            for(let j = 1; j < cellCount - 1; j++){
                maxError = Math.max(maxError, solveFunction(i, j));
            } 
        } 
    }
}


function advect(interval, attr){
    // saving data before update
    const prevData = [];
    for(let i = 1; i < cellCount - 1; i++){
        prevData[i] = [];
        for(let j = 1; j < cellCount - 1; j++){
            if (attr === vel){
                prevData[i][j] = {
                    vel: cells[i][j].vel
                }
            }
            else{
                prevData[i][j] = {
                    d: cells[i][j].d,
                    vel: cells[i][j].vel
                }
            }
        }
    }
    
    // updating data
    for(let y = 0; y < cellCount; y++){
        for(let x = 0; x < cellCount; x++){
            cells[y][x][attr] = getNewValue(cells[y][x], prevData, attr);
        }
    }
    set_bnd(attr);
}


function getNewValue(cell, prevData, attr){
    const prevPos = [x + 0.5 - cell.vel[0] * interval * advectionSpeed, y + 0.5 - cell.vel[1] * interval * advectionSpeed];

    let xInt = Math.floor(prevPos[0]),   
        xFloat = prevPos[0] - xInt - 0.5;              
    if (xFloat < 0){
        xInt -= 1;
        xFloat += 1;
    }
    let yInt = Math.floor(prevPos[1]),
        yFloat = prevPos[1] - yInt - 0.5;
    if (yFloat < 0){
        yInt -= 1;
        yFloat += 1;
    }

    if (attr === "vel"){
        let newVel = [0, 0]
            k = (1 - xFloat) * (1 - yFloat);                    // topLeft
        newVel[0] += prevData[yInt][xInt].vel[0] * k;
        newVel[1] += prevData[yInt][xInt].vel[1] * k;
        k = (1 - xFloat) * yFloat;                              // bottomLeft
        newVel[0] += prevData[yInt + 1][xInt].vel[0] * k;
        newVel[1] += prevData[yInt + 1][xInt].vel[1] * k;
        k = xFloat * (1 - yFloat);                              // topRight
        newVel[0] += prevData[yInt][xInt + 1].vel[0] * k;
        newVel[1] += prevData[yInt][xInt + 1].vel[1] * k;
        k = xFloat * yFloat;                                    // bottomRight
        newVel[0] += prevData[yInt + 1][xInt + 1].vel[0] * k;
        newVel[1] += prevData[yInt + 1][xInt + 1].vel[1] * k;
        return newVel;
    }
    else{
        let newD = 0;
        newD += prevData[yInt][xInt].d * (1 - xFloat) * (1 - yFloat);
        newD += prevData[yInt + 1][xInt].d * (1 - xFloat) * yFloat;
        newD += prevData[yInt][xInt + 1].d * xFloat * (1 - yFloat);
        newD += prevData[yInt + 1][xInt + 1].d * xFloat * yFloat;
        return newD;
    }
}


function set_bnd(attr){
    const N = cellCount - 1;
    for(let i = 0; i < cellCount; i++){
        if (attr === "vel"){
            cells[i][0].vel[0] = -cells[i][1].vel[0];
            cells[i][N].vel[0] = -cells[i][1][N - 1][0];
            cells[0][i].vel[1] = -cells[1][i].vel[1];
            cells[N][i].vel[1] = -cells[N - 1][i].vel[1];
        }
        else{
            cells[i][0][attr] = cells[i][1][attr];
            cells[i][N][attr] = cells[i][1][N - 1];
            cells[0][i][attr] = cells[1][i][attr];
            cells[N][i][attr] = cells[N - 1][i][attr];
        }
    }
    
    if (attr === "vel"){
        cells[0][0].vel[0] = (cells[0][1].vel[0] + cells[1][0].vel[0]) / 2;
        cells[0][0].vel[1] = (cells[0][1].vel[1] + cells[1][0].vel[1]) / 2;

        cells[0][N - 1].vel[0] = (cells[1][N - 1].vel[0] + cells[0][N - 2].vel[0]) / 2;
        cells[0][N - 1].vel[1] = (cells[1][N - 1].vel[1] + cells[0][N - 2].vel[1]) / 2;

        cells[N - 1][0].vel[0] = (cells[N - 2][0].vel[0] + cells[N - 1][1].vel[0]) / 2;
        cells[N - 1][0].vel[1] = (cells[N - 2][0].vel[1] + cells[N - 1][1].vel[1]) / 2;

        cells[N - 1][N - 1].vel[0] = (cells[N - 2][N - 1].vel[0] + cells[N - 1][N - 2].vel[0]) / 2;
        cells[N - 1][N - 1].vel[1] = (cells[N - 2][N - 1].vel[1] + cells[N - 1][N - 2].vel[1]) / 2;
    }
    else{
        cells[0][0].p = (cells[0][1].p + cells[1][0].p) / 2;
        cells[0][N - 1].p = (cells[1][N - 1].p + cells[0][N - 2].p) / 2;
        cells[N - 1][0].p = (cells[N - 2][0].p + cells[N - 1][1].p) / 2;
        cells[N - 1][N - 1].p = (cells[N - 2][N - 1].p + cells[N - 1][N - 2].p) / 2;
    }
}


function substractFields(from, what){
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            cells[i][j][from][0] -= cells[i][j][what][0];
            cells[i][j][from][1] -= cells[i][j][what][1];
        }
    }
}


// DOM elements functions
function updateCanvas(){
    for(let y = 1; y < cellCount-1; y++){
        for(let x = 1; x < cellCount-1; x++){
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
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.min(5 * alpha, 1)})`;
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