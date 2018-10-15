// drawing a single quad (rectangular polygon) with two triangles

let VSHADER_SOURCE = null; // vertex shader program
let FSHADER_SOURCE = null; // fragment shader program

const FSIZE = (new Float32Array()).BYTES_PER_ELEMENT; // size of a vertex coordinate (32-bit float)
const VERTEX_SIZE = 10;

let g_points = []; // array of mouse presses
let shadingMode = 1;
let xTranslate = 0.0;
let lightPos = [1.0, 1.0, 1.0];

let x = 0, y = 0, z = 0;
let thetaX = 0, thetaY = 0, thetaZ = 0;
let shearX = 0, shearY = 0;
let scale = 1;

let lx = 1, ly = 1, lz = 1;
let lthetaX = 0, lthetaY = 0, lthetaZ = 0;
let lshearX = 0, lshearY = 0;
let lscale = 0.1;

// called when page is loaded
function main() {
    let canvas = document.getElementById('canvas');
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    loadFile("shader.vert", function (shader_src) {
        setShader(gl, canvas, gl.VERTEX_SHADER, shader_src);
    });
    loadFile("shader.frag", function (shader_src) {
        setShader(gl, canvas, gl.FRAGMENT_SHADER, shader_src);
    });
}

// set appropriate shader and start if both are loaded
function setShader(gl, canvas, shader, shader_src) {
    if (shader === gl.VERTEX_SHADER) {
        VSHADER_SOURCE = shader_src;
    } else if (shader === gl.FRAGMENT_SHADER) {
        FSHADER_SOURCE = shader_src;
    }
    if (VSHADER_SOURCE && FSHADER_SOURCE)
        start(gl, canvas);
}

// called by 'setShader' when shaders are done loading
function start(gl, canvas) {
    // initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    // initialize buffers/attributes/uniforms
    let success = initVertexBuffer(gl);
    success = success && initIndexBuffer(gl);
    success = success && initAttributes(gl);
    success = success && initUniforms(gl, canvas);
    initHTMLVars();
    initGLOptions(gl);
    // check success
    if (!success) {
        console.log('Failed to initialize buffers.');
        return;
    }

    // Register function event handlers
    canvas.onmousedown = function (ev) {
        clickDraw(ev, gl, canvas);
    };
    canvas.onmousemove = function (ev) {
        move(ev, gl, canvas);
    };
    window.onkeydown = function (ev) {
        keypress(ev, gl);
    };
    document.getElementById('rAmbient').onchange = function () {
        updateAmbient(gl);
    };
    document.getElementById('gAmbient').onchange = function () {
        updateAmbient(gl);
    };
    document.getElementById('bAmbient').onchange = function () {
        updateAmbient(gl);
    };
    document.getElementById('rSpecular').onchange = function () {
        updateSpecular(gl);
    };
    document.getElementById('gSpecular').onchange = function () {
        updateSpecular(gl);
    };
    document.getElementById('bSpecular').onchange = function () {
        updateSpecular(gl);
    };
    document.getElementById('ySpin').onclick = function () {
        ySpinAnim(gl);
    };
    document.getElementById('square').onclick = function () {
        squareAnim(gl);
    };
    document.getElementById('gravity').onclick = function () {
        gravityAnim(gl);
    };
    document.getElementById('nSlide').oninput = function () {
        updateSpecularConsant(gl);
    };
}

