function advect(interval, attr){
    // saving data before update
    const prevData = [];
    for(let i = 0; i < cellCount; i++){
        prevData[i] = [];
        for(let j = 0; j < cellCount; j++){
            if (attr === 'vel'){
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
    interval *= deltaTimeFactor;
    for(let y = 0; y < cellCount; y++){
        for(let x = 0; x < cellCount; x++){
            const cell = cells[y][x]; 
            const prevPos = [x + 0.5 - cell.vel[0] * interval * advectionSpeed, y + 0.5 - cell.vel[1] * interval * advectionSpeed];
            if (x == 2 && y == 2){
                console.log("lol")
            }
            cell[attr] = getNewValue(prevData, attr, prevPos);
        }
    }
    setBnd(attr);
}


function getNewValue(prevData, attr, prevPos){
    const x = {
        int: Math.floor(prevPos[0])   
    }        
    x.float = prevPos[0] - x.int - 0.5; 

    const y = {
        int: Math.floor(prevPos[1])
    } 
    y.float = prevPos[1] - y.int - 0.5; 

    validatePosition(x);
    validatePosition(y);

    if (attr === 'vel'){
        let newVel = [0, 0],
            k = (1 - x.float) * (1 - y.float);                    // topLeft
        if (prevData[y.int] === undefined){
            console.log('debug1');
        }
        newVel[0] += prevData[y.int][x.int].vel[0] * k;
        newVel[1] += prevData[y.int][x.int].vel[1] * k;
        k = (1 - x.float) * y.float;                              // bottomLeft
        newVel[0] += prevData[y.int + 1][x.int].vel[0] * k;
        newVel[1] += prevData[y.int + 1][x.int].vel[1] * k;
        k = x.float * (1 - y.float);                              // topRight
        newVel[0] += prevData[y.int][x.int + 1].vel[0] * k;
        newVel[1] += prevData[y.int][x.int + 1].vel[1] * k;
        k = x.float * y.float;                                    // bottomRight
        newVel[0] += prevData[y.int + 1][x.int + 1].vel[0] * k;
        newVel[1] += prevData[y.int + 1][x.int + 1].vel[1] * k;
        return newVel;
    }
    else{
        let newD = 0;
        newD += prevData[y.int][x.int].d * (1 - x.float) * (1 - y.float);
        newD += prevData[y.int + 1][x.int].d * (1 - x.float) * y.float;
        newD += prevData[y.int][x.int + 1].d * x.float * (1 - y.float);
        newD += prevData[y.int + 1][x.int + 1].d * x.float * y.float;
        return newD;
    }
}