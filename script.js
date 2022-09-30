// Plan:
//     1. calculate initial velocitiy field
//     2. solve for diffusion
//     3. calculate Divergance(initial velocity field)
//     4. solve for pressure
//     5. calculate pressure Grandient
//     6. from initial velocity field substract velocities created by pressure


// global variables
const canvas = document.querySelector('canvas'),
      ctx = canvas.getContext('2d'),
      color = [255, 51, 255],
      rectWidth = 1,
      rectHeight = 1,
      cellCount = 20,
      solverError = 0.01,
      cells = [],
      advectionSpeed = 0.001,
      densityInput = 1,
      velMultiplier = 1,
      diffusionFactor = 0.0000004 * cellCount * cellCount,
      divFactor = 0.5 / cellCount,
      gradFactor = divFactor * 1500,
      deltaTimeFactor = cellCount,
      muteFactor = 0.95;

    

let lastClick,
    lastTime, 
    flag = false,
    userInput;

canvas.setAttribute('width', `${cellCount - 2}px`);
canvas.setAttribute('height', `${cellCount - 2}px`);


// listeners
document.addEventListener('mousedown', (e) => {
    lastClick = getMousePos(e);
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
});


// main loop
function loop(currTime){
    if (!flag){
        lastTime = currTime;
        flag = true;
        initializeCells();
    }
    const interval = currTime - lastTime;

    resetPressure();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (userInput){
        handleUserInput();
    }

    // velocity handling
    diffuse(interval, 'vel');
    projectVelocity();
    myAdvect(interval, 'vel');
    projectVelocity();
    
    // density handling
    myAdvect(interval, 'd');
    diffuse(interval, 'd');

    // drawing results
    updateCanvas();
    requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop)


function projectVelocity(){
    calcVelDivergance(cells);
    solve(pSolverFunction);
    setBnd('p');
    calcPGrandient(cells);
    substractFields('vel', 'pGrad');
}


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
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            field[i][j].vDiv = divFactor * (field[i][j + 1].vel[0] - field[i][j - 1].vel[0] +
                field[i + 1][j].vel[1] - field[i - 1][j].vel[1]);   
        }   
    }
}


function calcPGrandient(field){
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            field[i][j].pGrad = [ gradFactor * (field[i][j + 1].p - field[i][j - 1].p),
                gradFactor * (field[i + 1][j].p - field[i - 1][j].p)];  
        }   
    }
}


function pSolverFunction(i, j){
    let newP = 0;
    newP += cells[i][j - 1].p +  cells[i][j + 1].p +  cells[i - 1][j].p +  cells[i + 1][j].p;
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
            prevData[i][j] = {};
            if (attr === 'vel'){
                prevData[i][j][attr] = [...cells[i][j][attr]];
            }
            else{
                prevData[i][j][attr] = cells[i][j][attr];
            }
        }
    }

    function solveVelDiffusion(i, j){
        const tmp = [...cells[i][j].vel];
        let xSum = cells[i][j - 1].vel[0] + cells[i][j + 1].vel[0] + cells[i - 1][j].vel[0] + cells[i + 1][j].vel[0],
            ySum = cells[i][j - 1].vel[1] + cells[i][j + 1].vel[1] + cells[i - 1][j].vel[1] + cells[i + 1][j].vel[1];
        cells[i][j].vel[0] = (prevData[i][j].vel[0] + diffusionFactor * interval * xSum) / (1 + 4 * diffusionFactor * interval);
        cells[i][j].vel[1] = (prevData[i][j].vel[1] + diffusionFactor * interval * ySum) / (1 + 4 * diffusionFactor * interval);
        return Math.abs(Math.max(tmp[0] - cells[i][j].vel[0], tmp[1] - cells[i][j].vel[1]));
    }

    function solveDensityDiffusion(i, j){
        let sum = cells[i][j - 1].d + cells[i][j + 1].d + cells[i - 1][j].d + cells[i + 1][j].d;
        const tmp = cells[i][j].d;
        cells[i][j].d = (prevData[i][j].d + diffusionFactor * interval * sum) / (1 + 4 * diffusionFactor * interval);
        return Math.abs(tmp - cells[i][j].d);
    }

    if (attr === 'vel') solve(solveVelDiffusion);
    if (attr === 'd') solve(solveDensityDiffusion);
    setBnd(attr);
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