function initGLOptions(gl) {
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function updateSpecularConsant(gl) {
    let n = document.getElementById('nSlide').value;
    gl.uniform1f(u_SpecularConstant, parseInt(n));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function initHTMLVars() {
    document.getElementById('rAmbient').value = 0;
    document.getElementById('gAmbient').value = 0;
    document.getElementById('bAmbient').value = 51;

    document.getElementById('rSpecular').value = 0;
    document.getElementById('gSpecular').value = 255;
    document.getElementById('bSpecular').value = 0;
}

function updateAmbient(gl) {
    let r = document.getElementById('rAmbient');
    let g = document.getElementById('gAmbient');
    let b = document.getElementById('bAmbient');
    gl.uniform3f(u_AmbientColor, parse255(r), parse255(g), parse255(b));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function updateSpecular(gl) {
    let r = document.getElementById('rSpecular');
    let g = document.getElementById('gSpecular');
    let b = document.getElementById('bSpecular');
    gl.uniform3f(u_SpecularColor, parse255(r), parse255(g), parse255(b));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function parse255(elem) {
    let result = parseInt(elem.value);
    if(result > 255) {
        result = 255;
        elem.value = result;
    } else if(result < 0) {
        result = 0;
        elem.value = result;
    }
    return result / 255;
}

function initVertexBuffer(gl) {
    let vertex_buffer = gl.createBuffer();
    if (!vertex_buffer) {
        console.log("failed to create vertex buffer");
        return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    return true;
}

function initIndexBuffer(gl) {
    let index_buffer = gl.createBuffer();
    if (!index_buffer) {
        console.log("failed to create index buffer");
        return false;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    return true;
}

function initAttributes(gl) {
    let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    let a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    let a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Position < 0 && a_Color < 0 && a_Normal < 0) {
        console.log("failed to get storage location of attribute");
        return false;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * VERTEX_SIZE, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * VERTEX_SIZE, FSIZE * 3);
    gl.enableVertexAttribArray(a_Color);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * VERTEX_SIZE, FSIZE * 7);
    gl.enableVertexAttribArray(a_Normal);
    return true;
}

// uniform letiable locations: made global for easy access and modification
let u_ModelMatrix; // scale, rotate, and translateXYM the cylinder
let u_NormalMatrix; // normals transformation
let u_ViewMatrix; // model view transform
let u_ProjMatrix; // projection transform
let u_ShadingStyle; // shading style
let u_LightColor; // light color
let u_LightPosition; // light position
let u_ViewPosition; // light position
let u_AmbientColor; // ambient color
let u_SpecularColor; // specular color
let u_SpecularConstant; // specular constant
let u_Selected_Click; // click highlight selection for specific object
let u_Light; // click highlight selection for specific object
function initUniforms(gl, canvas) {
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    u_ShadingStyle = gl.getUniformLocation(gl.program, 'u_ShadingStyle');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    u_ViewPosition = gl.getUniformLocation(gl.program, 'u_ViewPosition');
    u_AmbientColor = gl.getUniformLocation(gl.program, 'u_AmbientColor');
    u_SpecularColor = gl.getUniformLocation(gl.program, 'u_SpecularColor');
    u_SpecularConstant = gl.getUniformLocation(gl.program, 'u_SpecularConstant');
    u_Selected_Click = gl.getUniformLocation(gl.program, 'u_Selected_Click');
    u_Light = gl.getUniformLocation(gl.program, 'u_Light');

    let viewMatrix = new Matrix4();　// The view matrix
    let projMatrix = new Matrix4();  // The projection matrix
    viewMatrix.setLookAt(0, 0, 5, 0, 0, -100, 0, 1, 0);
    projMatrix.setPerspective(30, canvas.width / canvas.height, 1, 100);

    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements); // no rotation, no translation, no scale
    gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements); // normals
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements); // view
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements); // projection
    gl.uniform1f(u_ShadingStyle, shadingMode); // shading style
    gl.uniform3fv(u_LightColor, new Float32Array([1.0, 1.0, 1.0])); // white light color
    gl.uniform3fv(u_LightPosition, new Float32Array(lightPos)); // light position (1, 1, 1)
    gl.uniform3fv(u_ViewPosition, new Float32Array([0.0, 0.0, 5.0])); // view position (0, 0, 5)
    gl.uniform3fv(u_AmbientColor, [0.0, 0.0, 0.2]); // ambient color
    gl.uniform3fv(u_SpecularColor, [0.0, 1.0, 0.0]); // specular color
    gl.uniform1f(u_SpecularConstant, 8.0); // specular constant
    gl.uniform1f(u_Selected_Click, 0.0); // click highlight selection for specific object
    gl.uniform1f(u_Light, 0.0); // specific light shading
    return true;
}

// set data in vertex buffer (given typed float32 array)
function setVertexBuffer(gl, vertices) {
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
}

// set data in index buffer (given typed uint16 array)
function setIndexBuffer(gl, indices) {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
}

// Draws the polyline based on clicked points
function drawPolyline(gl) {
    gl.uniform1f(u_ShadingStyle, 0);
    setVertexBuffer(gl, new Float32Array(g_points));
    let n = g_points.length / VERTEX_SIZE;
    gl.drawArrays(gl.LINE_STRIP, 0, n);
}

