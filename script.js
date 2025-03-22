// Global state management
const AppState = {
    theme: 'light', // Default theme is light
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    gridEnabled: true,
    snapToGrid: true,
    undoStack: [],
    redoStack: [],
    isSimulationRunning: false,
    simulationSpeed: 1,
    user: null,
    isDragging: false,
    isWiring: false,
    selectedComponent: null,
    wireStartPoint: null,
    wireEndPoint: null,
    gridSize: 20,
    darkMode: false,
    simulation: {
        isRunning: false,
        speed: 1,
        type: 'tran'
    },
    // Add templates to the global state
    selectedTemplate: null
};

// Circuit templates library
const CircuitTemplates = [
    {
        id: 'voltage-divider',
        name: 'Voltage Divider',
        description: 'A simple resistive voltage divider circuit',
        components: [
            { type: 'voltage-source', x: 200, y: 200, properties: { voltage: { value: 10, unit: 'V' } } },
            { type: 'resistor', x: 300, y: 150, properties: { resistance: { value: 1000, unit: 'Ω' } } },
            { type: 'resistor', x: 300, y: 250, properties: { resistance: { value: 1000, unit: 'Ω' } } },
            { type: 'ground', x: 200, y: 300 }
        ],
        connections: [
            { start: { componentIndex: 0, pointIndex: 0 }, end: { componentIndex: 1, pointIndex: 0 } },
            { start: { componentIndex: 1, pointIndex: 1 }, end: { componentIndex: 2, pointIndex: 0 } },
            { start: { componentIndex: 2, pointIndex: 1 }, end: { componentIndex: 3, pointIndex: 0 } },
            { start: { componentIndex: 3, pointIndex: 0 }, end: { componentIndex: 0, pointIndex: 1 } }
        ]
    },
    {
        id: 'low-pass-filter',
        name: 'Low Pass Filter',
        description: 'RC low pass filter circuit',
        components: [
            { type: 'voltage-source', x: 200, y: 200, properties: { voltage: { value: 5, unit: 'V' }, frequency: { value: 1000, unit: 'Hz' } } },
            { type: 'resistor', x: 300, y: 150, properties: { resistance: { value: 1000, unit: 'Ω' } } },
            { type: 'capacitor', x: 400, y: 200, properties: { capacitance: { value: 1, unit: 'µF' } } },
            { type: 'ground', x: 300, y: 300 }
        ],
        connections: [
            { start: { componentIndex: 0, pointIndex: 0 }, end: { componentIndex: 1, pointIndex: 0 } },
            { start: { componentIndex: 1, pointIndex: 1 }, end: { componentIndex: 2, pointIndex: 0 } },
            { start: { componentIndex: 2, pointIndex: 1 }, end: { componentIndex: 3, pointIndex: 0 } },
            { start: { componentIndex: 3, pointIndex: 0 }, end: { componentIndex: 0, pointIndex: 1 } }
        ]
    },
    {
        id: 'high-pass-filter',
        name: 'High Pass Filter',
        description: 'RC high pass filter circuit',
        components: [
            { type: 'voltage-source', x: 200, y: 200, properties: { voltage: { value: 5, unit: 'V' }, frequency: { value: 1000, unit: 'Hz' } } },
            { type: 'capacitor', x: 300, y: 150, properties: { capacitance: { value: 1, unit: 'µF' } } },
            { type: 'resistor', x: 400, y: 200, properties: { resistance: { value: 1000, unit: 'Ω' } } },
            { type: 'ground', x: 300, y: 300 }
        ],
        connections: [
            { start: { componentIndex: 0, pointIndex: 0 }, end: { componentIndex: 1, pointIndex: 0 } },
            { start: { componentIndex: 1, pointIndex: 1 }, end: { componentIndex: 2, pointIndex: 0 } },
            { start: { componentIndex: 2, pointIndex: 1 }, end: { componentIndex: 3, pointIndex: 0 } },
            { start: { componentIndex: 3, pointIndex: 0 }, end: { componentIndex: 0, pointIndex: 1 } }
        ]
    },
    {
        id: 'voltage-follower',
        name: 'Voltage Follower',
        description: 'Op-amp voltage follower (buffer) circuit',
        components: [
            { type: 'voltage-source', x: 150, y: 200, properties: { voltage: { value: 5, unit: 'V' } } },
            { type: 'op-amp', x: 300, y: 200 },
            { type: 'ground', x: 200, y: 300 }
        ],
        connections: [
            { start: { componentIndex: 0, pointIndex: 0 }, end: { componentIndex: 1, pointIndex: 0 } },
            { start: { componentIndex: 1, pointIndex: 2 }, end: { componentIndex: 1, pointIndex: 0 } },
            { start: { componentIndex: 0, pointIndex: 1 }, end: { componentIndex: 2, pointIndex: 0 } }
        ]
    }
];

// Enhanced Component Class
class Component {
    constructor(type, x, y, customProperties = null) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        
        // Get default properties first
        const defaultProps = this.getDefaultProperties(type);
        
        // Override with custom properties if provided
        if (customProperties) {
            this.properties = defaultProps;
            
            // Apply custom properties over defaults
            Object.entries(customProperties).forEach(([key, value]) => {
                if (this.properties[key]) {
                    // Override default values with custom ones
                    this.properties[key].value = value.value;
                    if (value.unit) {
                        this.properties[key].unit = value.unit;
                    }
                }
            });
        } else {
            this.properties = defaultProps;
        }
        
