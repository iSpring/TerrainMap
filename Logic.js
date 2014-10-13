dojo.require("esri.map");
dojo.require("esri.tasks.geometry");
dojo.require("dojo.parser");
dojo.require("dijit.form.HorizontalSlider");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");

var elevationData = [], imageName = "";
var vertexShaderContent, fragmentShaderContent, camera, scene, renderer, heightMap;
var map, dynamicLayer, bMap2D = true, previousExtent = null;
var mapServiceUrl = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
var streetMapUrl = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
var topoMapUrl = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer";

var squareCenterExtent;
var geometryServiceUrl = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer";
var getElevationDataUrl = "http://sampleserver4.arcgisonline.com/ArcGIS/rest/services/Elevation/ESRI_Elevation_World/MapServer/exts/ElevationsSOE/ElevationLayers/1/GetElevationData";

function getShaderContent(shaderType) {
    var shaderUrl;
    if (shaderType == "VERTEX_SHADER") {
        shaderUrl = "VertexShader.txt";
    } else if (shaderType == "FRAGMENT_SHADER") {
        shaderUrl = "FragmentShader.txt";
    }
    var xhrArgs = {
        url: shaderUrl,
        handleAs: "text",
        sync: true,
        preventCache: true,
        load: function(data) {
            if (shaderType == "VERTEX_SHADER") {
                vertexShaderContent = data;
            } else if (shaderType == "FRAGMENT_SHADER") {
                fragmentShaderContent = data;
            }
        },
        error: function(error) {
            alert("获取ShaderContent出错！");
        }
    };
    dojo.xhrGet(xhrArgs);
}

function getDefaultElevationData(dataName) {
    var xhrArgs = {
        url: "ElevationData/" + dataName,
        handleAs: "text",
        sync: true,
        preventCache: true,
        load: function(data) {
            elevationData = [];
            var strElevationArray = data.split(',');
            for (var i = 0; i < strElevationArray.length; i++) {
                elevationData.push(parseFloat(strElevationArray[i]));
            }
        },
        error: function(error) {
            alert("加载默认高程数据出错！");
        }
    };
    dojo.xhrGet(xhrArgs);
}

function startWebGL() {
    getShaderContent("VERTEX_SHADER");
    getShaderContent("FRAGMENT_SHADER");
    //getDefaultElevationData("50X50.txt");
    renderer = new World.WebGLRenderer(dojo.byId("canvasId"), vertexShaderContent, fragmentShaderContent);
    //World.enableAmbientLight();
    //World.enableParallelLlight(new World.Vector(0,-30,-50),new World.Vertice(0,0,0.8));
    World.disableAmbientLight();
    World.disableParallelLlight();
    camera = new World.PerspectiveCamera(90, 1, 1.0, 200.0);
    camera.look(new World.Vertice(0, 30, 50), new World.Vertice(0, -30, -50));
    scene = new World.Scene();
    //heightMap = new World.HeightMap(rowCount,columnCount,elevationData,"MapImages/"+"terrain512.jpg");
    //scene.add(heightMap);
    renderer.bindScene(scene);
    renderer.bindCamera(camera);
    renderer.setIfAutoRefresh(false);
}



function judgeExtentEqual(ext1, ext2) {
    var judgeNumberEqual = function(a, b) {
        var c = Math.abs(a - b);
        if (c <= 100)
            return true;
    };

    if (ext1 && ext2) {
        var sr1 = ext1.spatialReference;
        var sr2 = ext2.spatialReference;
        if (judgeNumberEqual(ext1.xmin, ext2.xmin) && judgeNumberEqual(ext1.ymin, ext2.ymin) && judgeNumberEqual(ext1.xmax, ext2.xmax) && judgeNumberEqual(ext1.ymax, ext2.ymax) && sr1.wkid == sr2.wkid) {
            return true;
        }
    }

    return false;
}

