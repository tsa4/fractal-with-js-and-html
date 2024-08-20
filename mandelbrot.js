let gl;
let program;
let offsetLocation;
let zoomLocation;
let resolutionLocation;

const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    void main() {
        gl_Position = aVertexPosition;
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 uResolution;
    uniform vec2 uOffset;
    uniform float uZoom;

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 c = (uv * 2.0 - 1.0) / uZoom + uOffset;

        vec2 z = c;
        int iteration;
        const int MAX_ITERATIONS = 100;
        float escapeRadius = 4.0;
        float color = 0.0;

        for (int i = 0; i < MAX_ITERATIONS; i++) {
            if (dot(z, z) > escapeRadius) break;
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            iteration = i;
        }

        color = float(iteration) / float(MAX_ITERATIONS);
        gl_FragColor = vec4(vec3(color), 1.0);
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

    offsetLocation = gl.getUniformLocation(program, 'uOffset');
    zoomLocation = gl.getUniformLocation(program, 'uZoom');
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

function drawScene(offset, zoom) {
    gl.uniform2f(offsetLocation, offset[0], offset[1]);
    gl.uniform1f(zoomLocation, zoom);
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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

let offset = [0, 0];
let zoom = .5;
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
        offset[0] -= dx / (gl.canvas.width * zoom);
        offset[1] += dy / (gl.canvas.height * zoom);
        lastMousePosition = [event.clientX, event.clientY];
        drawScene(offset, zoom);
    }
}

function handleMouseUp() {
    isDragging = false;
}

function handleWheel(event) {
    const zoomFactor = 1.1;
    zoom *= event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    drawScene(offset, zoom);
    event.preventDefault();
}

window.onload = function() {
    initWebGL();
    resizeCanvas();
    drawScene(offset, zoom);

    window.addEventListener('resize', function() {
        resizeCanvas();
        drawScene(offset, zoom);
    });

    gl.canvas.addEventListener('mousedown', handleMouseDown);
    gl.canvas.addEventListener('mousemove', handleMouseMove);
    gl.canvas.addEventListener('mouseup', handleMouseUp);
    gl.canvas.addEventListener('wheel', handleWheel);
};