        this.id = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.connectionPoints = this.createConnectionPoints();
        this.values = {
            voltage: 0,
            current: 0,
            power: 0
        };
        this.tooltip = this.createTooltip();
    }

    getDefaultProperties(type) {
        const defaults = {
            resistor: { 
                resistance: { value: 1000, unit: 'Ω', min: 0, max: 1e6 }
            },
            capacitor: { 
                capacitance: { value: 10, unit: 'µF', min: 0, max: 1e6 }
            },
            inductor: { 
                inductance: { value: 10, unit: 'mH', min: 0, max: 1e6 }
            },
            'voltage-source': { 
                voltage: { value: 5, unit: 'V', min: -1000, max: 1000 },
                frequency: { value: 60, unit: 'Hz', min: 0, max: 1e6 }
            },
            'current-source': {
                current: { value: 0.1, unit: 'A', min: -100, max: 100 }
            },
            diode: { 
                forward_voltage: { value: 0.7, unit: 'V', min: 0, max: 10 }
            },
            transistor: { 
                gain: { value: 100, unit: 'β', min: 0, max: 1000 }
            },
            'logic-gate': {
                type: { value: 'AND', options: ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'] }
            }
        };
        return defaults[type] || {};
    }

    createConnectionPoints() {
        const points = [];
        const baseConfig = {
            radius: 5,
            color: '#2196F3',
            hoverColor: '#1976D2',
            connectedColor: '#4CAF50'
        };

        switch (this.type) {
            case 'resistor':
            case 'capacitor':
            case 'inductor':
            case 'diode':
                points.push(
                    { x: -20, y: 0, type: 'input', ...baseConfig },
                    { x: 20, y: 0, type: 'output', ...baseConfig }
                );
                break;
            case 'voltage-source':
            case 'current-source':
                points.push(
                    { x: 0, y: -20, type: 'positive', ...baseConfig },
                    { x: 0, y: 20, type: 'negative', ...baseConfig }
                );
                break;
            case 'transistor':
                points.push(
                    { x: -20, y: 0, type: 'base', ...baseConfig },
                    { x: 20, y: -10, type: 'collector', ...baseConfig },
                    { x: 20, y: 10, type: 'emitter', ...baseConfig }
                );
                break;
            case 'logic-gate':
                if (this.properties.type.value === 'NOT') {
                    points.push(
                        { x: -20, y: 0, type: 'input', ...baseConfig },
                        { x: 20, y: 0, type: 'output', ...baseConfig }
                    );
                } else {
                    points.push(
                        { x: -20, y: -10, type: 'input1', ...baseConfig },
                        { x: -20, y: 10, type: 'input2', ...baseConfig },
                        { x: 20, y: 0, type: 'output', ...baseConfig }
                    );
                }
                break;
        }
        return points;
    }

    createTooltip() {
        return {
            title: this.getComponentTitle(),
            description: this.getComponentDescription(),
            properties: Object.entries(this.properties).map(([key, value]) => ({
                name: key.replace('_', ' ').toUpperCase(),
                value: value.value,
                unit: value.unit
            }))
        };
    }

    getComponentTitle() {
        const titles = {
            resistor: 'Resistor',
            capacitor: 'Capacitor',
            inductor: 'Inductor',
            'voltage-source': 'Voltage Source',
            'current-source': 'Current Source',
            diode: 'Diode',
            transistor: 'Transistor',
            'logic-gate': `${this.properties.type.value} Gate`
        };
        return titles[this.type] || 'Unknown Component';
    }

    getComponentDescription() {
        const descriptions = {
            resistor: 'Passive component that implements electrical resistance',
            capacitor: 'Stores electrical energy in an electric field',
            inductor: 'Stores electrical energy in a magnetic field',
            'voltage-source': 'Provides constant or varying voltage',
            'current-source': 'Provides constant or varying current',
            diode: 'Allows current flow in one direction',
            transistor: 'Semiconductor device for switching or amplifying',
            'logic-gate': 'Digital logic component for boolean operations'
        };
        return descriptions[this.type] || '';
    }

    rotate(angle) {
        this.rotation = (this.rotation + angle) % 360;
        this.connectionPoints = this.connectionPoints.map(point => {
            const rad = angle * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            return {
                ...point,
                x: point.x * cos - point.y * sin,
                y: point.x * sin + point.y * cos
            };
        });
    }

    // Add method to move the component and its connection points
    moveComponent(newX, newY) {
        // Calculate the difference in position
        const dx = newX - this.x;
        const dy = newY - this.y;
        
        // Update component position
        this.x = newX;
        this.y = newY;
        
        // Update all connection points by the same displacement
        this.connectionPoints = this.connectionPoints.map(point => ({
            ...point,
            x: point.x + dx,
            y: point.y + dy
        }));
        
        return { dx, dy }; // Return displacement for updating attached wires
    }

    // Get connection point at a specific location
    getConnectionPointAt(x, y, tolerance = 10) {
        return this.connectionPoints.find(point => {
            const absoluteX = this.x + point.x;
            const absoluteY = this.y + point.y;
            const distance = Math.sqrt(
                Math.pow(absoluteX - x, 2) + 
                Math.pow(absoluteY - y, 2)
            );
            return distance <= tolerance;
        });
    }

    updateValue(type, value) {
        this.values[type] = value;
        this.updateTooltip();
    }

    updateTooltip() {
        const values = Object.entries(this.values)
            .map(([key, value]) => `${key}: ${value.toFixed(2)}`)
            .join('\n');
        this.tooltip.values = values;
    }

    setupValueEditor() {
        const editor = document.createElement('div');
        editor.className = 'component-editor';
        editor.innerHTML = `
            <div class="editor-header">${this.getComponentTitle()}</div>
            <div class="editor-content">
                ${this.createPropertyInputs()}
            </div>
            <div class="editor-footer">
                <button class="apply-btn">Apply</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(editor);
        this.positionEditor(editor);
        this.setupEditorEvents(editor);
    }

    createPropertyInputs() {
        return Object.entries(this.properties)
            .map(([key, prop]) => `
                <div class="property-group">
                    <label>${key.replace('_', ' ').toUpperCase()}</label>
                    <div class="input-group">
                        <input type="number" 
                               value="${prop.value}"
                               min="${prop.min}"
                               max="${prop.max}"
                               step="${this.getStepValue(prop.value)}"
                        >
                        <span class="unit">${prop.unit}</span>
                    </div>
                </div>
            `).join('');
    }

    getStepValue(value) {
        if (value < 1) return 0.1;
        if (value < 10) return 1;
        if (value < 100) return 10;
        return 100;
    }

    positionEditor(editor) {
        const rect = this.element.getBoundingClientRect();
        editor.style.left = `${rect.right + 10}px`;
        editor.style.top = `${rect.top}px`;
    }

    setupEditorEvents(editor) {
        const applyBtn = editor.querySelector('.apply-btn');
        const cancelBtn = editor.querySelector('.cancel-btn');
        
        applyBtn.addEventListener('click', () => {
            const inputs = editor.querySelectorAll('input');
            inputs.forEach(input => {
                const property = input.closest('.property-group').querySelector('label').textContent.toLowerCase();
                this.properties[property].value = parseFloat(input.value);
            });
            this.updateTooltip();
            document.body.removeChild(editor);
        });
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(editor);
        });
    }
}

// Wire Class with Enhanced Features
class Wire {
    constructor(startPoint, endPoint) {
        this.id = `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.startPoint = { x: startPoint.x, y: startPoint.y };
        this.endPoint = { x: endPoint.x, y: endPoint.y };
        this.color = '#2196F3';
        this.width = 2;
        this.selected = false;
        this.current = 0;
        this.voltage = 0;
        
        // Initialize connections to null
        this.startConnection = startPoint.connection || null;
        this.endConnection = endPoint.connection || null;
        
        // Calculate path after connections are set
        this.path = this.calculatePath();
        
        // Find connections to components if available and not already set
        if (window.componentManager && (!this.startConnection || !this.endConnection)) {
            this.findComponentConnections();
        }
    }
    
    // Find which components and connection points this wire is connected to
    findComponentConnections() {
        const componentManager = window.componentManager;
        const tolerance = 5;
        
        for (const component of componentManager.components.values()) {
            component.connectionPoints.forEach((connectionPoint, pointIndex) => {
                const absoluteX = component.x + connectionPoint.x;
                const absoluteY = component.y + connectionPoint.y;
                
                // Check start point if not already connected
                if (!this.startConnection) {
                const startDistance = Math.sqrt(
                    Math.pow(this.startPoint.x - absoluteX, 2) + 
                    Math.pow(this.startPoint.y - absoluteY, 2)
                );
                
                if (startDistance <= tolerance) {
                    this.startConnection = {
                        componentId: component.id,
                            connectionPointIndex: pointIndex
                        };
                        
                        // Update start point to exact position
                        this.startPoint.x = absoluteX;
                        this.startPoint.y = absoluteY;
                    }
                }
                
                // Check end point if not already connected
                if (!this.endConnection) {
                    const endDistance = Math.sqrt(
                        Math.pow(this.endPoint.x - absoluteX, 2) + 
                        Math.pow(this.endPoint.y - absoluteY, 2)
                    );
                
                if (endDistance <= tolerance) {
                    this.endConnection = {
                        componentId: component.id,
                            connectionPointIndex: pointIndex
                        };
                        
                        // Update end point to exact position
                        this.endPoint.x = absoluteX;
                        this.endPoint.y = absoluteY;
                    }
                }
            });
        }
        
        // Recalculate path if connections were found
        if (this.startConnection || this.endConnection) {
            this.path = this.calculatePath();
        }
    }

    // Enhance Wire class calculatePath method to create better curves
    calculatePath() {
        const start = { x: this.startPoint.x, y: this.startPoint.y };
        const end = { x: this.endPoint.x, y: this.endPoint.y };
        
        // Calculate control points for smooth curves
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // Adjust curve based on distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        const midX = start.x + dx / 2;
        
        // Modify curve height based on distance for better aesthetics
        const curveHeight = Math.min(Math.max(distance * 0.2, 20), 60);
        
        // For primarily horizontal wires (more x distance than y)
        if (Math.abs(dx) >= Math.abs(dy)) {
        return {
            start,
            control1: { x: midX, y: start.y },
            control2: { x: midX, y: end.y },
            end
        };
        } 
        // For primarily vertical wires
        else {
            const midY = start.y + dy / 2;
            return {
                start,
                control1: { x: start.x, y: midY },
                control2: { x: end.x, y: midY },
                end
            };
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.path.start.x, this.path.start.y);
        ctx.bezierCurveTo(
            this.path.control1.x, this.path.control1.y,
            this.path.control2.x, this.path.control2.y,
            this.path.end.x, this.path.end.y
        );
        
        ctx.strokeStyle = this.selected ? '#f44336' : this.color;
        ctx.lineWidth = this.selected ? this.width + 1 : this.width;
        ctx.stroke();

        // Draw current direction indicator
        if (this.current !== 0) {
            this.drawCurrentIndicator(ctx);
        }
    }

    drawCurrentIndicator(ctx) {
        const arrowSize = 8;
        const t = 0.5; // Position along the curve (0 to 1)
        const point = this.getPointOnCurve(t);
        const tangent = this.getCurveTangent(t);
        const angle = Math.atan2(tangent.y, tangent.x);

        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(-arrowSize, -arrowSize/2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-arrowSize, arrowSize/2);
        
        ctx.strokeStyle = this.current > 0 ? '#4CAF50' : '#f44336';
        ctx.stroke();
        ctx.restore();
    }

    getPointOnCurve(t) {
        const { start, control1, control2, end } = this.path;
        const t1 = 1 - t;
        
        return {
            x: Math.pow(t1, 3) * start.x +
               3 * Math.pow(t1, 2) * t * control1.x +
               3 * t1 * Math.pow(t, 2) * control2.x +
               Math.pow(t, 3) * end.x,
            y: Math.pow(t1, 3) * start.y +
               3 * Math.pow(t1, 2) * t * control1.y +
               3 * t1 * Math.pow(t, 2) * control2.y +
               Math.pow(t, 3) * end.y
        };
    }

    getCurveTangent(t) {
        const { start, control1, control2, end } = this.path;
        const t1 = 1 - t;
        
        return {
            x: -3 * Math.pow(t1, 2) * start.x +
               3 * Math.pow(t1, 2) * control1.x -
               6 * t1 * t * control1.x +
               6 * t1 * t * control2.x -
               3 * Math.pow(t, 2) * control2.x +
               3 * Math.pow(t, 2) * end.x,
            y: -3 * Math.pow(t1, 2) * start.y +
               3 * Math.pow(t1, 2) * control1.y -
               6 * t1 * t * control1.y +
               6 * t1 * t * control2.y -
               3 * Math.pow(t, 2) * control2.y +
               3 * Math.pow(t, 2) * end.y
        };
    }

    containsPoint(point) {
        const threshold = 5;
        const steps = 50;
        
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const p = this.getPointOnCurve(t);
            const dx = point.x - p.x;
            const dy = point.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }
}

// Canvas Management
class CanvasManager {
    constructor() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.componentCanvas = document.getElementById('component-canvas');
        this.wireCanvas = document.getElementById('wire-canvas');
        this.interactionCanvas = document.getElementById('interaction-canvas');
        
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.componentCtx = this.componentCanvas.getContext('2d');
        this.wireCtx = this.wireCanvas.getContext('2d');
        this.interactionCtx = this.interactionCanvas.getContext('2d');
        
        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    resizeCanvases() {
        const container = document.querySelector('.circuit-board');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        [this.gridCanvas, this.componentCanvas, this.wireCanvas, this.interactionCanvas].forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });
        
        this.drawGrid();
    }

    drawGrid() {
        const { width, height } = this.gridCanvas;
        this.gridCtx.clearRect(0, 0, width, height);
        
        // Get the computed grid color from CSS variables based on current theme
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();
        
        this.gridCtx.strokeStyle = gridColor || 'rgba(0, 0, 0, 0.05)';
        this.gridCtx.lineWidth = 1;
        
        const gridSize = AppState.gridSize * AppState.zoom;
        const offsetX = AppState.panOffset.x % gridSize;
        const offsetY = AppState.panOffset.y % gridSize;
        
        // Only draw grid if enabled
        if (AppState.gridSize === 0) return;
        
        for (let x = offsetX; x < width; x += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, height);
            this.gridCtx.stroke();
        }
        
        for (let y = offsetY; y < height; y += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(width, y);
            this.gridCtx.stroke();
        }
    }

    clearCanvas(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
}