function getSquareCenterExtent() {
    var offset = 0;
    if (map.extent.getHeight() < map.extent.getWidth()) {
        offset = map.extent.getHeight() / 2;
    } else {
        offset = map.extent.getWidth() / 2;
    }
    var p = map.extent.getCenter();
    var squareExtent = esri.geometry.Extent(p.x - offset, p.y - offset, p.x + offset, p.y + offset, map.extent.spatialReference);
    return squareExtent;
}

function showTerrain3D(bUpdate, row, column, elevations, mapImageName) {
    if (bUpdate === true) {
        scene.remove(heightMap);
        var scale = parseFloat(dojo.byId("labelStretch").innerHTML);
        heightMap = new World.HeightMap(row, column, elevations, "MapImages/" + mapImageName, scale);
        scene.add(heightMap);
    }
    renderer.setIfAutoRefresh(true);

    dojo.byId("mapId").style.display = "none";
    dojo.byId("canvasId").style.display = "block";
    dojo.byId("iSpring").style.visibility = "visible";
    dojo.byId("btnSwitch").innerHTML = "转换为2D视图";
    dojo.byId("btnSwitch").disabled = false;
    dijit.byId("sliderStretch")._setDisabledAttr(false);
    previousExtent = map.extent;
    bMap2D = false;
}

function startSwitch(bSwitchTo3D) {
    squareCenterExtent = getSquareCenterExtent();
    if (bSwitchTo3D === true) {
        setIfDisableControls(true);
        var currentExtent = map.extent;
        //第一个判断的顺序要放在首位
        if (judgeExtentEqual(currentExtent, previousExtent)) {
            showTerrain3D(false);
        } else {
            var imageSize = dojo.byId("selectImageSize").value;
            getMapImageUrl(dynamicLayer, squareCenterExtent, imageSize, imageSize);
        }
    } else {
        renderer.setIfAutoRefresh(false);
        setIfDisableControls(false);
        dojo.byId("canvasId").style.display = "none";
        dojo.byId("iSpring").style.visibility = "hidden";
        dojo.byId("mapId").style.display = "block";
        dojo.byId("btnSwitch").innerHTML = "转换为3D视图";
        dijit.byId("sliderStretch")._setDisabledAttr(true);
        bMap2D = true;
    }
}

function setIfDisableControls(bDisable) {
    dojo.byId("btnSwitch").disabled = bDisable;
    dojo.byId("btnFullExtent").disabled = bDisable;
    dojo.byId("radioSatelite").disabled = bDisable;
    dojo.byId("radioStreet").disabled = bDisable;
    dojo.byId("radioTopo").disabled = bDisable;
    dijit.byId("sliderGridSize")._setDisabledAttr(bDisable);
    dojo.byId("selectImageSize").disabled = bDisable;
}

function getMapImageUrl(dynamicLayer, extent, imageWidth, imageHeight) {
    var imageParameters = new esri.layers.ImageParameters();
    imageParameters.bbox = extent;
    imageParameters.format = "jpeg";
    imageParameters.width = imageWidth;
    imageParameters.height = imageHeight;
    imageParameters.imageSpatialReference = map.spatialReference;
    dynamicLayer.exportMapImage(imageParameters, function(mapImage) {
        tryStoreMapImage(mapImage.href);
    });
}

function tryStoreMapImage(imageUrl) {
    var xhrArgs = {
        url: "proxy.ashx?requestType=getImage&imageUrl=" + imageUrl,
        handleAs: "text",
        sync: false,
        preventCache: true,
        load: function(data) {
            imageName = data;
            //alert("存储图像完成！");
            var gridSize = Math.round(dijit.byId("sliderGridSize").value);
            getCurrentElevationData(gridSize, gridSize);
        },
        error: function(error) {
            alert("存储图像出错！");
            startSwitch(false);
        }
    };
    dojo.xhrGet(xhrArgs);
}