function drawLineTo(gl, x, y) {
    let lineVerts = [];
    let last = g_points.length - 1;
    let lastX = g_points[last - (VERTEX_SIZE - 1)];
    let lastY = g_points[last - (VERTEX_SIZE - 2)];

    pushVector(lineVerts, [lastX, lastY, 0]);
    pushVector(lineVerts, [1, 0, 0, 1]);
    pushVector(lineVerts, [1, 1, 1]);

    pushVector(lineVerts, [x, y, 0]);
    pushVector(lineVerts, [1, 0, 0, 1]);
    pushVector(lineVerts, [1, 1, 1]);

    gl.uniform1f(u_ShadingStyle, 0);
    setVertexBuffer(gl, new Float32Array(lineVerts));
    gl.drawArrays(gl.LINE_STRIP, 0, 2);
}

function drawScene(gl) {
    updateModelMatrix(gl);
    drawCylinders(gl);
    lupdateModelMatrix(gl);
    drawPointLight(gl);
}

function drawCylinders(gl) {
    gl.uniform1f(u_ShadingStyle, shadingMode);
    cylinders.forEach(function (cyl) {
        setVertexBuffer(gl, new Float32Array(cyl.verts));
        setIndexBuffer(gl, new Uint16Array(cyl.inds));
        gl.drawElements(gl.TRIANGLES, cyl.inds.length, gl.UNSIGNED_SHORT, 0);
    });
}

function drawPointLight(gl) {
    let vertsLight = [];

    pushVector(vertsLight, [ 1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0,  1.0]);
    pushVector(vertsLight, [-1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0,  1.0]);
    pushVector(vertsLight, [-1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0,  1.0]);
    pushVector(vertsLight, [ 1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0,  1.0]);

    pushVector(vertsLight, [ 1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    1.0,  0.0,  0.0]);
    pushVector(vertsLight, [ 1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    1.0,  0.0,  0.0]);
    pushVector(vertsLight, [ 1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    1.0,  0.0,  0.0]);
    pushVector(vertsLight, [ 1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    1.0,  0.0,  0.0]);

    pushVector(vertsLight, [ 1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  1.0,  0.0]);
    pushVector(vertsLight, [ 1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  1.0,  0.0]);
    pushVector(vertsLight, [-1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  1.0,  0.0]);
    pushVector(vertsLight, [-1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  1.0,  0.0]);

    pushVector(vertsLight, [-1.0,  1.0,  1.0,    1.0, 1.0, 0.0, 253/255,   -1.0,  0.0,  0.0]);
    pushVector(vertsLight, [-1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,   -1.0,  0.0,  0.0]);
    pushVector(vertsLight, [-1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,   -1.0,  0.0,  0.0]);
    pushVector(vertsLight, [-1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,   -1.0,  0.0,  0.0]);

    pushVector(vertsLight, [-1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0, -1.0,  0.0]);
    pushVector(vertsLight, [ 1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0, -1.0,  0.0]);
    pushVector(vertsLight, [ 1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0, -1.0,  0.0]);
    pushVector(vertsLight, [-1.0, -1.0,  1.0,    1.0, 1.0, 0.0, 253/255,    0.0, -1.0,  0.0]);

    pushVector(vertsLight, [ 1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0, -1.0]);
    pushVector(vertsLight, [-1.0, -1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0, -1.0]);
    pushVector(vertsLight, [-1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0, -1.0]);
    pushVector(vertsLight, [ 1.0,  1.0, -1.0,    1.0, 1.0, 0.0, 253/255,    0.0,  0.0, -1.0]);

    let indsLight = [
         0,  1,  2,    0,  2,  3,    // front
         4,  5,  6,    4,  6,  7,    // right
         8,  9, 10,    8, 10, 11,    // up
        12, 13, 14,   12, 14, 15,    // left
        16, 17, 18,   16, 18, 19,    // down
        20, 21, 22,   20, 22, 23     // back
    ];

    setVertexBuffer(gl, new Float32Array(vertsLight));
    setIndexBuffer(gl, new Uint16Array(indsLight));

    gl.uniform1f(u_Light, 1.0);
    gl.drawElements(gl.TRIANGLES, indsLight.length, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(u_Light, 0.0);
}

function pushCyl(verts, inds) {
    cylinders.push({'verts': verts, 'inds': inds});
}

let cylinders = [];
let verts = [];
let inds = [];
let n = 12;
let width = 0.2;

function makeCylinders(gl) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (let i = 0; i < g_points.length / VERTEX_SIZE - 1; i++) {
        makeCylinder(i)
    }
    makeIntersections();
    makeCaps();
    pushCyl(verts, inds);
}