// Component Management
class ComponentManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.components = new Map();
        this.draggedComponent = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.componentIdCounter = 0;
        this.setupDragAndDrop();
        this.setupGlobalEvents(); // Add this line
    }

    setupDragAndDrop() {
        const componentsContainer = document.querySelector('.components-panel');
        const circuitBoard = document.querySelector('.circuit-board');
        
        // Setup for dragging components from the panel
        const components = componentsContainer.querySelectorAll('.component');
        components.forEach(component => {
            component.addEventListener('dragstart', (e) => this.handleDragStart(e));
            component.addEventListener('drag', (e) => this.handleDrag(e));
            component.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
        
        // Setup for the circuit board drop zone
        circuitBoard.addEventListener('dragover', (e) => this.handleDragOver(e));
        circuitBoard.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Setup for component movement within circuit board
        this.canvasManager.componentCanvas.addEventListener('mousedown', (e) => this.handleComponentMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleComponentMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleComponentMouseUp(e));
    }

    // Find a component at a specific position
    findComponentAt(x, y) {
        for (const component of this.components.values()) {
            // Check if coordinates are within component's bounds (simple rectangle check)
            const componentSize = 40; // Approximate size of components
            const halfSize = componentSize / 2;
            
            if (x >= component.x - halfSize && 
                x <= component.x + halfSize && 
                y >= component.y - halfSize && 
                y <= component.y + halfSize) {
                return component;
            }
        }
        return null;
    }
    
    // Handle mousedown on components
    handleComponentMouseDown(e) {
        const rect = this.canvasManager.componentCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find if we clicked on a component
        const component = this.findComponentAt(x, y);
        if (component) {
            this.draggedComponent = component;
            this.dragStartX = x;
            this.dragStartY = y;
            e.preventDefault(); // Prevent text selection during drag
        }
    }
    
    // Handle mouse movement for component dragging with improved connection tracking
    handleComponentMouseMove(e) {
        if (!this.draggedComponent) return;
        
        const rect = this.canvasManager.componentCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // Apply grid snapping if enabled
        if (AppState.snapToGrid) {
            x = Math.round(x / AppState.gridSize) * AppState.gridSize;
            y = Math.round(y / AppState.gridSize) * AppState.gridSize;
        }
        
        // Create a copy of the current component state to track position changes
        const originalComponent = {
            id: this.draggedComponent.id,
            x: this.draggedComponent.x,
            y: this.draggedComponent.y,
            connectionPoints: JSON.parse(JSON.stringify(this.draggedComponent.connectionPoints))
        };
        
        // Move the component to the new position
        const { dx, dy } = this.draggedComponent.moveComponent(x, y);
        
        // Directly update all wires connected to this component for immediate feedback
        if (window.wireManager) {
            const wireManager = window.wireManager;
            
            // Update all wires connected to this component
            for (const wire of wireManager.wires.values()) {
                let updated = false;
                
                // Check for start connection to this component
                if (wire.startConnection && wire.startConnection.componentId === this.draggedComponent.id) {
                    const index = wire.startConnection.connectionPointIndex;
                    if (index >= 0 && index < this.draggedComponent.connectionPoints.length) {
                        // Always update to exact position to prevent disconnection during fast moves
                        wire.startPoint.x = this.draggedComponent.x + this.draggedComponent.connectionPoints[index].x;
                        wire.startPoint.y = this.draggedComponent.y + this.draggedComponent.connectionPoints[index].y;
                        updated = true;
                    }
                }
                
                // Check for end connection to this component
                if (wire.endConnection && wire.endConnection.componentId === this.draggedComponent.id) {
                    const index = wire.endConnection.connectionPointIndex;
                    if (index >= 0 && index < this.draggedComponent.connectionPoints.length) {
                        // Always update to exact position to prevent disconnection during fast moves
                        wire.endPoint.x = this.draggedComponent.x + this.draggedComponent.connectionPoints[index].x;
                        wire.endPoint.y = this.draggedComponent.y + this.draggedComponent.connectionPoints[index].y;
                        updated = true;
                    }
                }
                
                // If wire has no record of connection but was near a connection point of the original component,
                // we should maintain that connection (handles fast movement disconnections)
                if (!updated) {
                    const reconnectionTolerance = 15; // Use a larger tolerance for fast movements
                    
                    // Check if the wire's start point was near any of the original connection points
                    if (!wire.startConnection) {
                        for (let i = 0; i < originalComponent.connectionPoints.length; i++) {
                            const originalPoint = originalComponent.connectionPoints[i];
                            const originalX = originalComponent.x + originalPoint.x;
                            const originalY = originalComponent.y + originalPoint.y;
                            
                            const distance = Math.sqrt(
                                Math.pow(wire.startPoint.x - originalX, 2) + 
                                Math.pow(wire.startPoint.y - originalY, 2)
                            );
                            
                            if (distance <= reconnectionTolerance) {
                                // This wire was close to a connection point before movement
                                wire.startConnection = {
                                    componentId: this.draggedComponent.id,
                                    connectionPointIndex: i
                                };
                                
                                // Update to match the new position
                                wire.startPoint.x = this.draggedComponent.x + this.draggedComponent.connectionPoints[i].x;
                                wire.startPoint.y = this.draggedComponent.y + this.draggedComponent.connectionPoints[i].y;
                                updated = true;
                                break;
                            }
                        }
                    }
                    
                    // Check if the wire's end point was near any of the original connection points
                    if (!wire.endConnection) {
                        for (let i = 0; i < originalComponent.connectionPoints.length; i++) {
                            const originalPoint = originalComponent.connectionPoints[i];
                            const originalX = originalComponent.x + originalPoint.x;
                            const originalY = originalComponent.y + originalPoint.y;
                            
                            const distance = Math.sqrt(
                                Math.pow(wire.endPoint.x - originalX, 2) + 
                                Math.pow(wire.endPoint.y - originalY, 2)
                            );
                            
                            if (distance <= reconnectionTolerance) {
                                // This wire was close to a connection point before movement
                                wire.endConnection = {
                                    componentId: this.draggedComponent.id,
                                    connectionPointIndex: i
                                };
                                
                                // Update to match the new position
                                wire.endPoint.x = this.draggedComponent.x + this.draggedComponent.connectionPoints[i].x;
                                wire.endPoint.y = this.draggedComponent.y + this.draggedComponent.connectionPoints[i].y;
                                updated = true;
                                break;
                            }
                        }
                    }
                }
                
                // Recalculate wire path if it was updated
                if (updated) {
                    wire.path = wire.calculatePath();
                }
            }
            
            // Redraw wires after all updates
            wireManager.redrawWires();
        }
        
        // Redraw the component and circuit
        this.redrawCircuit();
    }
    
    // Handle mouseup after dragging a component
    handleComponentMouseUp(e) {
        if (this.draggedComponent) {
            // Force update all wire connections after drag completes
            this.forceUpdateWires();
            // Clear the dragged component reference
        this.draggedComponent = null;
        }
    }
    
    // Update wires connected to a moved component
    updateConnectedWires(component, dx, dy) {
        const wireManager = window.wireManager;
        
        if (!wireManager || !wireManager.wires) {
            console.warn('Wire manager not available or initialized');
            return;
        }
        
        for (const wire of wireManager.wires.values()) {
            let wireUpdated = false;
            
            // Check if start point is connected to this component
            if (wire.startConnection && wire.startConnection.componentId === component.id) {
                // Get the specific connection point
                const connectionPointIndex = wire.startConnection.connectionPointIndex;
                if (connectionPointIndex >= 0 && connectionPointIndex < component.connectionPoints.length) {
                    const connectionPoint = component.connectionPoints[connectionPointIndex];
                    // Update wire start point to the new component connection point position
                    wire.startPoint.x = component.x + connectionPoint.x;
                    wire.startPoint.y = component.y + connectionPoint.y;
                    wireUpdated = true;
                }
            }
            
            // Check if end point is connected to this component
            if (wire.endConnection && wire.endConnection.componentId === component.id) {
                // Get the specific connection point
                const connectionPointIndex = wire.endConnection.connectionPointIndex;
                if (connectionPointIndex >= 0 && connectionPointIndex < component.connectionPoints.length) {
                    const connectionPoint = component.connectionPoints[connectionPointIndex];
                    // Update wire end point to the new component connection point position
                    wire.endPoint.x = component.x + connectionPoint.x;
                    wire.endPoint.y = component.y + connectionPoint.y;
                    wireUpdated = true;
                }
            }
            
            // If wire wasn't updated using specific connection info, use position-based detection
            if (!wireUpdated) {
                // Check if this wire is connected to any of the component's connection points
                const startConnected = this.isPointConnectedToComponent(wire.startPoint, component);
                const endConnected = this.isPointConnectedToComponent(wire.endPoint, component);
                
                // Update wire endpoints if connected
                if (startConnected) {
                    wire.startPoint.x += dx;
                    wire.startPoint.y += dy;
                }
                
                if (endConnected) {
                    wire.endPoint.x += dx;
                    wire.endPoint.y += dy;
                }
            }
            
            // Recalculate wire path after updating endpoints
            wire.path = wire.calculatePath();
        }
        
        // Force redraw of all wires
        wireManager.redrawWires();
    }
    
    // Check if a point is connected to a component's connection point with improved accuracy
    isPointConnectedToComponent(point, component) {
        const tolerance = 5; // Reduced tolerance for more precise detection
        
        for (const connectionPoint of component.connectionPoints) {
            const absoluteX = component.x + connectionPoint.x;
            const absoluteY = component.y + connectionPoint.y;
            const distance = Math.sqrt(
                Math.pow(absoluteX - point.x, 2) + 
                Math.pow(absoluteY - point.y, 2)
            );
            
            if (distance <= tolerance) {
                return true;
            }
        }
        
        return false;
    }
    
    // Redraw the entire circuit
    redrawCircuit() {
        // Clear the canvas
        this.canvasManager.clearCanvas(this.canvasManager.componentCtx);
        
        // Redraw all components
        for (const component of this.components.values()) {
            this.drawComponent(component);
        }
        
        // Redraw wires if wireManager exists
        if (window.wireManager) {
            window.wireManager.redrawWires();
        }
    }

    handleDragStart(e) {
        if (AppState.isDrawingWire) return;
        
        const componentEl = e.target;
        const componentType = componentEl.dataset.component;
        const preview = document.createElement('div');
        preview.className = 'component-preview';
        document.body.appendChild(preview);
        e.dataTransfer.setDragImage(preview, 0, 0);
        e.dataTransfer.setData('text/plain', componentType);
        AppState.isDragging = true;
        AppState.selectedComponent = componentEl;
        
        setTimeout(() => document.body.removeChild(preview), 0);
    }

    handleDrag(e) {
        if (!AppState.isDragging) return;
        
        const rect = this.canvasManager.componentCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.canvasManager.clearCanvas(this.canvasManager.interactionCtx);
        this.drawComponentPreview(x, y, AppState.selectedComponent.dataset.component);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDragEnd(e) {
        AppState.isDragging = false;
        AppState.selectedComponent = null;
        this.canvasManager.clearCanvas(this.canvasManager.interactionCtx);
    }

    handleDrop(e) {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('text/plain');
        const rect = this.canvasManager.componentCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        if (AppState.snapToGrid) {
            x = Math.round(x / AppState.gridSize) * AppState.gridSize;
            y = Math.round(y / AppState.gridSize) * AppState.gridSize;
        }
        
        this.createComponent(componentType, x, y);
    }

    createComponent(type, x, y, customProperties = null) {
        const component = new Component(type, x, y, customProperties);
        this.components.set(component.id, component);
        this.drawComponent(component);
        return component;
    }

    drawComponent(component) {
        const ctx = this.canvasManager.componentCtx;
        component.draw(ctx);
    }

    drawComponentPreview(x, y, type) {
        const ctx = this.canvasManager.interactionCtx;
        ctx.globalAlpha = 0.5;
        this.drawComponentShape(ctx, x, y, type);
        ctx.globalAlpha = 1;
    }

    drawComponentShape(ctx, x, y, type) {
        ctx.save();
        ctx.translate(x, y);
        
        switch (type) {
            case 'resistor':
                this.drawResistor(ctx);
                break;
            case 'capacitor':
                this.drawCapacitor(ctx);
                break;
            case 'inductor':
                this.drawInductor(ctx);
                break;
            case 'voltage-source':
                this.drawVoltageSource(ctx);
                break;
            case 'current-source':
                this.drawCurrentSource(ctx);
                break;
            // Add more component drawings
        }
        
        ctx.restore();
    }

    // Component drawing methods
    drawResistor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-7, -10);
        ctx.lineTo(-3, 10);
        ctx.lineTo(3, -10);
        ctx.lineTo(7, 10);
        ctx.lineTo(10, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
    }

    drawCapacitor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-5, 0);
        ctx.moveTo(-5, -15);
        ctx.lineTo(-5, 15);
        ctx.moveTo(5, -15);
        ctx.lineTo(5, 15);
        ctx.moveTo(5, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
    }

    drawInductor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        for (let i = 0; i < 4; i++) {
            ctx.arc(-10 + i * 10, 0, 5, Math.PI, 0, false);
        }
        ctx.moveTo(20, 0);
        ctx.stroke();
    }

    drawVoltageSource(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
    }

    drawCurrentSource(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(3, -3);
        ctx.lineTo(5, 0);
        ctx.lineTo(3, 3);
        ctx.stroke();
    }

    // Add this new function to the ComponentManager class to force update all wire connections
    forceUpdateWires() {
        const wireManager = window.wireManager;
        
        if (!wireManager || !wireManager.wires) {
            console.warn('Wire manager not available or initialized');
            return;
        }
        
        for (const component of this.components.values()) {
            for (const wire of wireManager.wires.values()) {
                // Check if this wire is connected to this component at start point
                if (wire.startConnection && wire.startConnection.componentId === component.id) {
                    const connectionPointIndex = wire.startConnection.connectionPointIndex;
                    
                    if (connectionPointIndex >= 0 && connectionPointIndex < component.connectionPoints.length) {
                        const connectionPoint = component.connectionPoints[connectionPointIndex];
                        
                        // Update wire start point to match component connection point
                        wire.startPoint.x = component.x + connectionPoint.x;
                        wire.startPoint.y = component.y + connectionPoint.y;
                    }
                }
                
                // Check if this wire is connected to this component at end point
                if (wire.endConnection && wire.endConnection.componentId === component.id) {
                    const connectionPointIndex = wire.endConnection.connectionPointIndex;
                    
                    if (connectionPointIndex >= 0 && connectionPointIndex < component.connectionPoints.length) {
                        const connectionPoint = component.connectionPoints[connectionPointIndex];
                        
                        // Update wire end point to match component connection point
                        wire.endPoint.x = component.x + connectionPoint.x;
                        wire.endPoint.y = component.y + connectionPoint.y;
                    }
                }
                
                // Recalculate wire path
                wire.path = wire.calculatePath();
            }
        }
        
        // Force redraw of all wires
        wireManager.redrawWires();
    }

    // Add this function to ComponentManager class
    setupGlobalEvents() {
        // Set global update function
        this.globalUpdateInterval = setInterval(() => {
            if (window.wireManager) {
                this.forceUpdateWires();
            }
        }, 1000); // Check every second for component/wire integrity
        
        // Add event listener for document visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && window.wireManager) {
                this.forceUpdateWires();
            }
        });
    }
}