function getCurrentElevationData(rows, columns) {
    var extent = squareCenterExtent;
    var xhrArgs = {
        url: "proxy.ashx?requestType=getElevation",
        content: {
            Rows: rows,
            Columns: columns,
            xmin: extent.xmin,
            ymin: extent.ymin,
            xmax: extent.xmax,
            ymax: extent.ymax,
            wkid: extent.spatialReference.wkid
        },
        handleAs: "text",
        sync: false,
        preventCache: true,
        load: function(data) {
            //alert("获取高程数据完成！");
            succeedGetElevationData(data);
        },
        error: function(error) {
            alert("获取高程出错！");
            startSwitch(false);
        }
    };
    dojo.xhrGet(xhrArgs);
}

function succeedGetElevationData(data) {
    var info = data.split(";");
    var row = parseFloat(info[0]); //一定要将string转换成float
    var column = parseFloat(info[1]); //一定要将string转换成float
    var strElevations = info[2];
    elevationData = [];
    var strElevationArray = strElevations.split(',');

    for (var i = 0; i < strElevationArray.length; i++) {
        elevationData.push(parseFloat(strElevationArray[i]));
    }

    showTerrain3D(true, row, column, elevationData, imageName);
}

function initLayout() {
    var sliderGridSize = new dijit.form.HorizontalSlider({
        name: "sliderGridSize",
        value: 50,
        minimum: 1,
        maximum: 100,
        intermediateChanges: true,
        style: "width:175px;float:left;",
        onChange: function(value) {
            dojo.byId("labelGridSize").innerHTML = Math.round(value);
        }
    }, "sliderGridSize");

    var sliderStretch = new dijit.form.HorizontalSlider({
        name: "sliderStretch",
        value: 1,
        minimum: 0,
        maximum: 4,
        intermediateChanges: true,
        style: "width:175px;float:left;",
        onChange: function(value) {
            var scale = Math.round(value * 10) / 10; //var scale = Math.round(value);
            dojo.byId("labelStretch").innerHTML = scale;
            heightMap.heightScale = scale;
        }
    }, "sliderStretch");
    sliderStretch._setDisabledAttr(true); //开始的时候要禁用拉伸滑块

    var clientWidth = document.body.clientWidth < 1024 ? 1024 : document.body.clientWidth;
    var clientHeight = document.body.clientHeight < 600 ? 600 : document.body.clientHeight;
    var height = clientHeight - 10 - 10; //
    var viewerWidth = clientWidth - 220 - 10; //
    document.getElementById("controls").style.height = height + "px";
    document.getElementById("controlsContent").style.height = (height - 25) + "px";
    document.getElementById("viewer").style.height = height + "px";
    document.getElementById("mapId").style.height = (height - 25) + "px";
    document.getElementById("canvasId").height = height - 25;

    document.getElementById("viewer").style.width = viewerWidth + "px";
    document.getElementById("mapId").style.width = viewerWidth + "px";
    document.getElementById("canvasId").width = viewerWidth;
}

function showLoading() {}

function updateLoading() {}

function hideLoading() {}

function initMap() {
    map = new esri.Map("mapId");
    var basemap = new esri.layers.ArcGISTiledMapServiceLayer(mapServiceUrl);
    map.addLayer(basemap);

    dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(mapServiceUrl, {
        imageFormat: "jpg"
    });
    dojo.connect(dynamicLayer, 'onError', function() {
        alert("载入动态图层出错！");
    });
    dojo.connect(map, 'onLoad', function(theMap) {
        dojo.connect(dojo.byId('mapId'), 'onresize', map, map.resize);
        dojo.connect(theMap, "onMouseDown", function(evt) {
            console.log(evt.mapPoint);
        });
    });
}

function initEvents() {
    dojo.connect(dojo.byId("canvasId"), "mousedown", onMouseDown);
    dojo.connect(dojo.byId("canvasId"), "onmouseup", onMouseUp);
    dojo.connect(dojo.byId("canvasId"), 'mousewheel', onMouseWheel);
    dojo.connect(dojo.byId("canvasId"), 'DOMMouseScroll', onMouseWheel);
}

function initAll() {
    initLayout();
    initEvents();
    initMap();
    startWebGL();
}

function showTest3D() {
    getDefaultElevationData("Test.txt");
    showTerrain3D(true, 50, 50, elevationData, "Test.jpg");
}

dojo.addOnLoad(initAll);