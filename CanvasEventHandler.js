var bMouseDown = false;
var handleMouseMove;
var previousX=-1;
var previousY=-1;
var MODE = "ROTATE";

function onMouseDown(evt){
    previousX=evt.layerX||evt.offsetX;
    previousY=evt.layerY||evt.offsetY;
    bMouseDown = true;
    handleMouseMove = dojo.connect(dojo.byId("canvasId"),"onmousemove","onMouseMove");
}

function onMouseMove(evt){
    var currentX=evt.layerX||evt.offsetX;
    var currentY=evt.layerY||evt.offsetY;
    if(MODE == "PAN"){
        if(bMouseDown){
            onPanMouseMove(currentX,currentY);
        }
    }
    else if(MODE == "ROTATE"){
        if(bMouseDown){
            onRotateMouseMove(currentX,currentY);
        }
    }

    previousX = currentX;
    previousY = currentY;
}

function onRotateMouseMove(currentX,currentY){
    if(previousX > 0 && previousY > 0){
        var changeX = currentX - previousX;
        var changeY = currentY - previousY;
        var horCameraAngle = World.canvas.width / World.canvas.height * camera.fov;
        var changeHorAngle = changeX / World.canvas.width * horCameraAngle;
        var changeVerAngle = changeY / World.canvas.height * camera.fov;

		camera.worldRotateY(-changeHorAngle*Math.PI/180);
		
        var lightDir = camera.getLightDirection();
		//if(Math.abs(lightDir.z)>0.01){
			var plumbVector = getPlumbVector(lightDir,false);
			camera.worldRotateByVector(-changeVerAngle*Math.PI/180,plumbVector);			
		//}
    }
}

function onPanMouseMove(currentX,currentY){
    var position = camera.getPosition();
    var target = camera.getTarget();

    //左右平移
    if(currentX != previousX){
        var bLeft = currentX < previousX ? true:false;
        var plumbVector	= getPlumbVector(camera.getLightDirection(), bLeft);
        position.x += plumbVector.x;
        position.z += plumbVector.z;
        target.x += plumbVector.x;
        target.z += plumbVector.z;
    }

    //前后平移
    if(currentY != previousY){
        var bForward = currentY < previousY ? true:false;
        var forwardVector = getForwardVector(camera.getLightDirection(), bForward);
        position.x += forwardVector.x;
        position.y += forwardVector.y;
        position.z += forwardVector.z;
        target.x += forwardVector.x;
        target.y += forwardVector.y;
        target.z += forwardVector.z;
    }

    camera.look(position,target);
}

function onMouseWheel(evt){
    var scale = 0.0;

    if (evt.wheelDelta ){
        if(evt.wheelDelta > 0){
            scale = 0.9;
        }
        else if(evt.wheelDelta < 0){
            scale = 1.1;
        }
    }
    else if(evt.detail){
        if(evt.detail < 0){
            scale = 0.9;
        }
        else if(evt.detail > 0){
            scale = 1.1;
        }
    }

    var distance = camera.getViewFrustumDistance();
    camera.setViewFrustumDistance(distance*scale,true);
}

function onMouseUp(evt){
    bMouseDown = false;
    dojo.disconnect(handleMouseMove);
    previousX = -1;
    previousY = -1;
}

function getPlumbVector(direction,bLeft){
    direction.y = 0;
    direction.normalize();
    var plumbVector = new World.Vector(-direction.z,0,direction.x);
    plumbVector.normalize();

    /*var K = direction.z / direction.x;

    if (bLeft) {
        if (plumbVector.z < K * plumbVector.x){
            plumbVector.x *= -1;
            plumbVector.z *= -1;
        }
    }
    else {
        if (plumbVector.z > K * plumbVector.x) {
            plumbVector.x *= -1;
            plumbVector.z *= -1;
        }
    }*/

    return plumbVector;
}

function getForwardVector(direction,bForward){
    direction.y = 0;
    direction.normalize();

    if (bForward){
        direction.x *= -1;
        direction.z *= -1;
    }

    return direction;
}