// Wire Management
class WireManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.wires = new Map();
        this.newWireStart = null;
        this.newWireEnd = null;
        this.wireIdCounter = 0;
        this.setupWireEvents();
    }

    setupWireEvents() {
        const canvas = this.canvasManager.interactionCanvas;
        canvas.addEventListener('mousedown', this.handleWireStart.bind(this));
        canvas.addEventListener('mousemove', this.handleWireMove.bind(this));
        canvas.addEventListener('mouseup', this.handleWireEnd.bind(this));
    }

    handleWireStart(e) {
        if (e.button !== 2) return; // Only right mouse button creates wires
        e.preventDefault();
        
        const rect = this.canvasManager.interactionCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Store wire start location
        this.newWireStart = this.snapToConnectionPoints({ x, y }, window.componentManager);
    }

    handleWireMove(e) {
        if (!this.newWireStart) return;
        
        const rect = this.canvasManager.interactionCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update wire end position
        this.newWireEnd = this.snapToConnectionPoints({ x, y }, window.componentManager);
        
        // Redraw temporary wire preview
        this.drawWirePreview(this.newWireStart, this.newWireEnd);
    }

    handleWireEnd(e) {
        if (!this.newWireStart) return;
        
        const rect = this.canvasManager.interactionCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get final end position
        this.newWireEnd = this.snapToConnectionPoints({ x, y }, window.componentManager);
        
        // Only create wire if start and end are different
        if (this.newWireStart && this.newWireEnd && 
            (this.newWireStart.x !== this.newWireEnd.x || this.newWireStart.y !== this.newWireEnd.y)) {
            
            // Create new wire
            this.createWire(this.newWireStart, this.newWireEnd);
        }
        
        // Clear temporary preview
        this.newWireStart = null;
        this.newWireEnd = null;
        this.canvasManager.clearCanvas(this.canvasManager.interactionCanvas.getContext('2d'));
    }
    
    snapToConnectionPoints(point, componentManager) {
        const snappedPoint = { ...point };
        let closestDistance = Infinity;
        let closestComponent = null;
        let closestPointIndex = -1;
        
        // Loop through all components to find the closest connection point
        for (const component of componentManager.components.values()) {
            component.connectionPoints.forEach((connectionPoint, index) => {
                const absoluteX = component.x + connectionPoint.x;
                const absoluteY = component.y + connectionPoint.y;
                
                const distance = Math.sqrt(
                    Math.pow(absoluteX - point.x, 2) + 
                    Math.pow(absoluteY - point.y, 2)
                );
                
                if (distance < closestDistance && distance < 20) {
                    closestDistance = distance;
                    snappedPoint.x = absoluteX;
                    snappedPoint.y = absoluteY;
                    closestComponent = component;
                    closestPointIndex = index;
                }
            });
        }
        
        // Store connection information if snapped to a component
        if (closestComponent) {
            snappedPoint.connection = {
                componentId: closestComponent.id,
                connectionPointIndex: closestPointIndex
            };
        }
        
        return snappedPoint;
    }

    createWire(start, end) {
        const wireId = `wire_${this.wireIdCounter++}`;
        const wire = new Wire(start, end);
        
        // Store connection information in the wire
        if (start.connection) {
            wire.startConnection = start.connection;
        }
        
        if (end.connection) {
            wire.endConnection = end.connection;
        }
        
        this.wires.set(wireId, wire);
        this.redrawWires();
        return wire;
    }

    drawWire(wire) {
        const ctx = this.canvasManager.wireCanvas.getContext('2d');
        wire.draw(ctx);
    }

    drawWirePreview(start, end) {
        if (!start || !end) return;
        
        const ctx = this.canvasManager.interactionCanvas.getContext('2d');
        this.canvasManager.clearCanvas(ctx);
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    redrawWires() {
        const ctx = this.canvasManager.wireCanvas.getContext('2d');
        this.canvasManager.clearCanvas(ctx);
        
        for (const wire of this.wires.values()) {
            this.drawWire(wire);
        }
    }
    
    // New method to update all wire paths
    updateAllWirePaths() {
        for (const wire of this.wires.values()) {
            wire.path = wire.calculatePath();
        }
        this.redrawWires();
    }
    
    // Enhance the updateWireConnections method in WireManager to handle rapid movements
    updateWireConnections() {
        const componentManager = window.componentManager;
        if (!componentManager) return;
        
        // Store information about connections that need repair
        const brokenConnections = [];
        
        // Check all wires for connection integrity
        for (const wire of this.wires.values()) {
            let startUpdated = false;
            let endUpdated = false;
            
            // Update start connection
            if (wire.startConnection) {
                const component = componentManager.components.get(wire.startConnection.componentId);
                if (component) {
                    const connectionPoint = component.connectionPoints[wire.startConnection.connectionPointIndex];
                    if (connectionPoint) {
                        wire.startPoint.x = component.x + connectionPoint.x;
                        wire.startPoint.y = component.y + connectionPoint.y;
                        startUpdated = true;
                    } else {
                        // Connection point index is invalid, mark for repair
                        brokenConnections.push({
                            wire,
                            end: 'start',
                            componentId: wire.startConnection.componentId
                        });
                    }
                } else {
                    // Component not found, mark connection as broken
                    brokenConnections.push({
                        wire,
                        end: 'start',
                        componentId: wire.startConnection.componentId
                    });
                }
            }
            
            // Update end connection
            if (wire.endConnection) {
                const component = componentManager.components.get(wire.endConnection.componentId);
                if (component) {
                    const connectionPoint = component.connectionPoints[wire.endConnection.connectionPointIndex];
                    if (connectionPoint) {
                        wire.endPoint.x = component.x + connectionPoint.x;
                        wire.endPoint.y = component.y + connectionPoint.y;
                        endUpdated = true;
                    } else {
                        // Connection point index is invalid, mark for repair
                        brokenConnections.push({
                            wire,
                            end: 'end',
                            componentId: wire.endConnection.componentId
                        });
                    }
                } else {
                    // Component not found, mark connection as broken
                    brokenConnections.push({
                        wire,
                        end: 'end',
                        componentId: wire.endConnection.componentId
                    });
                }
            }
            
            // If connections were updated, recalculate the wire path
            if (startUpdated || endUpdated) {
                wire.path = wire.calculatePath();
            }
        }
        
        // Try to repair broken connections
        this.repairBrokenConnections(brokenConnections);
        
        // Redraw wires
        this.redrawWires();
    }
    
    // Add method to try to repair broken connections
    repairBrokenConnections(brokenConnections) {
        if (!brokenConnections.length) return;
        
        const componentManager = window.componentManager;
        if (!componentManager) return;
        
        const tolerance = 20; // Larger tolerance for repairing broken connections
        
        for (const broken of brokenConnections) {
            const { wire, end, componentId } = broken;
            const component = componentManager.components.get(componentId);
            
            // If component exists, try to find the closest connection point
            if (component) {
                let closestDistance = tolerance;
                let closestIndex = -1;
                const wirePoint = end === 'start' ? wire.startPoint : wire.endPoint;
                
                // Find the closest connection point on the component
                component.connectionPoints.forEach((point, index) => {
                    const absoluteX = component.x + point.x;
                    const absoluteY = component.y + point.y;
                    
                    const distance = Math.sqrt(
                        Math.pow(wirePoint.x - absoluteX, 2) + 
                        Math.pow(wirePoint.y - absoluteY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                    }
                });
                
                // If we found a close connection point, repair the connection
                if (closestIndex !== -1) {
                    const connectionPoint = component.connectionPoints[closestIndex];
                    
                    if (end === 'start') {
                        wire.startConnection = {
                            componentId: component.id,
                            connectionPointIndex: closestIndex
                        };
                        wire.startPoint.x = component.x + connectionPoint.x;
                        wire.startPoint.y = component.y + connectionPoint.y;
                    } else {
                        wire.endConnection = {
                            componentId: component.id,
                            connectionPointIndex: closestIndex
                        };
                        wire.endPoint.x = component.x + connectionPoint.x;
                        wire.endPoint.y = component.y + connectionPoint.y;
                    }
                    
                    // Recalculate wire path
                    wire.path = wire.calculatePath();
                }
            }
        }
    }
}

// Simulation Control
class SimulationManager {
    constructor(componentManager, wireManager) {
        console.log("SimulationManager constructor called");
        this.componentManager = componentManager;
        this.wireManager = wireManager;
        this.isRunning = false;
        this.isPaused = false;
        this.speed = 1; // Default simulation speed
        this.time = 0; // Simulation time in seconds
        this.simulationType = 'tran'; // Default to transient analysis
        this.listeners = {
            start: [],
            update: [],
            pause: [],
            stopped: []
        };
        
        // Initialize the oscilloscope
        this.oscilloscope = null;
        this.setupOscilloscope();
        
        console.log("SimulationManager constructed successfully");
    }
    
    // ... existing code ...
    
    setupOscilloscope() {
        console.log("Setting up oscilloscope...");
        
        // Check if oscilloscope element exists in DOM
        const oscilloscopeElement = document.getElementById('oscilloscope');
        if (!oscilloscopeElement) {
            console.error("Cannot set up oscilloscope: No element with ID 'oscilloscope' found in DOM");
            return;
        }
        
        console.log("Oscilloscope element found with dimensions:", 
                    oscilloscopeElement.offsetWidth, "x", oscilloscopeElement.offsetHeight);
        
        // Delay initialization to ensure DOM is fully loaded
        setTimeout(() => {
            // Use the correct container ID
            const oscilloscopeContainer = document.getElementById('oscilloscope');
            
            if (!oscilloscopeContainer) {
                console.error("Oscilloscope container not found! Element with ID 'oscilloscope' is missing.");
                return;
            }
            
            // Make sure Plotly is loaded before initializing
            if (typeof Plotly === 'undefined') {
                console.error("Plotly library not loaded. Oscilloscope cannot be initialized.");
                return;
            }
            
            try {
                console.log("Starting oscilloscope initialization...");
                console.log("Container dimensions:", oscilloscopeContainer.offsetWidth, "x", oscilloscopeContainer.offsetHeight);
                
                // Reset container to ensure clean initialization
                oscilloscopeContainer.innerHTML = '';
                
                // Direct Plotly initialization with demo data for immediate visual feedback
                const initialData = [
                    {
                        x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                        y: [0, 2, 0, -2, 0, 2, 0, -2, 0, 2, 0],
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#00ff00', width: 2 }
                    }
                ];
                
                const layout = {
                    margin: { t: 10, r: 10, b: 40, l: 50 },
                    xaxis: {
                        title: 'Time (ms)',
                        showgrid: true,
                        zeroline: true,
                        gridcolor: 'rgba(0, 255, 0, 0.3)',
                        zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                        gridwidth: 1,
                        color: 'rgba(0, 255, 0, 0.7)'
                    },
                    yaxis: {
                        title: 'Voltage (V)',
                        showgrid: true,
                        zeroline: true,
                        gridcolor: 'rgba(0, 255, 0, 0.3)',
                        zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                        gridwidth: 1,
                        color: 'rgba(0, 255, 0, 0.7)'
                    },
                    plot_bgcolor: '#001824',
                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                    font: {
                        color: 'rgba(0, 255, 0, 0.7)',
                        size: 10
                    },
                    showlegend: false
                };
                
                Plotly.newPlot(oscilloscopeContainer, initialData, layout).then(() => {
                    console.log("Direct Plotly initialization successful!");
                    
                    // Now initialize the enhanced oscilloscope
                    this.oscilloscope = new EnhancedOscilloscope(oscilloscopeContainer);
                    
                    // Configure the oscilloscope
                    this.oscilloscope.setTimeScale(2);
                    this.oscilloscope.setVoltageScale(2);
                    
                    // Add default channels with distinctive colors
                    this.oscilloscope.addChannel({ id: 1, color: '#00ff00', visible: true }); // Green
                    this.oscilloscope.addChannel({ id: 2, color: '#ff4500', visible: true }); // Orange-Red
                    this.oscilloscope.addChannel({ id: 3, color: '#00bfff', visible: true }); // Deep Sky Blue
                    this.oscilloscope.addChannel({ id: 4, color: '#ffff00', visible: true }); // Yellow
                    
                    // Add listeners for simulation updates
                    this.addListener('update', (components, wires, time) => {
                        if (this.oscilloscope) {
                            this.oscilloscope.updateData(components, wires, time);
                        }
                    });
                    
                    // Add listener for simulation start
                    this.addListener('start', () => {
                        ensureOscilloscopeVisible();
                    });
                    
                    console.log("Enhanced oscilloscope setup complete");
                }).catch(err => {
                    console.error("Error initializing Plotly:", err);
                });
                
            } catch (error) {
                console.error("Error during oscilloscope setup:", error);
            }
        }, 500); // Small delay to ensure DOM is ready
    }
    
    setupOscilloscopeControls() {
        const timeScaleControl = document.getElementById('time-scale');
        const voltageScaleControl = document.getElementById('voltage-scale');
        const cursorTypeControl = document.getElementById('cursor-type');
        const channelToggles = document.querySelectorAll('.channel-toggle');
        
        if (timeScaleControl) {
            timeScaleControl.addEventListener('change', () => {
                const timeScale = parseFloat(timeScaleControl.value);
                if (this.oscilloscope && !isNaN(timeScale)) {
                    this.oscilloscope.setTimeScale(timeScale);
                }
            });
        }
        
        if (voltageScaleControl) {
            voltageScaleControl.addEventListener('change', () => {
                const voltageScale = parseFloat(voltageScaleControl.value);
                if (this.oscilloscope && !isNaN(voltageScale)) {
                    this.oscilloscope.setVoltageScale(voltageScale);
                }
            });
        }
        
        if (cursorTypeControl) {
            cursorTypeControl.addEventListener('change', () => {
                if (this.oscilloscope) {
                    this.oscilloscope.setCursorType(cursorTypeControl.value);
                }
            });
        }
        
        if (channelToggles.length > 0) {
            channelToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const channelId = parseInt(toggle.getAttribute('data-channel'));
                    const isActive = toggle.classList.contains('active');
                    
                    if (this.oscilloscope) {
                        this.oscilloscope.setChannelVisibility(channelId, !isActive);
                        toggle.classList.toggle('active');
                    }
                });
            });
        }
        
        // Add channel naming based on assigned components
        if (this.oscilloscope) {
            updateChannelNames(this.oscilloscope);
        }
    }
    
    setupWorkerHandlers() {
        this.worker.onmessage = (event) => {
            const message = event.data;
            
            switch (message.type) {
                case 'simulation-update':
                    // Make the simulation values more accurate before passing them on
                    const components = this.enhanceComponentValues(message.components);
                    const wires = this.enhanceWireValues(message.wires);
                    
                    // Notify listeners about the update
                    this.notifyListeners('update', components, wires, message.time);
                    break;
                case 'simulation-started':
                    this.isRunning = true;
                    this.notifyListeners('start');
                    break;
                case 'simulation-paused':
                    this.isRunning = false;
                    this.notifyListeners('pause');
                    break;
                case 'simulation-stopped':
                    this.isRunning = false;
                    this.notifyListeners('stop');
                    break;
                default:
                    console.warn('Unknown message from simulation worker:', message.type);
            }
        };
    }
    
    enhanceComponentValues(components) {
        // Apply high precision to all component values
        return components.map(component => {
            if (component.values) {
                // Ensure high precision for oscilloscope display
                const values = { ...component.values };
                
                if (values.voltage !== undefined) {
                    values.voltage = parseFloat(values.voltage.toFixed(6));
                }
                
                if (values.current !== undefined) {
                    values.current = parseFloat(values.current.toFixed(9));
                }
                
                if (values.power !== undefined) {
                    values.power = parseFloat(values.power.toFixed(6));
                }
                
                return { ...component, values };
            }
            return component;
        });
    }
    
    enhanceWireValues(wires) {
        // Apply high precision to all wire values
        return wires.map(wire => {
            const enhancedWire = { ...wire };
            
            if (enhancedWire.current !== undefined) {
                enhancedWire.current = parseFloat(enhancedWire.current.toFixed(9));
            }
            
            if (enhancedWire.voltage !== undefined) {
                enhancedWire.voltage = parseFloat(enhancedWire.voltage.toFixed(6));
            }
            
            return enhancedWire;
        });
    }
    
    startSimulation() {
        if (this.isRunning) return;
        
        const circuitData = this.prepareCircuitData();
        
        // Ensure oscilloscope is visible when simulation starts
        ensureOscilloscopeVisible();
        
        this.worker.postMessage({
            type: 'start-simulation',
            data: {
                components: circuitData.components,
                wires: circuitData.wires,
                simulationType: this.simulationType,
                simulationSpeed: this.speed
            }
        });
    }
    
    // ... existing code ...

    init() {
        this.loadComponents();
        this.setupDragAndDrop();
        this.setupComponentProperties();
        this.setupButtons();
        this.setupOscilloscope();
        
        // Initialize oscilloscope settings panel
        initializeSettingsPanel();
        
        console.log("Simulation Manager initialized.");
    }
}

