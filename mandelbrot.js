let gl;
let program;
let textureLocation;
let resolutionLocation;

const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vTextureCoord;
    void main() {
        gl_Position = aVertexPosition;
        vTextureCoord = (aVertexPosition.xy + 1.0) / 2.0;
    }
`;

const fragmentShaderSource = `
    precision highp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uTexture;
    void main() {
        gl_FragColor = texture2D(uTexture, vTextureCoord);
    }
`;

function initWebGL() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    program = createShaderProgram(vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    textureLocation = gl.getUniformLocation(program, 'uTexture');
    resolutionLocation = gl.getUniformLocation(program, 'uResolution');
}

function createShaderProgram(vsSource, fsSource) {
    const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function calculateMandelbrot(width, height, offsetX, offsetY, zoom) {
    const data = new Uint8Array(width * height * 4);
    const MAX_ITERATIONS = 1000;
    const ESCAPE_RADIUS = new Decimal(4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cReal = new Decimal(x).minus(width / 2).dividedBy(zoom).plus(offsetX);
            const cImag = new Decimal(y).minus(height / 2).dividedBy(zoom).plus(offsetY);

            let zReal = new Decimal(0);
            let zImag = new Decimal(0);
            let iteration = 0;

            while (iteration < MAX_ITERATIONS && zReal.times(zReal).plus(zImag.times(zImag)).lessThan(ESCAPE_RADIUS)) {
                const zRealNew = zReal.times(zReal).minus(zImag.times(zImag)).plus(cReal);
                zImag = zReal.times(zImag).times(2).plus(cImag);
                zReal = zRealNew;
                iteration++;
            }

            const index = (y * width + x) * 4;
            const color = iteration === MAX_ITERATIONS ? 0 : Math.floor((iteration / MAX_ITERATIONS) * 255);
            data[index] = color;
            data[index + 1] = color;
            data[index + 2] = color;
            data[index + 3] = 255;
        }
    }

    return data;
}

function drawScene(offsetX, offsetY, zoom) {
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    const mandelbrotData = calculateMandelbrot(width, height, offsetX, offsetY, zoom);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, mandelbrotData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(textureLocation, 0);
    gl.uniform2f(resolutionLocation, width, height);

    gl.viewport(0, 0, width, height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function resizeCanvas() {
    const canvas = gl.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

let offsetX = new Decimal(0);
let offsetY = new Decimal(0);
let zoom = new Decimal(200);
let isDragging = false;
let lastMousePosition = [0, 0];

function handleMouseDown(event) {
    isDragging = true;
    lastMousePosition = [event.clientX, event.clientY];
}

function handleMouseMove(event) {
    if (isDragging) {
        const dx = event.clientX - lastMousePosition[0];
        const dy = event.clientY - lastMousePosition[1];
        offsetX = offsetX.minus(new Decimal(dx).dividedBy(zoom));
        offsetY = offsetY.plus(new Decimal(dy).dividedBy(zoom));
        lastMousePosition = [event.clientX, event.clientY];
        drawScene(offsetX, offsetY, zoom);
    }
}

function handleMouseUp() {
    isDragging = false;
}

function handleWheel(event) {
    const zoomFactor = new Decimal(1.1);
    zoom = event.deltaY < 0 ? zoom.times(zoomFactor) : zoom.dividedBy(zoomFactor);
    drawScene(offsetX, offsetY, zoom);
    event.preventDefault();
}

window.onload = function() {
    initWebGL();
    resizeCanvas();
    drawScene(offsetX, offsetY, zoom);

    window.addEventListener('resize', function() {
        resizeCanvas();
        drawScene(offsetX, offsetY, zoom);
    });

    gl.canvas.addEventListener('mousedown', handleMouseDown);
    gl.canvas.addEventListener('mousemove', handleMouseMove);
    gl.canvas.addEventListener('mouseup', handleMouseUp);
    gl.canvas.addEventListener('wheel', handleWheel);
};
