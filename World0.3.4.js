/*
Author:孙群
Email：sunqun1989@126.com
Version:0.3.4
* */
window.gl = null;
 ////////////////////////////////////////////////////////////////////////////////////
 World = {
     gl :  null,
     canvas : null,
     aPositionLocation : -1,
     aTextureCoordLocation : -1,
     aVertexNormalLocation : -1,
     uModelViewLocation : -1,
     uProjLocation : -1,
     uNormalMatrixLocation : -1,
	 uUseAmbientLightLocation : -1,
	 uUseParallelLlightLocation : -1,
     uAmbientColorLocation : -1,
     uLightDirectionLocation : -1,
     uDirectionalColorLocation : -1,
     uSamplerLocation : -1,
     vertexPositionBuffer : null,
	 vertexNormalBuffer : null,
     textureCoordBuffer : null,
     shaderProgram : null,
     idCounter : 0,
     bUseAmbientLight : false,
     bUseParallelLight : false
 };
World.enableAmbientLight = function(r,g,b){
    gl.uniform1i(World.uUseAmbientLightLocation, true);
    gl.uniform3f(World.uAmbientColorLocation,r||0.2,g||0.2,b||0.2);//默认环境光是(0.2,0.2,0.2)
    World.bUseAmbientLight = true;
};

World.disableAmbientLight = function(){
    gl.uniform1i(World.uUseAmbientLightLocation, false);
    World.bUseAmbientLight = false;
};

World.enableParallelLlight = function(/*World.Vector*/ direction,/*World.Vertice*/ color){
    gl.uniform1i(World.uUseParallelLlightLocation, true);
    direction.normalize();
    gl.uniform3f(World.uLightDirectionLocation,direction.x,direction.y,direction.z);
    gl.uniform3f(World.uDirectionalColorLocation,color.x,color.y,color.z);
    World.bUseParallelLight = true;
};