// ... existing code ...

// Function to ensure oscilloscope is visible
function ensureOscilloscopeVisible() {
    console.log('Ensuring oscilloscope is visible...');
    const oscilloscopeDisplay = document.getElementById('oscilloscope');
    // No need to reference embedded-oscilloscope as it doesn't exist in the HTML
    
    if (oscilloscopeDisplay && oscilloscopeDisplay._oscilloscope) {
        console.log('Oscilloscope found, ensuring visible...');
        return;
    }
    
    // If oscilloscope is not initialized, force initialization
    console.log('Oscilloscope not found or not initialized, initializing...');
    
    if (oscilloscopeDisplay) {
        try {
            const layout = {
                margin: { t: 10, r: 10, b: 30, l: 40 },
                xaxis: {
                    title: 'Time (ms)',
                    showgrid: true,
                    zeroline: true,
                    gridcolor: 'rgba(0, 255, 0, 0.3)',
                    zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                    gridwidth: 1,
                    color: 'rgba(0, 255, 0, 0.7)'
                },
                yaxis: {
                    title: 'Voltage (V)',
                    showgrid: true,
                    zeroline: true,
                    gridcolor: 'rgba(0, 255, 0, 0.3)',
                    zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                    gridwidth: 1,
                    color: 'rgba(0, 255, 0, 0.7)'
                },
                plot_bgcolor: '#001824',
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
                font: {
                    color: 'rgba(0, 255, 0, 0.7)',
                    size: 10
                },
                showlegend: false
            };
            
            // Get existing traces or create empty ones
            const data = Array(4).fill().map((_, i) => ({
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: ['#00ff00', '#ff4500', '#00bfff', '#ffff00'][i],
                    width: 2
                }
            }));
            
            // Redraw the oscilloscope
            Plotly.newPlot(oscilloscopeDisplay, data, layout);
            console.log('Oscilloscope display initialized');
        } catch (e) {
            console.error("Error initializing oscilloscope:", e);
        }
    } else {
        console.error("Oscilloscope element not found in the DOM");
    }
}