function validatePosition(pos){
    if (pos.float < 0){
        pos.int -= 1;
        pos.float += 1;
    }
    if (pos.int < 0){
        pos.int = 0;
        pos.float = 0;
    }
    else if(pos.int > cellCount - 2){
        pos.int = cellCount - 2;
        pos.float = 1;
    }
}


function myAdvect(interval, attr){
    // saving data before update
    const currData = [];
    for(let i = 0; i < cellCount; i++){
        currData[i] = [];
        for(let j = 0; j < cellCount; j++){
            if (attr === 'vel'){
                currData[i][j] = {
                    vel: [...cells[i][j].vel]
                }
                cells[i][j].vel[0] = 0;
                cells[i][j].vel[1] = 0;
            }
            else{
                currData[i][j] = {
                    d: cells[i][j].d,
                    vel: [...cells[i][j].vel]
                }
                cells[i][j].d = 0;
            }
        }
    }
    
    for(let y = 1; y < cellCount - 1; y++){
        for(let x = 1; x < cellCount - 1; x++){
            const cell = cells[y][x];
            const newPos = [x + 0.5 + cell.vel[0] * interval * advectionSpeed, y + 0.5 + cell.vel[1] * interval * advectionSpeed];
            moveForward(attr, newPos, currData[y][x][attr]);
        }
    }
    setBnd('vel');
}


function moveForward(attr, newPos, movedVal){
    const x = {
        int: Math.floor(newPos[0])   
    }        
    x.float = newPos[0] - x.int - 0.5; 

    const y = {
        int: Math.floor(newPos[1])
    } 
    y.float = newPos[1] - y.int - 0.5; 

    validatePosition(x);
    validatePosition(y);

    if (attr === 'vel'){
        let k = (1 - x.float) * (1 - y.float);                    // topLeft
        cells[y.int][x.int].vel[0] += movedVal[0] * k;
        cells[y.int][x.int].vel[1] += movedVal[1] * k;
        k = (1 - x.float) * y.float;                              // bottomLeft
        cells[y.int + 1][x.int].vel[0] += movedVal[0] * k;
        cells[y.int + 1][x.int].vel[1] += movedVal[1] * k;
        k = x.float * (1 - y.float);                              // topRight
        cells[y.int][x.int + 1].vel[0] += movedVal[0] * k;
        cells[y.int][x.int + 1].vel[1] += movedVal[1] * k;
        k = x.float * y.float;                                    // bottomRight
        cells[y.int + 1][x.int + 1].vel[0] += movedVal[0] * k;
        cells[y.int + 1][x.int + 1].vel[1] += movedVal[1] * k;
    }
    else{
        cells[y.int][x.int].d += movedVal * (1 - x.float) * (1 - y.float);
        cells[y.int + 1][x.int].d += movedVal * (1 - x.float) * y.float;
        cells[y.int][x.int + 1].d += movedVal * x.float * (1 - y.float);
        cells[y.int + 1][x.int + 1].d += movedVal * x.float * y.float;
    }
}



function setBnd(attr){
    const N = cellCount - 1;
    for(let i = 0; i < cellCount; i++){
        if (attr === 'vel'){
            cells[i][0].vel[0] = -cells[i][1].vel[0];
            cells[i][N].vel[0] = -cells[i][N - 1].vel[0];
            cells[0][i].vel[1] = -cells[1][i].vel[1];
            cells[N][i].vel[1] = -cells[N - 1][i].vel[1];
        }
        else{
            cells[i][0][attr] = cells[i][1][attr];
            cells[i][N][attr] = cells[i][N - 1][attr];
            cells[0][i][attr] = cells[1][i][attr];
            cells[N][i][attr] = cells[N - 1][i][attr];
        }
    }

    if (attr === 'vel'){
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


function addFields(from, what){
    for(let i = 1; i < cellCount - 1; i++){
        for(let j = 1; j < cellCount - 1; j++){
            cells[i][j][from][0] += cells[i][j][what][0];
            cells[i][j][from][1] += cells[i][j][what][1];
        }
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
            drawRect(x-1, y-1, cells[y][x].d);
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
                if (objects[i][j][attr]){
                    res[i][j] = objects[i][j][attr].toFixed(2);
                }
                else{
                    res[i][j] = undefined;
                }
            }
        }    
    }
    return res;
}


function formatVel(vel){
    if (vel) return vel[0].toFixed(2) + ',' + vel[1].toFixed(2);
}
    