World.disableParallelLlight = function(direction,color){
    gl.uniform1i(World.uUseParallelLlightLocation, false);
    World.bUseParallelLight = false;
};
/////////////////////////////////////////////////////////////////////////////////////
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || window.oRequestAnimationFrame
    || function(callback) {
    setTimeout(callback, 1000 / 60);
};
/////////////////////////////////////////////////////////////////////////////////////
World.WebGLRenderer = function(canvas,vertexShaderText,fragmentShaderText){
    window.renderer = this;//之所以在此处设置window.renderer是因为要在tick函数中使用
    this.scene = null;
    this.camera = null;
    this.bAutoRefresh = false;


    function initWebGL(canvas){
        try{
            var contextList = ["webgl","experimental-webgl"];

            for(var i=0;i<contextList.length;i++){
                window.gl = canvas.getContext(contextList[i],{antialias:true});
                if(window.gl){
                    World.gl = window.gl;
                    World.canvas = canvas;
                    break;
                }
            }
        }
        catch(e){

        }
    }

    function getShader(gl,shaderType,shaderText){
        if(!shaderText)
            return null;

        var shader = null;
        if(shaderType=="VERTEX_SHADER"){
            shader = gl.createShader(gl.VERTEX_SHADER);
        }
        else if(shaderType=="FRAGMENT_SHADER"){
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        }
        else{
            return null;
        }

        gl.shaderSource(shader,shaderText);
        gl.compileShader(shader);

        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
            alert(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function initShaders(vertexShaderText,fragmentShaderText){
        var vertexShader = getShader(World.gl,"VERTEX_SHADER",vertexShaderText);
        var fragmentShader = getShader(World.gl,"FRAGMENT_SHADER",fragmentShaderText);

        World.shaderProgram = gl.createProgram();
        gl.attachShader(World.shaderProgram,vertexShader);
        gl.attachShader(World.shaderProgram,fragmentShader);
        gl.linkProgram(World.shaderProgram);

        if(!gl.getProgramParameter(World.shaderProgram,gl.LINK_STATUS)){
            alert("Could not link program");
            gl.deleteProgram(World.shaderProgram);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return;
        }

        gl.useProgram(World.shaderProgram);

        World.aPositionLocation = gl.getAttribLocation(World.shaderProgram,"aPosition");
        gl.enableVertexAttribArray(World.aPositionLocation);

		World.aVertexNormalLocation = gl.getAttribLocation(World.shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(World.aVertexNormalLocation);

        World.aTextureCoordLocation = gl.getAttribLocation(World.shaderProgram,"aTextureCoord");
        gl.enableVertexAttribArray(World.aTextureCoordLocation);

        World.uModelViewLocation = gl.getUniformLocation(World.shaderProgram,"uModelView");
        World.uProjLocation = gl.getUniformLocation(World.shaderProgram,"uProj");
        World.uSamplerLocation = gl.getUniformLocation(World.shaderProgram,"uSampler");

        World.uNormalMatrixLocation = gl.getUniformLocation(World.shaderProgram,"uNormalMatrix");
        World.uUseAmbientLightLocation = gl.getUniformLocation(World.shaderProgram,"uUseAmbientLight");
        World.uUseParallelLlightLocation = gl.getUniformLocation(World.shaderProgram,"uUseParallelLlight");
        World.uAmbientColorLocation = gl.getUniformLocation(World.shaderProgram,"uAmbientColor");
        World.uLightDirectionLocation = gl.getUniformLocation(World.shaderProgram,"uLightDirection");
        World.uDirectionalColorLocation = gl.getUniformLocation(World.shaderProgram,"uDirectionalColor");

        //设置默认值
        var squareArray = [1,0,0,0,
                           0,1,0,0,
                           0,0,1,0,
                           0,0,0,1];
        var squareMatrix = new Float32Array(squareArray);
        gl.uniformMatrix4fv(World.uNormalMatrixLocation,false,squareMatrix);
        gl.uniform1i(World.uUseAmbientLightLocation, false);
        gl.uniform1i(World.uUseParallelLlightLocation, false);
        gl.uniform3f(World.uAmbientColorLocation,0.2,0.2,0.2);//默认环境光是(0.2,0.2,0.2)
    }

    function initBuffers(){
        World.vertexPositionBuffer = gl.createBuffer();
        World.textureCoordBuffer = gl.createBuffer();
		World.vertexNormalBuffer = gl.createBuffer();
    }

    initWebGL(canvas);

    if(!window.gl){
        alert("浏览器不支持WebGL!");
        return;
    }

    initShaders(vertexShaderText,fragmentShaderText);

    initBuffers();

    gl.clearColor(0.9,0.9,0.9,1.0);
	gl.clearDepth(1);
	gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
	
	//gl.depthMask(false);
	gl.enable(gl.CULL_FACE);//一定要启用裁剪，否则显示不出立体感
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);//裁剪掉背面*/
};

World.WebGLRenderer.prototype = {
    constructor:World.WebGLRenderer,

    render:function(scene,camera){
        gl.viewport(0,0,World.canvas.width,World.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		
        for(var i=0;i<scene.objectList.length;i++){
            var obj = scene.objectList[i];
            if(obj){
                obj.draw(camera);
            }
        }
    },

    bindScene : function(scene){
        this.scene = scene;
    },

    bindCamera : function(camera){
        this.camera = camera;
    },

    tick : function(){
        //注意tick方法的运行环境是window，也就是是说在tick函数内this代表的不是WebGLRenderer，而是window
        var renderer = window.renderer;
        if(renderer.scene && renderer.camera){
            renderer.render(renderer.scene, renderer.camera);
        }

        if(renderer.bAutoRefresh){
            window.requestAnimationFrame(renderer.tick);
        }
    },

    setIfAutoRefresh : function(bAuto){
        this.bAutoRefresh = bAuto;
        if(this.bAutoRefresh){
            this.tick();
        }
    }

};
/////////////////////////////////////////////////////////////////////////////////////
World.Scene = function(){
    this.objectList = [];
};

World.Scene.prototype = {
    constructor:World.Scene,

    findObjById:function(objId){
        for(var i = 0;i<this.objectList.length;i++){
            var obj = this.objectList[i];
            if(obj.id == objId){
                obj.index = i;
                return obj;
            }
        }
        return null;
    },

    add:function(obj){
        if(this.findObjById(obj.id) != null){
            alert("obj已经存在于Scene中，无法将其再次加入！");
            return;
        }
        this.objectList.push(obj);
        obj.scene = this;
    },

    remove:function(obj){
		if(obj){
			var result = this.findObjById(obj.id);
			if(result == null){
				alert("obj不存在于Scene中，所以无法将其从中删除！");
				return;
			}
			obj.scene = null;
			this.objectList.splice(result.index,1);
		}        
        obj = null;
    },

    clear:function(){
        this.objectList = [];
    }
};
/////////////////////////////////////////////////////////////////////////////////////
World.isZero = function(value){
	if(Math.abs(value) < 0.000001){
		return true;
	}
	else{
		return false;
	}
};
//////////////////////////////////////////////////////////////////////////////////////
World.Vertice = function(x,y,z){
	this.x = x||0;
	this.y = y||0;
	this.z = z||0;
};

//////////////////////////////////////////////////////////////////////////////////////
World.Vector = function(x,y,z){
	this.x = x||0;
	this.y = y||0;
	this.z = z||0;
};

World.Vector.prototype = {
	constructor:World.Vector,

    getLength:function(){
        return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
    },

    normalize:function(){
        var length = this.getLength();
        if(!World.isZero(length)){
            this.x /= length;
            this.y /= length;
            this.z /= length;
        }
        else{
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }

        return this;
    },

    setLength:function(length){
        this.normalize();
        this.x *= length;
        this.y *= length;
        this.z *= length;
    },

	cross:function(other){
		var x = this.y * other.z - this.z * other.y;
		var y = this.z * other.x - this.x * other.z;
		var z = this.x * other.y - this.y * other.x;
		return new World.Vector(x,y,z);
	},

    dot:function(other){
        var result = this.x*other.x+this.y*other.y+this.z*other.z;
        return result;
    }
};
//////////////////////////////////////////////////////////////////////////////////////
World.Matrix = function(m11,m12,m13,m14,m21,m22,m23,m24,m31,m32,m33,m34,m41,m42,m43,m44){
	this.elements = new Float32Array(16);

	/*this.setElements(
		m11||1, m12||0, m13||0, m14||0,
		m21||0, m22||1, m23||0, m24||0,
		m31||0, m32||0, m33||1, m34||0,
		m41||0, m42||0, m43||0, m44||1
	);大Bug，当m11为0时，会自动将m11||1的值计算为1，应该是0*/
	
	this.setElements(
		(m11== undefined ?1:m11),(m12== undefined ?0:m12),(m13== undefined ?0:m13),(m14== undefined ?0:m14),
		(m21== undefined ?0:m21),(m22== undefined ?1:m22),(m23== undefined ?0:m23),(m24== undefined ?0:m24),
		(m31== undefined ?0:m31),(m32== undefined ?0:m32),(m33== undefined ?1:m33),(m34== undefined ?0:m34),
		(m41== undefined ?0:m41),(m42== undefined ?0:m42),(m43== undefined ?0:m43),(m44== undefined ?1:m44)
	);
};

World.Matrix.prototype = {
	constructor:World.Matrix,

	setElements:function(m11,m12,m13,m14,m21,m22,m23,m24,m31,m32,m33,m34,m41,m42,m43,m44){
		var values = this.elements;
		values[0]=m11;values[4]=m12;values[8]=m13;values[12]=m14;
		values[1]=m21;values[5]=m22;values[9]=m23;values[13]=m24;
		values[2]=m31;values[6]=m32;values[10]=m33;values[14]=m34;
		values[3]=m41;values[7]=m42;values[11]=m43;values[15]=m44;
	},

	setColumnX:function(x,y,z){
		this.elements[0] = x;
		this.elements[1] = y;
		this.elements[2] = z;
	},

	getColumnX:function(){
		return new World.Vertice(this.elements[0],this.elements[1],this.elements[2]);
	},

	setColumnY:function(x,y,z){
		this.elements[4] = x;
		this.elements[5] = y;
		this.elements[6] = z;
	},

	getColumnY:function(){
		return new World.Vertice(this.elements[4],this.elements[5],this.elements[6]);
	},

	setColumnZ:function(x,y,z){
		this.elements[8] = x;
		this.elements[9] = y;
		this.elements[10] = z;
	},

	getColumnZ:function(){
		return new World.Vertice(this.elements[8],this.elements[9],this.elements[10]);
	},

	setColumnTrans:function(x,y,z){
		this.elements[12] = x;
		this.elements[13] = y;
		this.elements[14] = z;
	},

	getColumnTrans:function(){
		return new World.Vertice(this.elements[12],this.elements[13],this.elements[14]);
	},

	setLastRowDefault:function(){
		this.elements[3]=0;
		this.elements[7]=0;
		this.elements[11]=0;
		this.elements[15]=1;
	},

	transpose:function(){
		var result = new World.Matrix();
		result.elements[0]=this.elements[0];
		result.elements[4]=this.elements[1];
		result.elements[8]=this.elements[2];
		result.elements[12]=this.elements[3];

		result.elements[1]=this.elements[4];
		result.elements[5]=this.elements[5];
		result.elements[9]=this.elements[6];
		result.elements[13]=this.elements[7];

		result.elements[2]=this.elements[8];
		result.elements[6]=this.elements[9];
		result.elements[10]=this.elements[10];
		result.elements[14]=this.elements[11];

		result.elements[3]=this.elements[12];
		result.elements[7]=this.elements[13];
		result.elements[11]=this.elements[14];
		result.elements[15]=this.elements[15];

		this.setMatrixByOther(result);
	},

	setMatrixByOther:function(otherMatrix){
		for(var i=0;i<otherMatrix.elements.length;i++){
			this.elements[i]=otherMatrix.elements[i];
		}
	},

	setSquareMatrix:function(){
		this.setElements(1,0,0,0,
						 0,1,0,0,
						 0,0,1,0,
						 0,0,0,1);
	},

	copy:function(){
		var clone = new World.Matrix(this.elements[0],this.elements[4],this.elements[8],this.elements[12],
							   this.elements[1],this.elements[5],this.elements[9],this.elements[13],
							   this.elements[2],this.elements[6],this.elements[10],this.elements[14],
							   this.elements[3],this.elements[7],this.elements[11],this.elements[15]);
		return clone;
	},

	multiply:function(otherMatrix){
		var values1 = this.elements;
		var values2 = otherMatrix.elements;
		var m11 = values1[0]*values2[0]+values1[4]*values2[1]+values1[8]*values2[2]+values1[12]*values2[3];
		var m12 = values1[0]*values2[4]+values1[4]*values2[5]+values1[8]*values2[6]+values1[12]*values2[7];
		var m13 = values1[0]*values2[8]+values1[4]*values2[9]+values1[8]*values2[10]+values1[12]*values2[11];
		var m14 = values1[0]*values2[12]+values1[4]*values2[13]+values1[8]*values2[14]+values1[12]*values2[15];
		var m21 = values1[1]*values2[0]+values1[5]*values2[1]+values1[9]*values2[2]+values1[13]*values2[3];
		var m22 = values1[1]*values2[4]+values1[5]*values2[5]+values1[9]*values2[6]+values1[13]*values2[7];
		var m23 = values1[1]*values2[8]+values1[5]*values2[9]+values1[9]*values2[10]+values1[13]*values2[11];
		var m24 = values1[1]*values2[12]+values1[5]*values2[13]+values1[9]*values2[14]+values1[13]*values2[15];
		var m31 = values1[2]*values2[0]+values1[6]*values2[1]+values1[10]*values2[2]+values1[14]*values2[3];
		var m32 = values1[2]*values2[4]+values1[6]*values2[5]+values1[10]*values2[6]+values1[14]*values2[7];
		var m33 = values1[2]*values2[8]+values1[6]*values2[9]+values1[10]*values2[10]+values1[14]*values2[11];
		var m34 = values1[2]*values2[12]+values1[6]*values2[13]+values1[10]*values2[14]+values1[14]*values2[15];
		var m41 = values1[3]*values2[0]+values1[7]*values2[1]+values1[11]*values2[2]+values1[15]*values2[3];
		var m42 = values1[3]*values2[4]+values1[7]*values2[5]+values1[11]*values2[6]+values1[15]*values2[7];
		var m43 = values1[3]*values2[8]+values1[7]*values2[9]+values1[11]*values2[10]+values1[15]*values2[11];
		var m44 = values1[3]*values2[12]+values1[7]*values2[13]+values1[11]*values2[14]+values1[15]*values2[15];

		return new World.Matrix(m11,m12,m13,m14,m21,m22,m23,m24,m31,m32,m33,m34,m41,m42,m43,m44);
	},

	checkZero:function(){
		for(var i = 0;i < this.elements.length;i++){
			if(World.isZero(this.elements[i])){
				this.elements[i] = 0;
			}
		}
	},

	worldTranslate:function(x,y,z){
		this.elements[12] += x;
		this.elements[13] += y;
		this.elements[14] += z;
	},

	worldRotateX:function(radian){
		var c = Math.cos(radian);
		var s = Math.sin(radian);
		var m = new World.Matrix(1,0,0,0,
						   0,c,-s,0,
						   0,s,c,0,
						   0,0,0,1);
		var result = m.multiply(this);
		result.checkZero();
		this.setMatrixByOther(result);
	},

	worldRotateY:function(radian){
		var c = Math.cos(radian);
		var s = Math.sin(radian);
		var m = new World.Matrix(c,0,s,0,
						   0,1,0,0,
						   -s,0,c,0,
						   0,0,0,1);
	    var result = m.multiply(this);
		result.checkZero();
		this.setMatrixByOther(result);
	},

	worldRotateZ:function(radian){
		var c = Math.cos(radian);
		var s = Math.sin(radian);
		var m = new World.Matrix(c,-s,0,0,
						   s,c,0,0,
						   0,0,1,0,
						   0,0,0,1);
	    var result = m.multiply(this);
		result.checkZero();
		this.setMatrixByOther(result);
	},

	worldRotateByVector:function(radian,vector){
		var x = vector.x;
		var y = vector.y;
		var z = vector.z;

		var length, s, c;
		var xx, yy, zz, xy, yz, zx, xs, ys, zs, one_c;

		s = Math.sin(radian);
		c = Math.cos(radian);

		length = Math.sqrt( x*x + y*y + z*z );

		// Rotation matrix is normalized
		x /= length;
		y /= length;
		z /= length;

		xx = x * x;
		yy = y * y;
		zz = z * z;
		xy = x * y;
		yz = y * z;
		zx = z * x;
		xs = x * s;
		ys = y * s;
		zs = z * s;
		one_c = 1.0 - c;

		var m11 = (one_c * xx) + c;//M(0,0)
		var m12 = (one_c * xy) - zs;//M(0,1)
		var m13 = (one_c * zx) + ys;//M(0,2)
		var m14 = 0.0;//M(0,3) 表示平移X

		var m21 = (one_c * xy) + zs;//M(1,0)
		var m22 = (one_c * yy) + c;//M(1,1)
		var m23 = (one_c * yz) - xs;//M(1,2)
		var m24 = 0.0;//M(1,3)  表示平移Y

		var m31 = (one_c * zx) - ys;//M(2,0)
		var m32 = (one_c * yz) + xs;//M(2,1)
		var m33 = (one_c * zz) + c;//M(2,2)
		var m34 = 0.0;//M(2,3)  表示平移Z

		var m41 = 0.0;//M(3,0)
		var m42 = 0.0;//M(3,1)
		var m43 = 0.0;//M(3,2)
		var m44 = 1.0;//M(3,3)

		var mat = new World.Matrix(m11,m12,m13,m14,
								m21,m22,m23,m24,
								m31,m32,m33,m34,
								m41,m42,m43,m44);

		var result = mat.multiply(this);
		result.checkZero();
		this.setMatrixByOther(result);
	},

	localRotateX:function(radian){
		var transX = this.elements[12];
		var transY = this.elements[13];
		var transZ = this.elements[14];

		this.worldTranslate(-transX,-transY,-transZ);
		var columnX = this.getColumnX();
		this.worldRotateByVector(radian,columnX);
		this.worldTranslate(transX,transY,transZ);
	},

	localRotateY:function(radian){
		var transX = this.elements[12];
		var transY = this.elements[13];
		var transZ = this.elements[14];

		this.worldTranslate(-transX,-transY,-transZ);
		var columnY = this.getColumnY();
		this.worldRotateByVector(radian,columnY);
		this.worldTranslate(transX,transY,transZ);
	},

	localRotateZ:function(radian){
		var transX = this.elements[12];
		var transY = this.elements[13];
		var transZ = this.elements[14];

		this.worldTranslate(-transX,-transY,-transZ);
		var columnZ = this.getColumnZ();
		this.worldRotateByVector(radian,columnZ);
		this.worldTranslate(transX,transY,transZ);
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////
World.Object3D = function(x,y,z){
	this.matrix = new World.Matrix();
    this.setPosition(x||0,y||0,z||0);
    this.id = ++World.idCounter;
};
World.Object3D.prototype = {
	constructor:World.Object3D,

    scene:null,

    baseDraw:function(camera){
		gl.uniformMatrix4fv(World.uModelViewLocation,false,camera.getViewMatrix().multiply(this.matrix).elements);
        gl.uniformMatrix4fv(World.uProjLocation,false,camera.projMatrix.elements);
		var squareMatrix = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
		gl.uniformMatrix4fv(World.uNormalMatrixLocation,false,squareMatrix);
    },

    getPosition:function(){
        var position = this.matrix.getColumnTrans();
        return position;
    },

    setPosition:function(x,y,z){
        this.matrix.setColumnTrans(x,y,z);
    },

	worldTranslate:function(x,y,z){
		this.matrix.worldTranslate(x,y,z);
	},

	worldRotateX:function(radian){
		this.matrix.worldRotateX(radian);
	},

	worldRotateY:function(radian){
		this.matrix.worldRotateY(radian);
	},

	worldRotateZ:function(radian){
		this.matrix.worldRotateZ(radian);
	},

	worldRotateByVector:function(radian,vector){
		this.matrix.worldRotateByVector(radian,vector);
	},

	localRotateX:function(radian){
		this.matrix.localRotateX(radian);
	},

	localRotateY:function(radian){
		this.matrix.localRotateY(radian);
	},

	localRotateZ:function(radian){
		this.matrix.localRotateZ(radian);
	}
};
////////////////////////////////////////////////////////////////////////////////////////////////////
World.HeightMap = function(row,column,elevations,imageUrl,heightScale){
    //this.setPosition(-column/2,0,-row/2);
    this.setElevationInfo(row, column,elevations);
    this.texture = gl.createTexture();
    this.setTextureImageUrl(imageUrl);
    this.heightScale = heightScale||1;
};

World.HeightMap.prototype = new World.Object3D();
World.HeightMap.prototype.constructor = World.HeightMap;
World.HeightMap.prototype.setElevationInfo = function(row,column,elevations){
    this.row = row;
    this.column = column;
    this.elevations = elevations;
    this.elevations.getElevation = function(r,c){
        var index = (r-1)*column + c-1;
        return elevations[index];
    };
};
World.HeightMap.prototype.setTextureImageUrl = function(imageUrl){
    function handleLoadedTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    this.texture.image = new Image();
    var texture = this.texture;
    this.texture.image.onload = function(){
        handleLoadedTexture(texture);
    };
    this.texture.image.crossOrigin = '';//很重要，因为图片是跨域获得的，所以一定要加上此句代码
    this.texture.image.src = imageUrl;
};
World.HeightMap.prototype.draw = function(camera){
	this.baseDraw(camera);
    /*
     WebGL在每次调用gl.drawArray等函数开始进行绘制之前必须给顶点渲染器中所有attribute赋值，否则会出错，Uniforms变量则没有此要求。
    * */
    function drawTriangles(texture,vertices,textureCoords,normals){		
        gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aPositionLocation,3,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER,World.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aTextureCoordLocation,2,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aVertexNormalLocation,3,gl.FLOAT,false,0,0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1i(World.uSamplerLocation,0);

        gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);
    }

	//currentRow和currentColumn表示当前的一个小Grid的中心点所在的行与列
    var currentColumn,centerColumn = (this.column + 1) / 2;//列对应着j
    var currentRow,centerRow = (this.row + 1) / 2;//行对应着i
    /*i表示行序，j表示列序，第一个for循环指定了要进行遍历的列，第二个for循环进入列内进行遍历元素*/
	//逐行绘制除去四周边框的内部主体
	var vertices = [];
    var textureCoords = [];
    var normals  = [];
	var yAxis = this.matrix.getColumnY();
    var yDirection = new World.Vector(yAxis.x,yAxis.y,yAxis.z);
    yDirection.normalize();
    for(var i=1;i<=this.row-1;i++){
	//for(var i=this.row-1;i>=1;i--){
        for(var j=1;j<=this.column-1;j++){
            //计算左上角数据
            currentRow = i; currentColumn = j;            
            var leftTopX = currentColumn - centerColumn; 
			var leftTopY = this.elevations.getElevation(currentRow, currentColumn)*this.heightScale;
			var leftTopZ = currentRow - centerRow;
			var leftTopTextureX = (currentColumn-0.5)/this.column;
			var leftTopTextureY = 1-(currentRow-0.5)/this.row;
            
			
			//计算左下角数据
            currentRow = i + 1; currentColumn = j;
			var leftBottomX = currentColumn - centerColumn;
            var leftBottomY = this.elevations.getElevation(currentRow,currentColumn)*this.heightScale;
            var leftBottomZ = currentRow - centerRow;
			var leftBottomTextureX = (currentColumn-0.5)/this.column;
			var leftBottomTextureY = 1-(currentRow-0.5)/this.row;
            

            //计算右上角数据
            currentRow = i; currentColumn = j + 1;
			var rightTopX = currentColumn - centerColumn; 
            var rightTopY = this.elevations.getElevation(currentRow,currentColumn)*this.heightScale;
            var rightTopZ = currentRow - centerRow;
			var rightTopTextureX = (currentColumn-0.5)/this.column;
			var rightTopTextureY = 1-(currentRow-0.5)/this.row;
            

            //计算右下角数据
            currentRow = i + 1; currentColumn = j + 1;
			var rightBottomX = currentColumn - centerColumn; 
            var rightBottomY = this.elevations.getElevation(currentRow,currentColumn)*this.heightScale;
            var rightBottomZ = currentRow - centerRow;
			var rightBottomTextureX = (currentColumn-0.5)/this.column;
			var rightBottomTextureY = 1-(currentRow-0.5)/this.row;
            
			///////////////////////////////////////////////////////////////////////////////
			
			//加入左上角点
			vertices.push(leftTopX);
            vertices.push(leftTopY);
            vertices.push(leftTopZ);
            textureCoords.push(leftTopTextureX);
            textureCoords.push(leftTopTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);
			
			//加入左下角点
			vertices.push(leftBottomX);
            vertices.push(leftBottomY);
            vertices.push(leftBottomZ);
            textureCoords.push(leftBottomTextureX);
            textureCoords.push(leftBottomTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);
			
			//加入右下角点
			vertices.push(rightBottomX);
            vertices.push(rightBottomY);
            vertices.push(rightBottomZ);
            textureCoords.push(rightBottomTextureX);
            textureCoords.push(rightBottomTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);
			
			////////////////////////////////////////////////////////////////////////////////////////
			
			//加入右下角点
			vertices.push(rightBottomX);
            vertices.push(rightBottomY);
            vertices.push(rightBottomZ);
            textureCoords.push(rightBottomTextureX);
            textureCoords.push(rightBottomTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);
			
			//加入右上角点
			vertices.push(rightTopX);
            vertices.push(rightTopY);
            vertices.push(rightTopZ);
            textureCoords.push(rightTopTextureX);
            textureCoords.push(rightTopTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);
			
			//加入左上角点
			vertices.push(leftTopX);
            vertices.push(leftTopY);
            vertices.push(leftTopZ);
            textureCoords.push(leftTopTextureX);
            textureCoords.push(leftTopTextureY);
            normals.push(yDirection.x);
            normals.push(yDirection.y);
            normals.push(yDirection.z);			
        }
    }
	
	drawTriangles(this.texture,vertices,textureCoords,normals);
};
////////////////////////////////////////////////////////////////////////////////////////////////////
World.Cube = function(length,width,height){
	this.length = length;
	this.width = width;
	this.height = height;
};
World.Cube.prototype = new World.Object3D();
World.Cube.prototype.constructor = World.Cube;
World.Cube.prototype.draw = function(){	
	this.baseDraw(camera);
	function drawTriangles(vertices,textureCoords,normals){		
        gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aPositionLocation,3,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER,World.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aTextureCoordLocation,2,gl.FLOAT,false,0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
        gl.vertexAttribPointer(World.aVertexNormalLocation,3,gl.FLOAT,false,0,0);

        gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);
    }
	
	var halfLength = this.length/2;	
	var halfHeight = this.height/2;
	var halfWidth = this.width/2;
	var vertices = [];
    //var textureCoords = [];
    var normals  = [];
	
	var frontLeftTopVertice = [-halfLength,halfHeight,halfWidth];//前面左上角点	
	var frontLeftBottomVertice = [-halfLength,-halfHeight,halfWidth];//前面左下角点	
	var frontRightTopVertice = [halfLength,halfHeight,halfWidth];//前面右上角点	
	var frontRightBottomVertice = [halfLength,-halfHeight,halfWidth];//前面右下角点	
	var behindLeftTopVertice = [-halfLength,halfHeight,-halfWidth];//后面左上角点	
	var behindLeftBottomVertice = [-halfLength,-halfHeight,-halfWidth];//后面左下角点	
	var behindRightTopVertice = [halfLength,halfHeight,-halfWidth];//后面右上角点	
	var behindRightBottomVertice = [halfLength,-halfHeight,-halfWidth];//后面右下角点
	
	var frontNormal = [0,0,1];
	var behindNormal = [0,0,-1];
	var leftNormal = [-1,0,0];
	var rightNormal = [1,0,0];
	var topNormal = [0,1,0];
	var bottomNormal = [0,-1,0];
	
};
////////////////////////////////////////////////////////////////////////////////////////////////////
World.EarthOSM = function(radius,level){
	this.textures = [];
	this.radius = radius;
	this.level = level||2;
	if(this.level < 2){
		this.level = 2;
	}
	this.getTiles(this.radius,this.level);
}
World.EarthOSM.prototype = new World.Object3D();
World.EarthOSM.prototype.constructor = World.EarthOSM;
World.EarthOSM.prototype.getTiles = function (r,level){
	var n = Math.pow(2,level);				
	for(var column = 0;column < n;column++){
		for(var row = 0;row < n;row++){
			var texture = this.initTexture(level,row,column,r);
			this.textures.push(texture);
		}
	}
}

World.EarthOSM.prototype.initTexture = function (level,row,column,R){
	function handleLoadedTexture(texture) {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	var texture = gl.createTexture();				
	texture.level = level;
	texture.row = row;
	texture.column = column;
	var n = Math.pow(2,level);
	var eachLog = 360 / n;//每列所跨的经度
	var eachLat = 90 * 2 / n;//每列所跨的纬度
	texture.minLog = -180 + eachLog * column;//每个图片的经度范围中的最小值
	texture.maxLog = texture.minLog + eachLog;//每个图片的经度范围中的最大值
	texture.maxLat = 90 - eachLat * row;//每个图片的纬度范围中的最大值
	texture.minLat = texture.maxLat - eachLat;//每个图片的纬度范围中的最小值
				
	var pLeftBottom = this.getXYZ(texture.minLog,texture.minLat,R);
	var pRightBottom = this.getXYZ(texture.maxLog,texture.minLat,R);
	var pLeftTop = this.getXYZ(texture.minLog,texture.maxLat,R);
	var pRightTop = this.getXYZ(texture.maxLog,texture.maxLat,R);
	var vertices = [pLeftBottom[0],pLeftBottom[1],pLeftBottom[2],
					pRightBottom[0],pRightBottom[1],pRightBottom[2],
					pLeftTop[0],pLeftTop[1],pLeftTop[2],
					pRightTop[0],pRightTop[1],pRightTop[2]];
	var textureCoords = [0,0,
						 1,0,
						 0,1,
						 1,1];
	var normals = [pLeftBottom[0],pLeftBottom[1],pLeftBottom[2],
					pRightBottom[0],pRightBottom[1],pRightBottom[2],
					pLeftTop[0],pLeftTop[1],pLeftTop[2],
					pRightTop[0],pRightTop[1],pRightTop[2]];
	texture.vertices = vertices;
	texture.textureCoords = textureCoords;
	texture.normals = normals;
				
	texture.image = new Image();
	texture.image.onload = function () {
		handleLoadedTexture(texture);
	};
	texture.image.crossOrigin = '';//很重要，因为图片是跨域获得的，所以一定要加上此句代码
	//"http://otile1.mqcdn.com/tiles/1.0.0/osm/"+level+"/"+column+"/"+row+".jpg";
	texture.image.src = "http://a.tile.openstreetmap.org/"+level+"/"+column+"/"+row+".png";				
				
	return texture;
}

World.EarthOSM.prototype.getXYZ = function(longitude,latitude,r){
	var vertice = [];
	var radianLog = Math.PI/180*longitude;
	var radianLat = Math.PI/180*latitude;
	var sin1 = Math.sin(radianLog);
	var cos1 = Math.cos(radianLog);
	var sin2 = Math.sin(radianLat);
	var cos2 = Math.cos(radianLat);
	var x = r*sin1*cos2;
	var y = r*sin2;
	var z = r*cos1*cos2;
	vertice.push(x);
	vertice.push(y);
	vertice.push(z);
	return vertice;
}

World.EarthOSM.prototype.draw = function(){
	this.baseDraw(camera);
	for(var i = 0;i < this.textures.length;i++){
		var texture = this.textures[i];					
		if(texture.image){
			gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexPositionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.vertices),gl.STATIC_DRAW);
			gl.vertexAttribPointer(World.aPositionLocation,3,gl.FLOAT,false,0,0);
								
			gl.bindBuffer(gl.ARRAY_BUFFER, World.textureCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.textureCoords),gl.STATIC_DRAW);
			gl.vertexAttribPointer(World.aTextureCoordLocation,2, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER,World.vertexNormalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.normals),gl.STATIC_DRAW);
			gl.vertexAttribPointer(World.aVertexNormalLocation,3,gl.FLOAT,false,0,0);
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(World.uSamplerLocation, 0);
				
			gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
		}					
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////
World.PerspectiveCamera = function(fov,aspect,near,far){
	this.fov = fov||90;
	this.aspect = aspect||1;
    this.near = near||0.1;
    this.far = far||100;
	this.matrix = new World.Matrix();//相当于Camera的一般的模型矩阵
	this.projMatrix = new World.Matrix();
	this.setPerspectiveMatrix(this.fov,this.aspect,this.near,this.far);
};
World.PerspectiveCamera.prototype = new World.Object3D();
World.PerspectiveCamera.prototype.constructor = World.PerspectiveCamera;

World.PerspectiveCamera.prototype.setPerspectiveMatrix = function(fov,aspect,near,far){
	this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    var mat = [1,0,0,0,
               0,1,0,0,
               0,0,1,0,
               0,0,0,1];
    var f=this.fov*Math.PI/360;
    var a=this.far-this.near;
    var e=Math.cos(f)/Math.sin(f);
    mat[0]=e/this.aspect;
    mat[5]=e;
    mat[10]=-(this.far+this.near)/a;
    mat[11]=-1;
    mat[14]=-2*this.near*this.far/a;
    mat[15]=0;
    this.projMatrix.setElements(mat[0],mat[1],mat[2],mat[3],
                                mat[4],mat[5],mat[6],mat[7],
                                mat[8],mat[9],mat[10],mat[11],
                                mat[12],mat[13],mat[14],mat[15]);
    this.projMatrix.transpose();
};

World.PerspectiveCamera.prototype.getLightDirection = function(){
    var dirVertice = this.matrix.getColumnZ();
    var direction = new World.Vector(-dirVertice.x,-dirVertice.y, -dirVertice.z);
    direction.normalize();
    return direction;
};

World.PerspectiveCamera.prototype.setPosition = function(/*World.Vertice*/ position){
    this.look(position,this.getTarget());
};

World.PerspectiveCamera.prototype.getTarget = function(){
    var direction = this.getLightDirection();
    direction.setLength(this.far);
    var position = this.getPosition();
    var target = new World.Vertice();
    target.x = position.x + direction.x;
    target.y = position.y + direction.y;
    target.z = position.z + direction.z;

    return target;
};

World.PerspectiveCamera.prototype.setTarget = function(/*World.Vertice*/ targetPnt,/*vector option*/ upDirection){
    this.lookAt(targetPnt,upDirection);
};

World.PerspectiveCamera.prototype.getViewFrustumDistance = function(){
    var distance = this.far - this.near;
    return distance;
};

World.PerspectiveCamera.prototype.setFov = function(){
    this.setPerspectiveMatrix(fov,this.aspect,this.near,this.far);
};

World.PerspectiveCamera.prototype.setAspect = function(aspect){
    this.setPerspectiveMatrix(this.fov, aspect, this.near,this.far);
};

World.PerspectiveCamera.prototype.setNear = function(near){
    this.setPerspectiveMatrix(this.fov,this.aspect,near,this.far);
};

World.PerspectiveCamera.prototype.setFar = function(far){
    this.setPerspectiveMatrix(this.fov, this.aspect,this.near, far);
};

World.PerspectiveCamera.prototype.setViewFrustumDistance = function(newDistance,bCameraPntMove){
    if(bCameraPntMove == true){
        //设置视景体前后面的距离，target不变，通过改变视距，从而改变视点（即Camera的位置）
        var preDistance = this.getViewFrustumDistance();
        var changeLength = newDistance - preDistance;
        var changeDirection = this.getLightDirection();
        changeDirection.setLength(changeLength);
        var oldPosition = this.getPosition();
        var newPosition = new World.Vertice(oldPosition.x+changeDirection.x,oldPosition.y+changeDirection.y,oldPosition.z+changeDirection.z);
        var target = this.getTarget();
        this.look(newPosition,target);
    }
    else{
	    //默认情况
        //设置视景体前后面的距离，视点（即Camera的位置）和this.near不变，通过改变视距，从而改变this.far,相当于改变了target
        this.setFar(newDistance + this.near);
    }
};

World.PerspectiveCamera.prototype.getViewMatrix = function(){
	var columnTrans = this.matrix.getColumnTrans();
	var transX = columnTrans.x;
	var transY = columnTrans.y;
	var transZ = columnTrans.z;

    var mat1 = new World.Matrix();
	mat1.setMatrixByOther(this.matrix);

	mat1.transpose();//因为视点矩阵与模型矩阵相反，所以要对各个方向进行转置操作，从而实现设置模型矩阵的XYZ方向。通过Camera的一般的模型矩阵对XYZ方向进行转置，得到视点矩阵的XYZ方向
	mat1.setColumnTrans(0,0,0);
	mat1.setLastRowDefault();

	var mat2 = new World.Matrix();
	mat2.setColumnTrans(-transX,-transY,-transZ);

	var viewMatrix = mat1.multiply(mat2);
	
	//viewMatrix.checkZero();
	
	return viewMatrix;
};

World.PerspectiveCamera.prototype.look = function(/*World.Vertice*/ cameraPnt,/*World.Vertice*/ targetPnt,/*vector option*/ upDirection){
	var transX = cameraPnt.x;
	var transY = cameraPnt.y;
	var transZ = cameraPnt.z;
	var up = upDirection||new World.Vector(0,1,0);
	var zAxis = new World.Vector(cameraPnt.x-targetPnt.x,cameraPnt.y-targetPnt.y,cameraPnt.z-targetPnt.z).normalize();
	var xAxis = up.cross(zAxis).normalize();
	var yAxis = zAxis.cross(xAxis).normalize();

	this.matrix.setColumnX(xAxis.x,xAxis.y,xAxis.z);//此处相当于对Camera的模型矩阵(还不是视点矩阵)设置X轴方向
	this.matrix.setColumnY(yAxis.x,yAxis.y,yAxis.z);//此处相当于对Camera的模型矩阵(还不是视点矩阵)设置Y轴方向
	this.matrix.setColumnZ(zAxis.x,zAxis.y,zAxis.z);//此处相当于对Camera的模型矩阵(还不是视点矩阵)设置Z轴方向
	this.matrix.setColumnTrans(transX,transY,transZ);//此处相当于对Camera的模型矩阵(还不是视点矩阵)设置偏移量
	this.matrix.setLastRowDefault();

    var deltaX = cameraPnt.x - targetPnt.x;
    var deltaY = cameraPnt.y - targetPnt.y;
    var deltaZ = cameraPnt.z - targetPnt.z;
    var far = Math.sqrt(deltaX*deltaX+deltaY*deltaY+deltaZ*deltaZ);
    this.setFar(far);
};

World.PerspectiveCamera.prototype.lookAt = function(/*World.Vertice*/ targetPnt,/*vector option*/ upDirection){
    var position = this.getPosition();
    this.look(position,targetPnt,upDirection);
};