// ... existing code ...

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Virtual Circuit Lab Initialized');
    
    // Function to ensure oscilloscope is visible and properly initialized
    function ensureOscilloscopeVisible() {
        console.log('Ensuring oscilloscope is visible...');
        const oscilloscopeDisplay = document.getElementById('oscilloscope');
        // No need to reference embedded-oscilloscope as it doesn't exist in the HTML
        
        if (oscilloscopeDisplay && oscilloscopeDisplay._oscilloscope) {
            console.log('Oscilloscope found, ensuring visible...');
            return;
        }
        
        // If oscilloscope is not initialized, force initialization
        console.log('Oscilloscope not found or not initialized, initializing...');
        
        if (oscilloscopeDisplay) {
            try {
                const layout = {
                    margin: { t: 10, r: 10, b: 30, l: 40 },
                    xaxis: {
                        title: 'Time (ms)',
                        showgrid: true,
                        zeroline: true,
                        gridcolor: 'rgba(0, 255, 0, 0.3)',
                        zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                        gridwidth: 1,
                        color: 'rgba(0, 255, 0, 0.7)'
                    },
                    yaxis: {
                        title: 'Voltage (V)',
                        showgrid: true,
                        zeroline: true,
                        gridcolor: 'rgba(0, 255, 0, 0.3)',
                        zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                        gridwidth: 1,
                        color: 'rgba(0, 255, 0, 0.7)'
                    },
                    plot_bgcolor: '#001824',
                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                    font: {
                        color: 'rgba(0, 255, 0, 0.7)',
                        size: 10
                    },
                    showlegend: false
                };
                
                // Get existing traces or create empty ones
                const data = Array(4).fill().map((_, i) => ({
                    x: [],
                    y: [],
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: ['#00ff00', '#ff4500', '#00bfff', '#ffff00'][i],
                        width: 2
                    }
                }));
                
                // Redraw the oscilloscope
                Plotly.newPlot(oscilloscopeDisplay, data, layout);
                console.log("Oscilloscope display refreshed");
            } catch (e) {
                console.error("Error refreshing oscilloscope:", e);
            }
        } else {
            console.log("Oscilloscope elements not found:", {
                display: !!oscilloscopeDisplay,
                embedded: !!embeddedOscilloscope
            });
        }
    }
    
    // Initialize theme
    // ... existing code ...
    
    const canvasManager = new CanvasManager();
    const componentManager = new ComponentManager(canvasManager);
    const wireManager = new WireManager(canvasManager);
    const simulationManager = new SimulationManager(componentManager, wireManager);
    
    // Make managers accessible globally
    window.wireManager = wireManager;
    window.componentManager = componentManager;
    
    initializeTheme();
    initializeTemplates();
    initializeExportImport();
    initializeComponentSearch();
    initializeMeasurementTools();
    
    // Setup grid controls
    const toggleGrid = document.getElementById('toggle-grid');
    const toggleSnap = document.getElementById('toggle-snap');
    
    toggleGrid.addEventListener('click', () => {
        AppState.gridSize = AppState.gridSize === 0 ? 20 : 0;
        canvasManager.drawGrid();
    });
    
    toggleSnap.addEventListener('click', () => {
        AppState.snapToGrid = !AppState.snapToGrid;
        toggleSnap.classList.toggle('active');
    });
    
    // Setup zoom controls
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomLevel = document.getElementById('zoom-level');
    
    zoomIn.addEventListener('click', () => {
        AppState.zoom = Math.min(AppState.zoom * 1.2, 5);
        zoomLevel.textContent = `${Math.round(AppState.zoom * 100)}%`;
        canvasManager.drawGrid();
    });
    
    zoomOut.addEventListener('click', () => {
        AppState.zoom = Math.max(AppState.zoom / 1.2, 0.2);
        zoomLevel.textContent = `${Math.round(AppState.zoom * 100)}%`;
        canvasManager.drawGrid();
    });

    // Setup settings menu
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsMenu = document.getElementById('settings-menu');
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const generatorApiKeyInput = document.getElementById('generator-api-key');
    const assistantApiKeyInput = document.getElementById('assistant-api-key');
    
    // Load saved keys into the form
    if (localStorage.getItem('circuit_generator_api_key')) {
        generatorApiKeyInput.value = localStorage.getItem('circuit_generator_api_key');
    }
    
    if (localStorage.getItem('assistant_api_key')) {
        assistantApiKeyInput.value = localStorage.getItem('assistant_api_key');
    }
    
    // Toggle settings menu
    settingsToggle.addEventListener('click', () => {
        settingsMenu.classList.toggle('hidden');
    });
    
    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && !settingsToggle.contains(e.target)) {
            settingsMenu.classList.add('hidden');
        }
    });
    
    // Save API keys
    saveApiKeysBtn.addEventListener('click', () => {
        const generatorKey = generatorApiKeyInput.value.trim();
        const assistantKey = assistantApiKeyInput.value.trim();
        
        if (generatorKey) {
            localStorage.setItem('circuit_generator_api_key', generatorKey);
        }
        
        if (assistantKey) {
            localStorage.setItem('assistant_api_key', assistantKey);
        }
        
        // Show success message
        alert('API keys saved successfully! Refresh the page for changes to take effect.');
        
        // Hide menu
        settingsMenu.classList.add('hidden');
    });

    function initializeTheme() {
        // Get saved theme from localStorage or use default
        const savedTheme = localStorage.getItem('theme');
        AppState.theme = savedTheme || 'light';
        
        console.log('Initializing theme:', AppState.theme);
        
        // Apply theme to document
        document.body.setAttribute('data-theme', AppState.theme);
        
        // Set up theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) {
            console.error('Theme toggle button not found');
            return;
        }
        
        console.log('Theme toggle button found:', themeToggle);
        
        // Update icon based on current theme
        const themeIcon = themeToggle.querySelector('i');
        if (themeIcon) {
            themeIcon.className = AppState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            console.log('Updated theme icon to:', themeIcon.className);
        } else {
            console.error('Theme icon not found inside toggle button');
        }
        
        // Add click event listener
        themeToggle.addEventListener('click', function(e) {
            // Prevent default
            e.preventDefault();
            
            console.log('Theme toggle clicked');
            
            // Toggle theme
            AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
            
            // Update body attribute
            document.body.setAttribute('data-theme', AppState.theme);
            
            // Update icon
            if (themeIcon) {
                themeIcon.className = AppState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                console.log('Updated theme icon to:', themeIcon.className);
            }
            
            // Save to localStorage
            localStorage.setItem('theme', AppState.theme);
            
            // Redraw grid with new theme colors
            canvasManager.drawGrid();
            
            console.log('Theme changed to:', AppState.theme);
            
            // Force a redraw of the UI
            document.body.style.transition = 'none';
            document.body.offsetHeight; // Force a reflow
            document.body.style.transition = 'background-color var(--transition-normal), color var(--transition-normal)';
        });
    }

    function initializeTemplates() {
        // Find the 'New Circuit' button to add the templates dropdown after it
        const newCircuitBtn = document.getElementById('new-circuit');
        if (!newCircuitBtn) {
            console.error('New Circuit button not found');
            return;
        }
        
        // Create templates dropdown button
        const templatesDropdownBtn = document.createElement('button');
        templatesDropdownBtn.id = 'templates-dropdown';
        templatesDropdownBtn.className = 'button-secondary';
        templatesDropdownBtn.innerHTML = '<i class="fas fa-book"></i> Templates';
        
        // Create dropdown content
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'templates-dropdown-content hidden';
        
        // Add templates to dropdown
        CircuitTemplates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <div class="template-name">${template.name}</div>
                <div class="template-description">${template.description}</div>
            `;
            templateItem.dataset.templateId = template.id;
            
            // Add click event to load the template
            templateItem.addEventListener('click', () => {
                loadCircuitTemplate(template);
                dropdownContent.classList.add('hidden');
            });
            
            dropdownContent.appendChild(templateItem);
        });
        
        // Insert button and dropdown after New Circuit button
        newCircuitBtn.parentNode.insertBefore(templatesDropdownBtn, newCircuitBtn.nextSibling);
        document.body.appendChild(dropdownContent);
        
        // Toggle dropdown on button click
        templatesDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Position the dropdown below the button
            const btnRect = templatesDropdownBtn.getBoundingClientRect();
            dropdownContent.style.top = `${btnRect.bottom}px`;
            dropdownContent.style.left = `${btnRect.left}px`;
            
            dropdownContent.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!templatesDropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.add('hidden');
            }
        });
    }
    
    // Function to load a circuit template
    function loadCircuitTemplate(template) {
        console.log('Loading template:', template.name);
        
        // Clear existing components and wires
        clearCircuit();
        
        // Create components from template
        const createdComponents = [];
        template.components.forEach(compData => {
            // Pass custom properties directly to the component constructor
            const component = componentManager.createComponent(
                compData.type, 
                compData.x, 
                compData.y,
                compData.properties
            );
            
            createdComponents.push(component);
        });
        
        // Create connections between components
        template.connections.forEach(conn => {
            const startComp = createdComponents[conn.start.componentIndex];
            const endComp = createdComponents[conn.end.componentIndex];
            
            if (startComp && endComp) {
                const startPoint = startComp.connectionPoints[conn.start.pointIndex];
                const endPoint = endComp.connectionPoints[conn.end.pointIndex];
                
                if (startPoint && endPoint) {
                    const startPos = { x: startComp.x + startPoint.x, y: startComp.y + startPoint.y };
                    const endPos = { x: endComp.x + endPoint.x, y: endComp.y + endPoint.y };
                    
                    wireManager.createWire(startPos, endPos);
                }
            }
        });
        
        // Update canvas
        canvasManager.drawGrid();
    }
    
    // Function to clear the circuit
    function clearCircuit() {
        componentManager.components.forEach((component, id) => {
            componentManager.components.delete(id);
        });
        
        wireManager.wires.forEach((wire, id) => {
            wireManager.wires.delete(id);
        });
        
        canvasManager.clearCanvas(canvasManager.componentCtx);
        canvasManager.clearCanvas(canvasManager.wireCtx);
        canvasManager.clearCanvas(canvasManager.interactionCtx);
    }
    
    // Event handler for the New Circuit button
    document.getElementById('new-circuit').addEventListener('click', clearCircuit);

    // Add export/import functionality
    function initializeExportImport() {
        // Find buttons to insert after
        const saveBtn = document.getElementById('save-circuit');
        const loadBtn = document.getElementById('load-circuit');
        
        if (!saveBtn || !loadBtn) {
            console.error('Save or Load buttons not found');
            return;
        }
        
        // Update existing save button functionality
        saveBtn.addEventListener('click', exportCircuit);
        
        // Update existing load button functionality
        loadBtn.addEventListener('click', () => {
            // Create a hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json,.circuit';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Trigger click on the file input
            fileInput.click();
            
            // Handle file selection
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const circuitData = JSON.parse(event.target.result);
                            importCircuit(circuitData);
                        } catch (error) {
                            console.error('Error importing circuit:', error);
                            alert('The selected file is not a valid circuit file.');
                        }
                    };
                    reader.readAsText(file);
                }
                // Remove the file input
                document.body.removeChild(fileInput);
            });
        });
    }
    
    // Function to export the circuit
    function exportCircuit() {
        // Create circuit data object
        const circuitData = {
            version: '1.0',
            timestamp: Date.now(),
            components: [],
            wires: []
        };
        
        // Add component data
        componentManager.components.forEach(component => {
            const componentData = {
                id: component.id,
                type: component.type,
                x: component.x,
                y: component.y,
                rotation: component.rotation,
                properties: component.properties
            };
            circuitData.components.push(componentData);
        });
        
        // Add wire data
        wireManager.wires.forEach(wire => {
            const wireData = {
                id: wire.id,
                startPoint: wire.startPoint,
                endPoint: wire.endPoint
            };
            circuitData.wires.push(wireData);
        });
        
        // Convert to JSON
        const jsonData = JSON.stringify(circuitData, null, 2);
        
        // Create download link
        const filename = `circuit_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Function to import a circuit
    function importCircuit(circuitData) {
        try {
            // Validate circuit data
            if (!circuitData.components || !circuitData.wires) {
                throw new Error('Invalid circuit data format');
            }
            
            // Clear existing circuit
            clearCircuit();
            
            // Recreate components
            const componentsMap = new Map(); // Map old IDs to new components
            
            circuitData.components.forEach(compData => {
                const component = componentManager.createComponent(compData.type, compData.x, compData.y);
                
                // Apply rotation if specified
                if (compData.rotation !== undefined) {
                    component.rotation = compData.rotation;
                }
                
                // Apply properties if defined
                if (compData.properties) {
                    Object.entries(compData.properties).forEach(([key, propData]) => {
                        if (component.properties[key]) {
                            component.properties[key].value = propData.value;
                        }
                    });
                }
                
                // Store in map with original ID
                componentsMap.set(compData.id, component);
            });
            
            // Recreate wires
            circuitData.wires.forEach(wireData => {
                wireManager.createWire(wireData.startPoint, wireData.endPoint);
            });
            
            // Redraw everything
            canvasManager.clearCanvas(canvasManager.componentCtx);
            canvasManager.clearCanvas(canvasManager.wireCtx);
            
            componentManager.components.forEach(component => {
                componentManager.drawComponent(component);
            });
            
            wireManager.wires.forEach(wire => {
                wireManager.drawWire(wire);
            });
            
            // Show success message
            console.log('Circuit imported successfully');
            
        } catch (error) {
            console.error('Error importing circuit:', error);
            alert('Failed to import circuit. The file may be corrupted or in an incompatible format.');
        }
    }

    // Enhance component search functionality
    function initializeComponentSearch() {
        const searchInput = document.querySelector('.components-panel .search-bar input');
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }
        
        // Add clear button to search input
        const searchContainer = searchInput.parentElement;
        const clearButton = document.createElement('button');
        clearButton.className = 'search-clear-btn';
        clearButton.innerHTML = '<i class="fas fa-times"></i>';
        clearButton.style.display = 'none'; // Initially hidden
        searchContainer.appendChild(clearButton);
        
        // Components data for search (build metadata for better searching)
        const componentsData = [
            { id: 'resistor', name: 'Resistor', description: 'Passive component that implements electrical resistance', keywords: ['resist', 'ohm', 'passive'] },
            { id: 'capacitor', name: 'Capacitor', description: 'Stores electrical energy in an electric field', keywords: ['capacitance', 'farad', 'storage'] },
            { id: 'inductor', name: 'Inductor', description: 'Stores electrical energy in a magnetic field', keywords: ['inductance', 'henry', 'coil'] },
            { id: 'voltage-source', name: 'Voltage Source', description: 'Provides constant or varying voltage', keywords: ['battery', 'power', 'supply', 'volt'] },
            { id: 'current-source', name: 'Current Source', description: 'Provides constant or varying current', keywords: ['supply', 'amp', 'ampere'] },
            { id: 'diode', name: 'Diode', description: 'Allows current flow in one direction', keywords: ['rectifier', 'semiconductor', 'pn'] },
            { id: 'transistor', name: 'Transistor', description: 'Semiconductor device for switching or amplifying', keywords: ['bjt', 'switch', 'amplifier', 'gain'] },
            { id: 'ground', name: 'Ground', description: 'Reference point with zero potential', keywords: ['gnd', 'earth', 'reference'] }
        ];
        
        // Get all component elements
        const componentElements = document.querySelectorAll('.component');
        
        // Add keyboard shortcut (Ctrl+F) to focus search
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                // Only activate in main view, not when editing text
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        });
        
        // Function to filter components
        function filterComponents(query) {
            if (!query) {
                // If no query, show all components
                componentElements.forEach(el => {
                    el.style.display = 'flex';
                    el.classList.remove('search-highlight');
                });
                
                // Hide clear button when search is empty
                clearButton.style.display = 'none';
                return;
            }
            
            // Show clear button when there's a search query
            clearButton.style.display = 'block';
            
            // Convert query to lowercase for case-insensitive search
            const lowercaseQuery = query.toLowerCase();
            
            // Count matches for display
            let matchCount = 0;
            
            // Check each component
            componentElements.forEach(el => {
                const componentId = el.dataset.component;
                const componentData = componentsData.find(c => c.id === componentId);
                
                if (!componentData) {
                    el.style.display = 'none';
                    return;
                }
                
                // Check if component matches the search query
                const nameMatch = componentData.name.toLowerCase().includes(lowercaseQuery);
                const descMatch = componentData.description.toLowerCase().includes(lowercaseQuery);
                const keywordMatch = componentData.keywords.some(keyword => 
                    keyword.toLowerCase().includes(lowercaseQuery));
                
                if (nameMatch || descMatch || keywordMatch) {
                    el.style.display = 'flex';
                    matchCount++;
                    
                    // Highlight if it's an exact match to the name
                    if (componentData.name.toLowerCase() === lowercaseQuery) {
                        el.classList.add('search-highlight');
                    } else {
                        el.classList.remove('search-highlight');
                    }
                } else {
                    el.style.display = 'none';
                    el.classList.remove('search-highlight');
                }
            });
            
            // Expand all categories that have visible components
            document.querySelectorAll('.category').forEach(category => {
                const hasVisibleComponent = Array.from(
                    category.querySelectorAll('.component')
                ).some(comp => comp.style.display !== 'none');
                
                if (hasVisibleComponent) {
                    category.querySelector('.category-items').style.display = 'block';
                    category.querySelector('.category-header i').classList.remove('fa-chevron-right');
                    category.querySelector('.category-header i').classList.add('fa-chevron-down');
                }
            });
            
            // Show result count somewhere if needed
            console.log(`Found ${matchCount} matching components`);
        }
        
        // Search input event listener
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            filterComponents(query);
        });
        
        // Clear button event listener
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            filterComponents('');
            searchInput.focus();
        });
        
        // Escape key to clear search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterComponents('');
                searchInput.blur(); // Remove focus
            }
        });
    }

    // Initialize the measurement tools
    function initializeMeasurementTools() {
        console.log("Initializing enhanced measurement tools...");
        
        // Get the embedded oscilloscope display
        const oscilloscopeDisplay = document.getElementById('oscilloscope');
        let oscilloscope = null;
        
        if (oscilloscopeDisplay) {
            // Initialize the oscilloscope
            oscilloscope = new EnhancedOscilloscope(oscilloscopeDisplay);
            
            // Add default channels
            oscilloscope.addChannel({ id: 1, color: '#00ff00', visible: true }); // Green
            oscilloscope.addChannel({ id: 2, color: '#ff4500', visible: false }); // Orange-Red
            oscilloscope.addChannel({ id: 3, color: '#00bfff', visible: false }); // Deep Sky Blue
            oscilloscope.addChannel({ id: 4, color: '#ffff00', visible: false }); // Yellow
            
            // Set up embedded oscilloscope controls
            const timeScaleCompact = document.getElementById('time-scale-compact');
            if (timeScaleCompact) {
                timeScaleCompact.addEventListener('change', () => {
                    oscilloscope.setTimeScale(parseFloat(timeScaleCompact.value));
                });
            }
            
            const voltageScaleCompact = document.getElementById('voltage-scale-compact');
            if (voltageScaleCompact) {
                voltageScaleCompact.addEventListener('change', () => {
                    oscilloscope.setVoltageScale(parseFloat(voltageScaleCompact.value));
                });
            }
            
            // Set up channel toggles
            const channelToggles = document.querySelectorAll('.channel-toggle-compact');
            channelToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const channelId = parseInt(toggle.getAttribute('data-channel'));
                    toggle.classList.toggle('active');
                    oscilloscope.setChannelVisibility(channelId, toggle.classList.contains('active'));
                });
            });
        }
        
        // Connect oscilloscope to simulation manager
        simulationManager.addListener('update', (components, wires, time) => {
            if (oscilloscope) {
                oscilloscope.updateData(components, wires, time);
            }
        });
        
        // Update oscilloscope status based on simulation state
        simulationManager.addListener('started', () => {
            const statusIndicator = document.getElementById('oscilloscope-status');
            if (statusIndicator) {
                statusIndicator.textContent = 'Running';
                statusIndicator.className = 'status-indicator running';
            }
            
            // Auto-assign components to channels if available
            if (oscilloscope) {
                const components = Array.from(componentManager.components.values());
                oscilloscope.autoAssignComponents(components);
                updateChannelNames(oscilloscope);
            }
        });
        
        simulationManager.addListener('paused', () => {
            const statusIndicator = document.getElementById('oscilloscope-status');
            if (statusIndicator) {
                statusIndicator.textContent = 'Paused';
                statusIndicator.className = 'status-indicator paused';
            }
        });
        
        simulationManager.addListener('stopped', () => {
            const statusIndicator = document.getElementById('oscilloscope-status');
            if (statusIndicator) {
                statusIndicator.textContent = 'Stopped';
                statusIndicator.className = 'status-indicator';
            }
        });
        
        // Setup measurement tools
        const voltmeterBtn = document.getElementById('voltmeter');
        const ammeterBtn = document.getElementById('ammeter');
        const openOscilloscopeBtn = document.getElementById('open-oscilloscope');
        
        if (voltmeterBtn) {
            voltmeterBtn.addEventListener('click', () => {
                console.log('Voltmeter activated');
                // Implement voltmeter functionality
            });
        }
        
        if (ammeterBtn) {
            ammeterBtn.addEventListener('click', () => {
                console.log('Ammeter activated');
                // Implement ammeter functionality
            });
        }
        
        if (openOscilloscopeBtn) {
            openOscilloscopeBtn.addEventListener('click', () => {
                console.log('Toggling all oscilloscope channels');
                
                // Make sure oscilloscope is visible
                ensureOscilloscopeVisible();
                
                // Toggle all channels on or off
                const channelToggles = document.querySelectorAll('.channel-toggle-compact');
                const allActive = Array.from(channelToggles).every(toggle => toggle.classList.contains('active'));
                
                channelToggles.forEach(toggle => {
                    const channelId = parseInt(toggle.getAttribute('data-channel'));
                    
                    if (allActive) {
                        // Turn all off except channel 1
                        if (channelId === 1) {
                            toggle.classList.add('active');
                        } else {
                            toggle.classList.remove('active');
                        }
                    } else {
                        // Turn all on
                        toggle.classList.add('active');
                    }
                    
                    // Update oscilloscope if available
                    if (oscilloscope) {
                        oscilloscope.setChannelVisibility(
                            channelId, 
                            toggle.classList.contains('active')
                        );
                    }
                });
            });
        }
        
        return oscilloscope;
    }

    // Helper function to update channel names based on assignments
    function updateChannelNames(oscilloscope) {
        const channelToggles = document.querySelectorAll('.channel-toggle-compact');
        channelToggles.forEach(toggle => {
            const channelId = parseInt(toggle.getAttribute('data-channel'));
            const assignment = oscilloscope.componentAssignments[channelId];
            
            if (assignment && assignment.type) {
                // Generate a readable name from the component type
                let componentName = '';
                
                if (assignment.type === 'component') {
                    // Find the component for more detailed naming
                    const component = document.querySelector(`[data-component-id="${assignment.id}"]`);
                    if (component && component.dataset.component) {
                        componentName = component.dataset.component.replace(/-/g, ' ');
                componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
                    } else {
                        componentName = `Component ${assignment.id}`;
                    }
                } else if (assignment.type === 'wire') {
                    componentName = `Wire ${assignment.id}`;
                } else {
                    componentName = assignment.type.replace(/-/g, ' ');
                    componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
                }
                
                toggle.textContent = `${componentName}`;
                toggle.title = `Channel ${channelId}: ${componentName}`;
            } else {
                toggle.textContent = `CH${channelId}`;
                toggle.title = `Channel ${channelId}`;
            }
        });
    }

    // Start Simulation
    document.getElementById('start-simulation').addEventListener('click', () => {
        if (simulationManager.canStart()) {
            // Set voltage and current in the components
            componentManager.prepareComponentsForSimulation();
            
            // Start the simulation
            simulationManager.start();
            updateSimulationControls('started');
            
            // Make sure oscilloscope is visible and properly initialized
            ensureOscilloscopeVisible();
            
            showNotification('Simulation started', 'success');
        } else {
            showNotification('Please add components to the circuit first.', 'error');
        }
    });
});