function makeIntersections() {
    let cylSize = 2 * (VERTEX_SIZE * (n + 1));
    for (let i = 0; i < verts.length / cylSize - 1; i++) {
        let cylLow = i * cylSize;
        let cylMid = (i + 1) * cylSize;
        for (let j = cylLow; j < cylMid; j += VERTEX_SIZE * 2) {
            let ax = verts[j];
            let ay = verts[j + 1];
            let bx = verts[j + VERTEX_SIZE];
            let by = verts[j + VERTEX_SIZE + 1];
            let cx = verts[j + cylSize];
            let cy = verts[j + cylSize + 1];
            let dx = verts[j + cylSize + VERTEX_SIZE];
            let dy = verts[j + cylSize + VERTEX_SIZE + 1];
            let intersect = getIntersection(ax, ay, bx, by, cx, cy, dx, dy);
            verts[j] = intersect.x;
            verts[j + 1] = intersect.y;
            verts[j + cylSize + VERTEX_SIZE] = intersect.x;
            verts[j + cylSize + VERTEX_SIZE + 1] = intersect.y;
        }
    }
}

function makeCaps() {
    let affine1 = getAffine(0);
    let length1 = getLength(0);
    let affine2 = getAffine(g_points.length / VERTEX_SIZE - 2);
    let length2 = getLength(g_points.length / VERTEX_SIZE - 2);

    // calculate cylinder cap center points
    let cap1 = affine1.multiplyVector3(new Vector3([-length1 / 2, 0, 0])).elements;
    let cap2 = affine2.multiplyVector3(new Vector3([length2 / 2, 0, 0])).elements;

    // calculate the normals
    let oppositeCap1 = affine1.multiplyVector3(new Vector3([length1 / 2, 0, 0])).elements;
    let oppositeCap2 = affine2.multiplyVector3(new Vector3([-length2 / 2, 0, 0])).elements;
    let norm1 = getSubtraction(cap1, oppositeCap1);
    let norm2 = getSubtraction(cap2, oppositeCap2);

    // recreate the faces with correct normals
    let dtheta = 2 * Math.PI / n;
    let theta = 0;
    for (let i = 0; i < n + 1; i++) {
        let y1 = width * Math.cos(theta);
        let z1 = width * Math.sin(theta);
        let v1 = affine1.multiplyVector3(new Vector3([-length1 / 2, y1, z1])).elements;

        pushVector(verts, v1);
        pushVector(verts, [1, 0, 0, 254 / 255]);
        pushVector(verts, norm1);

        theta += dtheta;
    }

    theta = 0;
    for (let i = 0; i < n + 1; i++) {
        let y1 = width * Math.cos(theta);
        let z1 = width * Math.sin(theta);
        let v2 = affine2.multiplyVector3(new Vector3([length2 / 2, y1, z1])).elements;

        pushVector(verts, v2);
        pushVector(verts, [1, 0, 0, 254 / 255]);
        pushVector(verts, norm2);

        theta += dtheta;
    }

    // push cylinder cap center points
    pushVector(verts, cap1);
    pushVector(verts, [1, 0, 0, 254 / 255]);
    pushVector(verts, norm1);

    pushVector(verts, cap2);
    pushVector(verts, [1, 0, 0, 254 / 255]);
    pushVector(verts, norm2);

    // push cylinder cap inds
    let numInds = verts.length / VERTEX_SIZE;
    let capIndex1 = numInds - 2;
    let capIndex2 = numInds - 1;

    let initialInd = numInds - 2 * (n + 1) - 2; // account for 2 cap centers and 2(n+1) other cap verts
    for (let i = initialInd; i < n + initialInd; i++) {
        pushVector(inds, [i + 1, i, capIndex1]);
    }
    initialInd += n + 1;
    for (let i = initialInd; i < n + initialInd; i ++) {
        pushVector(inds, [i, i + 1, capIndex2]);
    }
}