// Add user profile dropdown toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    // User dropdown toggle
    const profileAvatar = document.getElementById('profile-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (profileAvatar && userDropdown) {
        profileAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            if (!userDropdown.classList.contains('hidden')) {
                userDropdown.classList.add('hidden');
            }
        });
        
        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Initialize other components...
});

// Enhanced Oscilloscope Class
class EnhancedOscilloscope {
    constructor(container) {
        this.container = container;
        this.timeScale = 1; // ms per division
        this.voltageScale = 1; // V per division
        this.channels = new Map();
        this.activeChannel = 1;
        this.cursorType = 'off';
        this.timeCursors = { x1: null, x2: null };
        this.voltageCursors = { y1: null, y2: null };
        this.data = [];
        this.componentAssignments = {
            1: { type: null, id: null }, // Channel 1
            2: { type: null, id: null }, // Channel 2
            3: { type: null, id: null }, // Channel 3
            4: { type: null, id: null }  // Channel 4
        };
        
        // Initialize the oscilloscope display
        this.initializeDisplay();
        
        // Store a reference to this oscilloscope instance on the container element
        container._oscilloscope = this;
    }
    
    initializeDisplay() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create the plot
        Plotly.newPlot(this.container, [], {
            margin: { t: 10, r: 10, b: 30, l: 40 },
            xaxis: {
                title: 'Time (ms)',
                showgrid: true,
                zeroline: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.2)'
            },
            yaxis: {
                title: 'Voltage (V)',
                showgrid: true,
                zeroline: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.2)'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0.02)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            modebar: {
                remove: ['toImage', 'sendDataToCloud', 'hoverClosestCartesian', 'hoverCompareCartesian', 'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'autoScale2d']
            },
            showlegend: false
        });
        
        // Set up dark mode detection
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    this.updateTheme(document.body.getAttribute('data-theme'));
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        
        // Initial theme setup
        this.updateTheme(document.body.getAttribute('data-theme'));
        
        // Add cursor information display
        this.cursorInfo = document.createElement('div');
        this.cursorInfo.className = 'cursor-info hidden';
        this.container.appendChild(this.cursorInfo);
    }
    
    updateTheme(theme) {
        const isDark = theme === 'dark';
        
        Plotly.relayout(this.container, {
            'paper_bgcolor': 'rgba(0, 0, 0, 0)',
            'plot_bgcolor': isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            'xaxis.gridcolor': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            'yaxis.gridcolor': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            'xaxis.zerolinecolor': isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            'yaxis.zerolinecolor': isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            'xaxis.color': isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
            'yaxis.color': isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
            'font.color': isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
        });
    }
    
    addChannel(channelConfig) {
        this.channels.set(channelConfig.id, {
            id: channelConfig.id,
            color: channelConfig.color,
            visible: channelConfig.visible,
            data: { x: [], y: [] }
        });
        
        // Add trace to the plot
        Plotly.addTraces(this.container, {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            line: {
                color: channelConfig.color,
                width: 2
            },
            visible: channelConfig.visible ? true : 'legendonly'
        });
    }
    
    setActiveChannel(channelId) {
        this.activeChannel = channelId;
    }
    
    setChannelVisibility(channelId, visible) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.visible = visible;
            
            // Update plot visibility
            const update = {};
            update[`visible${channelId-1}`] = visible ? true : 'legendonly';
            Plotly.restyle(this.container, update);
        }
    }
    
    setTimeScale(scale) {
        this.timeScale = scale;
        
        // Update x-axis range
        Plotly.relayout(this.container, {
            'xaxis.range': [0, this.timeScale * 10] // 10 divisions
        });
    }
    
    setVoltageScale(scale) {
        this.voltageScale = scale;
        
        // Update y-axis range
        Plotly.relayout(this.container, {
            'yaxis.range': [-this.voltageScale * 4, this.voltageScale * 4] // 8 divisions centered at 0
        });
    }
    
    setCursorType(type) {
        this.cursorType = type;
        
        // Clear existing cursors
        this.clearCursors();
        
        // Setup new cursors if not 'off'
        if (type !== 'off') {
            this.setupCursors(type);
        }
    }
    
    clearCursors() {
        // Remove cursor lines from plot
        const update = {
            shapes: []
        };
        
        Plotly.relayout(this.container, update);
        
        // Hide cursor info
        this.cursorInfo.classList.add('hidden');
    }
    
    setupCursors(type) {
        // Initialize cursor positions
        const layout = this.container._fullLayout;
        const xRange = layout.xaxis.range;
        const yRange = layout.yaxis.range;
        
        if (type === 'time' || type === 'track') {
            // Set up time cursors (vertical lines)
            this.timeCursors.x1 = xRange[0] + (xRange[1] - xRange[0]) * 0.3;
            this.timeCursors.x2 = xRange[0] + (xRange[1] - xRange[0]) * 0.7;
        }
        
        if (type === 'voltage' || type === 'track') {
            // Set up voltage cursors (horizontal lines)
            this.voltageCursors.y1 = yRange[0] + (yRange[1] - yRange[0]) * 0.3;
            this.voltageCursors.y2 = yRange[0] + (yRange[1] - yRange[0]) * 0.7;
        }
        
        // Draw the cursors
        this.drawCursors();
        
        // Show cursor info
        this.cursorInfo.classList.remove('hidden');
        this.updateCursorInfo();
    }
    
    drawCursors() {
        const shapes = [];
        
        // Add time cursors if set
        if (this.timeCursors.x1 !== null && this.timeCursors.x2 !== null) {
            shapes.push({
                type: 'line',
                x0: this.timeCursors.x1,
                y0: 0,
                x1: this.timeCursors.x1,
                y1: 1,
                xref: 'x',
                yref: 'paper',
                line: {
                    color: 'rgba(255, 0, 0, 0.5)',
                    width: 1,
                    dash: 'dashdot'
                }
            });
            
            shapes.push({
                type: 'line',
                x0: this.timeCursors.x2,
                y0: 0,
                x1: this.timeCursors.x2,
                y1: 1,
                xref: 'x',
                yref: 'paper',
                line: {
                    color: 'rgba(255, 0, 0, 0.5)',
                    width: 1,
                    dash: 'dashdot'
                }
            });
        }
        
        // Add voltage cursors if set
        if (this.voltageCursors.y1 !== null && this.voltageCursors.y2 !== null) {
            shapes.push({
                type: 'line',
                x0: 0,
                y0: this.voltageCursors.y1,
                x1: 1,
                y1: this.voltageCursors.y1,
                xref: 'paper',
                yref: 'y',
                line: {
                    color: 'rgba(0, 0, 255, 0.5)',
                    width: 1,
                    dash: 'dashdot'
                }
            });
            
            shapes.push({
                type: 'line',
                x0: 0,
                y0: this.voltageCursors.y2,
                x1: 1,
                y1: this.voltageCursors.y2,
                xref: 'paper',
                yref: 'y',
                line: {
                    color: 'rgba(0, 0, 255, 0.5)',
                    width: 1,
                    dash: 'dashdot'
                }
            });
        }
        
        // Update the plot with new shapes
        Plotly.relayout(this.container, { shapes: shapes });
    }
    
    updateCursorInfo() {
        let cursorText = '';
        
        // Time cursor measurements
        if (this.timeCursors.x1 !== null && this.timeCursors.x2 !== null) {
            const t1 = this.timeCursors.x1.toFixed(2);
            const t2 = this.timeCursors.x2.toFixed(2);
            const dt = Math.abs(this.timeCursors.x2 - this.timeCursors.x1).toFixed(2);
            const freq = (1000 / parseFloat(dt)).toFixed(2);
            
            cursorText += `ΔT: ${dt} ms (${freq} Hz)<br>`;
        }
        
        // Voltage cursor measurements
        if (this.voltageCursors.y1 !== null && this.voltageCursors.y2 !== null) {
            const v1 = this.voltageCursors.y1.toFixed(2);
            const v2 = this.voltageCursors.y2.toFixed(2);
            const dv = Math.abs(this.voltageCursors.y2 - this.voltageCursors.y1).toFixed(2);
            
            cursorText += `ΔV: ${dv} V`;
        }
        
        this.cursorInfo.innerHTML = cursorText;
    }
    
    updateData(components, wires, time) {
        if (!components || !wires) return;
        
        // Create lookup tables for faster component access
        const componentsById = {};
        components.forEach(c => {
            if (c && c.id) componentsById[c.id] = c;
        });
        
        const wiresById = {};
        wires.forEach(w => {
            if (w && w.id) wiresById[w.id] = w;
        });
        
        // Update data for each channel based on component assignments
        this.channels.forEach((channel, channelId) => {
            const assignment = this.componentAssignments[channelId];
            let yValue = 0;
            
            if (assignment && assignment.type && assignment.id) {
                // Get data from assigned component
                if (assignment.type === 'component' && componentsById[assignment.id]) {
                    const component = componentsById[assignment.id];
                    
                    if (component.values) {
                        // Extract the appropriate value based on component type
                        if (component.type === 'voltage-source' || component.type === 'capacitor' || 
                            component.type === 'resistor' || component.type === 'inductor') {
                            // Use voltage for these components
                            yValue = component.values.voltage || 0;
                        } else if (component.type === 'current-source') {
                            // Scale current for better visibility (A to mA typically)
                            yValue = (component.values.current || 0) * 1000;
                        } else if (component.type === 'diode' || component.type === 'transistor') {
                            // For semiconductor components use voltage drop
                            yValue = component.values.voltage || 0;
                        } else {
                            // Default to voltage for other components
                            yValue = component.values.voltage || 0;
                        }
                    }
                } else if (assignment.type === 'wire' && wiresById[assignment.id]) {
                    // For wire assignments, use current by default (scaled for visibility)
                    const wire = wiresById[assignment.id];
                    yValue = (wire.current || 0) * 100; // Scale current for better visibility
                }
            } else {
                // Fallback to default behavior if no assignment
                if (channelId === 1 && components.length > 0) {
                    // First voltage source or first component with voltage values
                    const voltageSource = components.find(c => c.type === 'voltage-source' && c.values);
                    if (voltageSource) {
                        yValue = voltageSource.values.voltage || 0;
                    } else if (components[0].values) {
                        yValue = components[0].values.voltage || 0;
                    }
                } else if (channelId === 2 && components.length > 1) {
                    // Second component with voltage values
                    if (components[1].values) {
                        yValue = components[1].values.voltage || 0;
                    }
                } else if (channelId === 3 && wires.length > 0) {
                    // First wire current (scaled for visibility)
                    yValue = (wires[0].current || 0) * 100;
                } else if (channelId === 4 && wires.length > 1) {
                    // Second wire current (scaled for visibility)
                    yValue = (wires[1].current || 0) * 100;
                }
            }
            
            // Apply precise number formatting for accurate readings
            yValue = parseFloat(yValue.toFixed(6));
            
            // Add the data point
            channel.data.x.push(time);
            channel.data.y.push(yValue);
            
            // Limit data points to prevent memory issues and improve performance
            const maxPoints = 2000;
            if (channel.data.x.length > maxPoints) {
                channel.data.x.shift();
                channel.data.y.shift();
            }
        });
        
        // Update the plot with new data
        const update = {};
        this.channels.forEach((channel, channelId) => {
            update[`x${channelId-1}`] = [channel.data.x];
            update[`y${channelId-1}`] = [channel.data.y];
        });
        
        Plotly.update(this.container, update);
        
        // Update cursor information if cursors are active
        if (this.cursorType !== 'off') {
            this.updateCursorInfo();
        }
    }
    
    // Add method to auto-assign components to oscilloscope channels
    autoAssignComponents(components) {
        if (!components || !components.length) return;
        
        // Reset current assignments
        Object.keys(this.componentAssignments).forEach(channel => {
            this.componentAssignments[channel] = { type: null, id: null };
        });
        
        // Find key components to monitor
        const voltageComponents = components.filter(c => 
            (c.type === 'voltage-source' || c.type === 'capacitor') && c.id);
            
        const currentComponents = components.filter(c => 
            (c.type === 'current-source' || c.type === 'inductor' || c.type === 'resistor') && c.id);
        
        // Assign components to channels - prioritize voltage sources and capacitors
        if (voltageComponents.length > 0) {
            this.componentAssignments[1] = { type: 'component', id: voltageComponents[0].id };
            
            if (voltageComponents.length > 1) {
                this.componentAssignments[2] = { type: 'component', id: voltageComponents[1].id };
            }
        }
        
        // Assign current components to remaining channels
        if (currentComponents.length > 0) {
            const startChannel = voltageComponents.length >= 2 ? 3 : 2;
            
            if (startChannel <= 4 && currentComponents.length > 0) {
                this.componentAssignments[startChannel] = { type: 'component', id: currentComponents[0].id };
                
                if (startChannel + 1 <= 4 && currentComponents.length > 1) {
                    this.componentAssignments[startChannel + 1] = { type: 'component', id: currentComponents[1].id };
                }
            }
        }
    }
}

// ... existing code ...

// Add this at the end of the file
// Fallback circuit assistant to prevent errors if ai-assistant.js is not loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all other initialization
    setTimeout(() => {
        if (!window.circuitAssistant) {
            console.log('Creating fallback circuit assistant');
            
            // Simple fallback implementation to prevent errors
            class FallbackCircuitAssistant {
                constructor() {
                    console.log('Fallback Circuit Assistant initialized');
                }
                
                provideCircuitFeedback() {
                    // This is a no-op fallback implementation
                }
                
                addMessage() {
                    // This is a no-op fallback implementation
                }
            }
            
            window.circuitAssistant = new FallbackCircuitAssistant();
        }
    }, 1000); // Wait 1 second to make sure all other scripts have loaded
}); 

// Add event listener for oscilloscope settings changes
document.addEventListener('oscilloscopeSettingsChanged', function(event) {
    const settings = event.detail;
    console.log('Oscilloscope settings changed:', settings);
    
    // Update oscilloscope
    if (window.simulationManager && window.simulationManager.oscilloscope) {
        window.simulationManager.oscilloscope.updateSettings(settings);
    }
    
    // Update simulation worker
    if (window.simulationManager && window.simulationManager.simulationWorker) {
        window.simulationManager.simulationWorker.postMessage({
            type: 'update-accuracy',
            settings: settings
        });
    }
});

// Add init code for settings panel
function initializeSettingsPanel() {
    // Show/hide settings panel
    const oscilloscopeContainer = document.getElementById('oscilloscope-container');
    const settingsPanel = document.getElementById('oscilloscope-settings-panel');
    
    if (oscilloscopeContainer && settingsPanel) {
        // Create settings toggle button if it doesn't exist
        let settingsButton = document.getElementById('oscilloscope-settings-toggle');
        if (!settingsButton) {
            settingsButton = document.createElement('button');
            settingsButton.id = 'oscilloscope-settings-toggle';
            settingsButton.className = 'settings-toggle-btn';
            settingsButton.innerHTML = '<i class="fas fa-cog"></i> Settings';
            oscilloscopeContainer.appendChild(settingsButton);
        }
        
        // Toggle settings panel visibility
        settingsButton.addEventListener('click', function() {
            if (settingsPanel.style.display === 'none' || !settingsPanel.style.display) {
                settingsPanel.style.display = 'block';
            } else {
                settingsPanel.style.display = 'none';
            }
        });
        
        // Initially hide the settings panel
        settingsPanel.style.display = 'none';
    }
} 