// makes cylinder over points
function makeCylinder(idx) {
    let x1 = g_points[idx * VERTEX_SIZE];
    let y1 = g_points[idx * VERTEX_SIZE + 1];
    let x2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE];
    let y2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE + 1];

    let theta = 0;
    let dtheta = 2 * Math.PI / n;
    let length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    let zTheta = Math.atan((y2 - y1) / (x2 - x1));
    let affine = new Matrix4();
    if (x1 - x2 >= 0) {
        affine.translate(x1, y1, 0);
        affine.rotate(zTheta + Math.PI, 0, 0, 1);
        affine.translate(length / 2, 0, 0);
    } else {
        affine.translate(x2, y2, 0);
        affine.rotate(zTheta, 0, 0, 1);
        affine.translate(-length / 2, 0, 0);
    }

    let capVertex1 = affine.multiplyVector3(new Vector3([length / 2, 0, 0])).elements;
    let capVertex2 = affine.multiplyVector3(new Vector3([-length / 2, 0, 0])).elements;
    for (let i = 0; i < n + 1; i++) {
        let y1 = width * Math.cos(theta);
        let z1 = width * Math.sin(theta);
        let first = affine.multiplyVector3(new Vector3([length / 2, y1, z1])).elements;
        let second = affine.multiplyVector3(new Vector3([-length / 2, y1, z1])).elements;

        pushVector(verts, first);
        pushVector(verts, [1, 0, 0, 254 / 255]);
        pushVector(verts, getSubtraction(first, capVertex1));

        pushVector(verts, second);
        pushVector(verts, [1, 0, 0, 254 / 255]);
        pushVector(verts, getSubtraction(second, capVertex2));

        theta += dtheta;
    }

    let initial = 2 * (n + 1) * idx;
    for (let i = initial; i < 2 * n + initial; i += 2) {
        pushVector(inds, [i, i + 1, i + 2]);
        pushVector(inds, [i + 2, i + 1, i + 3]);
    }
}

/* get by index functions */
function getVertex(idx) {
    let xVert = verts[idx * VERTEX_SIZE];
    let yVert = verts[idx * VERTEX_SIZE + 1];
    let zVert = verts[idx * VERTEX_SIZE + 2];
    return [xVert, yVert, zVert];
}

function getNormal(idx) {
    let xNorm = verts[idx * VERTEX_SIZE + 6];
    let yNorm = verts[idx * VERTEX_SIZE + 7];
    let zNorm = verts[idx * VERTEX_SIZE + 8];
    return [xNorm, yNorm, zNorm];
}

function getAffine(idx) {
    let x1 = g_points[idx * VERTEX_SIZE];
    let y1 = g_points[idx * VERTEX_SIZE + 1];
    let x2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE];
    let y2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE + 1];

    let length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    let zTheta = Math.atan((y2 - y1) / (x2 - x1));
    let affine = new Matrix4();
    if (x1 - x2 >= 0) {
        affine.translate(x1, y1, 0);
        affine.rotate(zTheta + Math.PI, 0, 0, 1);
        affine.translate(length / 2, 0, 0);
    } else {
        affine.translate(x2, y2, 0);
        affine.rotate(zTheta, 0, 0, 1);
        affine.translate(-length / 2, 0, 0);
    }
    return affine;
}

function getLength(idx) {
    let x1 = g_points[idx * VERTEX_SIZE];
    let y1 = g_points[idx * VERTEX_SIZE + 1];
    let x2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE];
    let y2 = g_points[idx * VERTEX_SIZE + VERTEX_SIZE + 1];
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/* Animations: YSpin */
let isYSpin = false;
function ySpinAnim(gl) {
    isYSpin = !isYSpin;
    if(isYSpin) {
        window.requestAnimationFrame(function() {
            loopYSpin(0, gl);
        });
    }
}

function drawYSpin(gl) {
    thetaY += Math.PI/100;
    lthetaY += Math.PI/100;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function loopYSpin(timestamp, gl) {
    drawYSpin(gl);
    if(isYSpin) {
        window.requestAnimationFrame(function () {
            loopYSpin(0, gl);
        });
    }
}

/* Animations: square */
let isSquare = false;
let phase = 0;
let xOld = 0, yOld = 0;
let lxOld = 0, lyOld = 0;
let delY = 0, delX = 0;
function squareAnim(gl) {
    isSquare = !isSquare;

    xOld = x;
    yOld = y;
    lxOld = lx;
    lyOld = ly;

    delY = 0; delX = 0;

    if(isSquare) {
        window.requestAnimationFrame(function() {
            loopSquare(0, gl);
        });
    }
}

function drawSquare(gl) {
    switch(phase) {
        case 0:
            x = xOld + delX;
            lx = lxOld + delX;
            delX += 0.01;
            if (delX >= 0.25) {
                phase++;
            }
            break;
        case 1:
            y = yOld + delY;
            ly = lyOld + delY;
            delY += 0.01;
            if (delY >= 0.25) {
                phase++;
            }
            break;
        case 2:
            x = xOld + delX;
            lx = lxOld + delX;
            delX -= 0.01;
            if (delX <= -0.25) {
                phase++;
            }
            break;
        case 3:
            y = yOld + delY;
            ly = lyOld + delY;
            delY -= 0.01;
            if (delY <= -0.25) {
                phase = 0;
            }
            break;
        default:
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function loopSquare(timestamp, gl) {
    drawSquare(gl);
    if(isSquare) {
        window.requestAnimationFrame(function () {
            loopSquare(0, gl);
        });
    }
}

/* Animations: Gravity */
let isGravity = false;
let velocity = 0;
let acceleration = -0.0005;
function gravityAnim(gl) {
    isGravity = !isGravity;
    if(isGravity) {
        window.requestAnimationFrame(function() {
            loopGravity(0, gl);
        });
    } else {
        velocity = 0;
    }
}

function drawGravity(gl) {
    y += velocity;
    velocity += acceleration;

    ly += velocity;
    velocity += acceleration;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function loopGravity(timestamp, gl) {
    drawGravity(gl);
    if(isGravity) {
        window.requestAnimationFrame(function () {
            loopGravity(0, gl);
        });
    }
}

/* Key Listener */
function keypress(ev, gl) {
    if (selected === 1 || selected === 2) {
        if (selected === 1) {
            if (ev.keyCode === 87) // W
                shearX += 0.1;
            if (ev.keyCode === 83) // S
                shearX -= 0.1;
            if (ev.keyCode === 68) // D
                shearY += 0.1;
            if (ev.keyCode === 65) // A
                shearY -= 0.1;
        } else if (selected === 2) {
            if (ev.keyCode === 87) // W
                lshearX += 0.1;
            if (ev.keyCode === 83) // S
                lshearX -= 0.1;
            if (ev.keyCode === 68) // D
                lshearY += 0.1;
            if (ev.keyCode === 65) // A
                lshearY -= 0.1;
        }
    }

    if (ev.keyCode === 39) { // right arrow
        shadingMode += 1;
    } else if(ev.keyCode === 37) { // right arrow
        shadingMode -= 1;
    }

    if(shadingMode > 5)
        shadingMode = 5;
    if(shadingMode < 1)
        shadingMode = 1;

    let shading = document.getElementById("shading");
    if (shadingMode === 1) {
        shading.innerText = "Gouraud";
    } else if (shadingMode === 2) {
        shading.innerText = "Phong";
    } else if (shadingMode === 3) {
        shading.innerText = "Depth";
    } else if (shadingMode === 4) {
        shading.innerText = "Rim";
    } else if (shadingMode === 5) {
        shading.innerText = "Cel";
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

/* Mouse Listeners : Manipulating the final scene */
let flag = 0;
let lastPos = null;

let selected = 0;
function clickSelect(ev, gl, canvas) {
    flag = ev.button + 1;
    lastPos = glMouseCoords(ev, canvas);

    gl.clear(gl.COLOR_BUFFER_BIT);
    drawScene(gl);

    let mPos = canvasMouseCoords(ev, canvas);

    let pixel = new Uint8Array(4);
    gl.readPixels(mPos.x, mPos.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    console.log("Color:" + pixel);
    if (pixel[3] === 253) {
        selected = 2;
    } else if(pixel[3] === 254) {
        selected = 1;
    } else {
        selected = 0;
    }

    gl.uniform1f(u_Selected_Click, selected);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function unclick(ev, gl, canvas) {
    lastPos = glMouseCoords(ev, canvas);
    flag = 0;
}

function dragM(ev, gl, canvas) {
    if (selected === 1 || selected === 2) {
        let pos = glMouseCoords(ev, canvas);
        let deltaX = pos.x - lastPos.x;
        let deltaY = pos.y - lastPos.y;

        if (selected === 1) {
            if (flag === 1) {
                translateXYM(deltaX, deltaY);
            } else if (flag === 2) {
                translateZM(deltaY);
                rotateZM(deltaX);
            } else if (flag === 3) {
                rotateXYM(deltaX, deltaY);
            }
        } else if (selected === 2) {
            if (flag === 1) {
                ltranslateXYM(gl, deltaX, deltaY);
            } else if (flag === 2) {
                ltranslateZM(gl, deltaY);
                lrotateZM(deltaX);
            } else if (flag === 3) {
                lrotateXYM(deltaX, deltaY);
            }
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawScene(gl);

        lastPos = pos;
    }
}

function lrotateZM(deltaX) {
    lthetaZ = lthetaZ + deltaX;
}

function ltranslateZM(gl, deltaY) {
    lz = lz + deltaY;
    gl.uniform3fv(u_LightPosition, new Float32Array([lx, ly ,lz]));
}

function ltranslateXYM(gl, deltaX, deltaY) {
    lx = lx + deltaX;
    ly = ly + deltaY;
    gl.uniform3fv(u_LightPosition, new Float32Array([lx, ly ,lz]));
}

function lrotateXYM(deltaX, deltaY) {
    lthetaX = lthetaX + deltaY;
    lthetaY = lthetaY + deltaX;
}

function rotateZM(deltaX) {
    thetaZ = thetaZ + deltaX;
}

function translateZM(deltaY) {
    z = z + deltaY;
}

function translateXYM(deltaX, deltaY) {
    x = x + deltaX;
    y = y + deltaY;
}

function rotateXYM(deltaX, deltaY) {
    thetaX = thetaX + deltaY;
    thetaY = thetaY + deltaX;
}

function scaleM(ev, gl) {
    if (selected === 1) {
        scale = scale + ev.deltaY / 500;
    } else if(selected === 2) {
        lscale = lscale + ev.deltaY / 500;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(gl);
}

function updateModelMatrix(gl) {
    let newModel = new Matrix4();
    newModel.translate(x, y, z);
    newModel.rotate(thetaX, 1, 0, 0);
    newModel.rotate(thetaY, 0, 1, 0);
    newModel.rotate(thetaZ, 0, 0, 1);
    newModel.scale(scale, scale, scale);
    newModel.multiply(getShearMatrix(shearX, shearY));
    gl.uniformMatrix4fv(u_ModelMatrix, false, newModel.elements);

    newModel.invert();
    newModel.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, newModel.elements);
}

function lupdateModelMatrix(gl) {
    let newModel = new Matrix4();
    newModel.translate(lx, ly, lz);
    newModel.rotate(lthetaX, 1, 0, 0);
    newModel.rotate(lthetaY, 0, 1, 0);
    newModel.rotate(lthetaZ, 0, 0, 1);
    newModel.scale(lscale, lscale, lscale);
    newModel.multiply(getShearMatrix(lshearX, lshearY));
    gl.uniformMatrix4fv(u_ModelMatrix, false, newModel.elements);
}

function getShearMatrix(sX, sY) {
    let shearMat = {};
    shearMat.elements = [  1, sX,  0,  0,
                          sY,  1,  0,  0,
                           0,  0,  1,  0,
                           0,  0,  0,  1  ];
    return new Matrix4(shearMat);
}

/* Mouse Listeners : Drawing the polyline */
function clickDraw(ev, gl, canvas) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (ev.button === 0) {
        let mPos = glMouseCoords(ev, canvas);

        // Store the vertex information to g_points array
        pushVector(g_points, [mPos.x, mPos.y, 0]);
        pushVector(g_points, [0, 1, 0, 1]);
        pushVector(g_points, [1, 1, 1]);

        drawPolyline(gl);
    } else if (ev.button === 2 && g_points.length / VERTEX_SIZE > 1) {
        makeCylinders(gl);
        drawScene(gl);
        g_points = [];
        canvas.onmousemove = function (ev) {
            dragM(ev, gl, canvas);
        };
        window.onmousewheel = function(ev) {
            scaleM(ev, gl);
        };
        canvas.onmousedown = function (ev) {
            clickSelect(ev, gl, canvas);
        };
        canvas.onmouseup = function (ev) {
            unclick(ev, gl, canvas);
        };
    }
}

function move(ev, gl, canvas) {
    let mPos = glMouseCoords(ev, canvas);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (g_points.length > 0) {
        drawPolyline(gl);
        drawLineTo(gl, mPos.x, mPos.y);
    }
}

/* Debug Draws */
function drawPoint2D(gl, x, y) {
    let vertices = new Float32Array([
        x, y, 0,  1, 0, 0, 1,  1, 1, 1
    ]);
    setVertexBuffer(gl, vertices);
    gl.drawArrays(gl.POINTS, 0, 1);
}

function drawPoint3D(gl, x, y, z) {
    let vertices = new Float32Array([
        x, y, z,  1, 0, 0, 1,  1, 1, 1
    ]);
    setVertexBuffer(gl, vertices);
    gl.drawArrays(gl.POINTS, 0, 1);
}

function drawLine2D(gl, x1, y1, x2, y2) {
    let vertices = new Float32Array([
        x1, y1, 0,  1, 0, 0, 1,  1, 1, 1,
        x2, y2, 0,  1, 0, 0, 1,  1, 1, 1
    ]);
    setVertexBuffer(gl, vertices);
    gl.drawArrays(gl.LINES, 0, 2);
}

function drawLine3D(gl, x1, y1, z1, x2, y2, z2) {
    let vertices = new Float32Array([
        x1, y1, z1,  1, 0, 0, 1,  1, 1, 1,
        x2, y2, z2,  1, 0, 0, 1,  1, 1, 1
    ]);
    setVertexBuffer(gl, vertices);
    gl.drawArrays(gl.LINES, 0, 2);
}

function drawNormal(gl, i) {
    let v = getVertex(inds[i]);
    let n = getScaled(normalize(getNormal(inds[i])), 0.2);

    let end = getAddition(v, n);

    drawPoint3D(gl, v[0], v[1], v[2]);
    drawLine3D(gl, v[0], v[1], v[2], end[0], end[1], end[2]);
}

/* Vector & Math utils */
function getSurfaceNormal(p1, p2, p3) {
    let v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    let v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
    return getCrossProduct(v1, v2);
}

function getNormalizedSurfaceNormal(p1, p2, p3) {
    let v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    let v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
    return normalize(getCrossProduct(v1, v2));
}

function getCentroid(p1, p2, p3) {
    let xCent = (p1[0] + p2[0] + p3[0]) / 3;
    let yCent = (p1[1] + p2[1] + p3[1]) / 3;
    let zCent = (p1[2] + p2[2] + p3[2]) / 3;
    return [xCent, yCent, zCent];
}

function getAddition(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function getSubtraction(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function getDotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function getScaled(v, factor) {
    return [v[0] * factor, v[1] * factor, v[2] * factor];
}

function getCrossProduct(v1, v2) {
    let xCross = v1[1] * v2[2] - v1[2] * v2[1];
    let yCross = v1[2] * v2[0] - v1[0] * v2[2];
    let zCross = v1[0] * v2[1] - v1[1] * v2[0];
    return [xCross, yCross, zCross];
}

function normalize(v) {
    let mag = magnitude(v);
    return [v[0] / mag, v[1] / mag, v[2] / mag];
}

function magnitude(v) {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function getIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    let m1 = (y2 - y1) / (x2 - x1);
    let m2 = (y4 - y3) / (x4 - x3);

    let x = (m1 * x1 - m2 * x3 + y3 - y1) / (m1 - m2);
    let y = (m2 * y1 - m1 * y3 + m1 * m2 * (x3 - x1)) / (m2 - m1);

    return {'x': x, 'y': y}
}

/* pure utility functions */
function pushVector(arr, vect) {
    for (let elem of vect) {
        arr.push(elem);
    }
}

function glMouseCoords(ev, canvas) {
    let x = ev.clientX; // x coordinate of a mouse pointer
    let y = ev.clientY; // y coordinate of a mouse pointer
    let rect = ev.target.getBoundingClientRect();
    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    return {x: x, y: y};
}

function canvasMouseCoords(ev, canvas) {
    let x = ev.clientX; // x coordinate of a mouse pointer
    let y = ev.clientY; // y coordinate of a mouse pointer
    let rect = ev.target.getBoundingClientRect();
    x = x - rect.left;
    y = canvas.height - (y - 1.5 * rect.top);
    return {x, y};
}