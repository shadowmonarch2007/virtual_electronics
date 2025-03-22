// Add Wire class definition at the top of the file
class Wire {
    constructor(start, end) {
        // Create deep copies of the connection points to avoid reference issues
        this.start = { ...start };
        this.end = { ...end };
        this.current = 0;
        this.highlighted = false;
    }
    
    draw(ctx) {
        ctx.strokeStyle = this.highlighted ? '#FF6B00' : '#3B82F6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();
        
        // Draw connection points
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(this.start.x, this.start.y, 4, 0, Math.PI * 2);
        ctx.arc(this.end.x, this.end.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Update wire endpoints
    updateEndpoints(start, end) {
        if (start) this.start = { ...start };
        if (end) this.end = { ...end };
    }
}

class CircuitBoard {
    constructor() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.componentCanvas = document.getElementById('component-canvas');
        this.wireCanvas = document.getElementById('wire-canvas');
        this.interactionCanvas = document.getElementById('interaction-canvas');
        
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.componentCtx = this.componentCanvas.getContext('2d');
        this.wireCtx = this.wireCanvas.getContext('2d');
        this.interactionCtx = this.interactionCanvas.getContext('2d');
        
        this.gridSize = 20;
        this.showGrid = true;
        this.snapToGrid = true;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        this.draggingComponent = null;
        this.wireStartPoint = null;
        this.wireEndPoint = null;
        this.hoveredConnection = null;
        
        this.simulation = new CircuitSimulation();
        
        this.initializeCanvases();
        this.setupEventListeners();
        this.render();
    }

    initializeCanvases() {
        const updateCanvasSize = () => {
            const board = document.querySelector('.circuit-board');
            const width = board.clientWidth;
            const height = board.clientHeight;
            
            [this.gridCanvas, this.componentCanvas, this.wireCanvas, this.interactionCanvas].forEach(canvas => {
                canvas.width = width;
                canvas.height = height;
            });
            
            this.render();
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    setupEventListeners() {
        // Grid toggle
        document.getElementById('toggle-grid').addEventListener('click', () => {
            this.showGrid = !this.showGrid;
            this.render();
        });

        // Snap toggle
        document.getElementById('toggle-snap').addEventListener('click', () => {
            this.snapToGrid = !this.snapToGrid;
            document.getElementById('toggle-snap').classList.toggle('active');
        });

        // Delete component button
        document.getElementById('delete-component').addEventListener('click', () => {
            this.deleteSelectedComponent();
        });

        // Clear canvas button
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedComponent) {
                this.deleteSelectedComponent();
            }
            
            // Ctrl+Shift+Delete to clear canvas
            if (e.key === 'Delete' && e.ctrlKey && e.shiftKey) {
                this.clearCanvas();
            }
        });

        // Component dragging
        const components = document.querySelectorAll('.component');
        components.forEach(component => {
            component.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('component-type', component.dataset.component);
            });
        });

        // Canvas interactions
        this.interactionCanvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            const pos = this.getCanvasPosition(e);
            this.highlightGridCell(pos);
        });

        this.interactionCanvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const componentType = e.dataTransfer.getData('component-type');
            const pos = this.getCanvasPosition(e);
            this.addComponent(componentType, pos);
        });

        this.interactionCanvas.addEventListener('mousedown', (e) => {
            const pos = this.getCanvasPosition(e);
            const component = this.findComponentAt(pos);
            const connection = this.findConnectionPoint(pos);

            if (connection) {
                this.startWire(connection);
            } else if (component) {
                this.startDraggingComponent(component, pos);
                this.selectedComponent = component;
                this.updatePropertyPanel();
            } else {
                this.selectedComponent = null;
                this.updatePropertyPanel();
            }
            this.render();
        });

        this.interactionCanvas.addEventListener('mousemove', (e) => {
            const pos = this.getCanvasPosition(e);
            
            if (this.draggingComponent) {
                this.dragComponent(pos);
            } else if (this.wireStartPoint) {
                this.updateWirePreview(pos);
            }
            
            this.updateHoveredConnection(pos);
        });

        this.interactionCanvas.addEventListener('mouseup', (e) => {
            const pos = this.getCanvasPosition(e);
            
            if (this.draggingComponent) {
                this.stopDraggingComponent();
            } else if (this.wireStartPoint) {
                const connection = this.findConnectionPoint(pos);
                if (connection && connection !== this.wireStartPoint) {
                    this.createWire(this.wireStartPoint, connection);
                }
                this.cancelWire();
            }
        });

        // Simulation controls
        document.getElementById('start-simulation').addEventListener('click', () => {
            this.startSimulation();
        });

        document.getElementById('pause-simulation').addEventListener('click', () => {
            this.pauseSimulation();
        });

        document.getElementById('stop-simulation').addEventListener('click', () => {
            this.stopSimulation();
        });
    }

    getCanvasPosition(e) {
        const rect = this.interactionCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom - this.pan.x;
        const y = (e.clientY - rect.top) / this.zoom - this.pan.y;
        
        if (this.snapToGrid) {
            return {
                x: Math.round(x / this.gridSize) * this.gridSize,
                y: Math.round(y / this.gridSize) * this.gridSize
            };
        }
        return { x, y };
    }

    addComponent(type, pos, customProperties = null) {
        const component = new CircuitComponent(type, pos.x, pos.y, customProperties);
        this.components.push(component);
        this.simulation.addComponent(component);
        this.render();
        
        // Notify AI assistant
        if (window.circuitAssistant) {
            window.circuitAssistant.provideCircuitFeedback(this);
        }
        
        return component;
    }

    startDraggingComponent(component, pos) {
        this.draggingComponent = component;
        this.draggingOffset = {
            x: pos.x - component.x,
            y: pos.y - component.y
        };
    }

    dragComponent(pos) {
        if (!this.draggingComponent) return;
        
        // Get old connection points before moving the component
        const oldNodes = this.draggingComponent.getNodes();
        
        // Update component position
        this.draggingComponent.x = pos.x - this.draggingOffset.x;
        this.draggingComponent.y = pos.y - this.draggingOffset.y;
        
        // Snap to grid if enabled
        if (this.snapToGrid) {
            this.draggingComponent.x = Math.round(this.draggingComponent.x / this.gridSize) * this.gridSize;
            this.draggingComponent.y = Math.round(this.draggingComponent.y / this.gridSize) * this.gridSize;
        }
        
        // Update connected wires
        const connectedWires = this.findConnectedWires(this.draggingComponent);
        
        // Get new connection points after moving
        const newNodes = this.draggingComponent.getNodes();
        
        // For each connected wire, update its endpoints
        connectedWires.forEach(wire => {
            // Find which endpoint of the wire is connected to which node
            oldNodes.forEach((oldNode, index) => {
                if (this.isSamePoint(wire.start, oldNode)) {
                    wire.start = newNodes[index];
                }
                if (this.isSamePoint(wire.end, oldNode)) {
                    wire.end = newNodes[index];
                }
            });
        });
        
        this.render();
    }
    
    isSamePoint(point1, point2) {
        if (!point1 || !point2) return false;
        
        // Allow for small differences to account for floating point and rotation effects
        const tolerance = 5; // Increased tolerance to account for rotation and movement
        return Math.abs(point1.x - point2.x) <= tolerance && 
               Math.abs(point1.y - point2.y) <= tolerance;
    }

    stopDraggingComponent() {
        this.draggingComponent = null;
        this.render();
    }

    startWire(connection) {
        this.wireStartPoint = connection;
        this.render();
    }

    updateWirePreview(pos) {
        if (!this.wireStartPoint) return;
        this.wireEndPoint = pos;
        
        // Clear the interaction canvas
        this.interactionCtx.clearRect(0, 0, this.interactionCanvas.width, this.interactionCanvas.height);
        
        // Find and highlight all potential connection points
        for (const component of this.components) {
            const nodes = component.getNodes();
            
            for (const node of nodes) {
                // Skip the starting point
                if (this.isSamePoint(node, this.wireStartPoint)) continue;
                
                // Check if this node already has a connection
                const hasConnection = this.terminalHasConnection(node);
                
                // Draw a pulsing highlight around available connection points
                this.interactionCtx.beginPath();
                this.interactionCtx.arc(node.x, node.y, 8, 0, Math.PI * 2);
                
                // Use different colors based on connection availability
                if (hasConnection) {
                    // Already connected - show as unavailable
                    this.interactionCtx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Error color with transparency
                } else {
                    // Available for connection
                    this.interactionCtx.fillStyle = 'rgba(33, 150, 243, 0.3)'; // Primary color with transparency
                }
                this.interactionCtx.fill();
                
                // Inner circle
                this.interactionCtx.beginPath();
                this.interactionCtx.arc(node.x, node.y, 5, 0, Math.PI * 2);
                
                if (hasConnection) {
                    this.interactionCtx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                } else {
                this.interactionCtx.fillStyle = 'rgba(33, 150, 243, 0.6)';
                }
                this.interactionCtx.fill();
            }
        }
        
        this.render();
    }

    createWire(start, end) {
        // Create a new wire connecting the two points
        const wire = new Wire(start, end);
        this.wires.push(wire);
        
        // Update the simulation if needed
        if (this.simulation) {
            this.simulation.rebuildNetwork();
        }
        
        this.render();
        return wire;
    }

    cancelWire() {
        this.wireStartPoint = null;
        this.wireEndPoint = null;
        this.render();
    }

    findComponentAt(pos) {
        const hitArea = 20;
        return this.components.find(component => {
            return Math.abs(component.x - pos.x) < hitArea && 
                   Math.abs(component.y - pos.y) < hitArea;
        });
    }

    findConnectionPoint(pos) {
        const hitArea = 15; // Increased hit area for easier connections
        for (const component of this.components) {
            const nodes = component.getNodes();
            for (const node of nodes) {
                if (Math.abs(node.x - pos.x) < hitArea && 
                    Math.abs(node.y - pos.y) < hitArea) {
                    return node;
                }
            }
        }
        return null;
    }

    updateHoveredConnection(pos) {
        const previousHovered = this.hoveredConnection;
        this.hoveredConnection = this.findConnectionPoint(pos);
        
        if (previousHovered !== this.hoveredConnection) {
            this.render();
        }
    }

    updatePropertyPanel() {
        const propertiesDiv = document.getElementById('component-properties');
        const deleteButton = document.getElementById('delete-component');
        
        if (this.selectedComponent) {
            // Enable delete button when a component is selected
            deleteButton.classList.add('active');
            
            // Update property panel with component details
            const component = this.selectedComponent;
            
            // Create property inputs
            let html = `
                <div class="property-header">
                    <h4>${this.getComponentTitle(component)}</h4>
                </div>
                <div class="property-controls">
                    <div class="property-row">
                        <label>Rotation:</label>
                        <div class="rotation-controls">
                            <button class="rotation-button" data-rotation="-90">
                                <i class="fas fa-undo"></i>
                            </button>
                            <span>${component.rotation}°</span>
                            <button class="rotation-button" data-rotation="90">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </div>
                    ${this.createPropertyInputs(component)}
                </div>
            `;
            
            propertiesDiv.innerHTML = html;
            
            // Add event listeners for property controls
            document.querySelectorAll('.property-input').forEach(input => {
                input.addEventListener('change', e => this.updateComponentValue(e));
            });
            
            document.querySelectorAll('.rotation-button').forEach(button => {
                button.addEventListener('click', e => this.updateComponentRotation(e));
            });
        } else {
            // Disable delete button when no component is selected
            deleteButton.classList.remove('active');
            propertiesDiv.innerHTML = '<p class="no-selection">Select a component to view properties</p>';
        }
    }
    
    getComponentTitle(component) {
        const typeName = component.type.charAt(0).toUpperCase() + component.type.slice(1);
        return typeName.replace('-', ' ');
    }
    
    createPropertyInputs(component) {
        if (!component.value) return '';
        
        return `
            <div class="property-row">
                    <label>Value:</label>
                <div class="value-control">
                    <input type="number" class="property-input" value="${component.value.value}" 
                           data-property="value" min="0" step="${this.getStepValue(component.value.value)}">
                    <span>${component.value.unit}</span>
                </div>
            </div>
        `;
    }
    
    getStepValue(value) {
        // Determine an appropriate step based on the value's magnitude
        if (value < 0.1) return 0.01;
        if (value < 1) return 0.1;
        if (value < 10) return 1;
        if (value < 100) return 10;
        return 100;
    }

    updateComponentValue(event) {
        if (this.selectedComponent) {
            this.selectedComponent.value.value = parseFloat(event.target.value);
            this.render();
        }
    }

    updateComponentRotation(event) {
        if (!this.selectedComponent) return;
        
        // Get rotation amount from button data attribute
        const button = event.currentTarget;
        const rotation = parseInt(button.dataset.rotation);
        
        // Apply rotation
        let newRotation = (this.selectedComponent.rotation + rotation) % 360;
        if (newRotation < 0) newRotation += 360;
        
        this.selectedComponent.rotation = newRotation;
        
        // Update UI
        this.updatePropertyPanel();
            this.render();
    }

    drawGrid() {
        if (!this.showGrid) return;
        
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridCtx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color');
        this.gridCtx.lineWidth = 1;
        
        const startX = this.pan.x % this.gridSize;
        const startY = this.pan.y % this.gridSize;
        
        for (let x = startX; x < this.gridCanvas.width; x += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.gridCanvas.height);
            this.gridCtx.stroke();
        }
        
        for (let y = startY; y < this.gridCanvas.height; y += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.gridCanvas.width, y);
            this.gridCtx.stroke();
        }
    }

    drawComponents() {
        this.componentCtx.clearRect(0, 0, this.componentCanvas.width, this.componentCanvas.height);
        
        for (const component of this.components) {
            component.selected = component === this.selectedComponent;
            component.draw(this.componentCtx);
        }
    }

    drawWires() {
        this.wireCtx.clearRect(0, 0, this.wireCanvas.width, this.wireCanvas.height);
        
        // Draw existing wires
        for (const wire of this.wires) {
            wire.draw(this.wireCtx);
        }
        
        // Draw wire preview
        if (this.wireStartPoint && this.wireEndPoint) {
            this.wireCtx.strokeStyle = '#3B82F6';
            this.wireCtx.lineWidth = 2;
            this.wireCtx.setLineDash([5, 5]);
            this.wireCtx.beginPath();
            this.wireCtx.moveTo(this.wireStartPoint.x, this.wireStartPoint.y);
            this.wireCtx.lineTo(this.wireEndPoint.x, this.wireEndPoint.y);
            this.wireCtx.stroke();
            this.wireCtx.setLineDash([]);
        }
    }

    highlightGridCell(pos) {
        this.interactionCtx.clearRect(0, 0, this.interactionCanvas.width, this.interactionCanvas.height);
        
        if (this.snapToGrid) {
            this.interactionCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--highlight-color');
            this.interactionCtx.globalAlpha = 0.3;
            this.interactionCtx.fillRect(
                Math.round(pos.x / this.gridSize) * this.gridSize - this.gridSize/2,
                Math.round(pos.y / this.gridSize) * this.gridSize - this.gridSize/2,
                this.gridSize,
                this.gridSize
            );
            this.interactionCtx.globalAlpha = 1;
        }
    }

    startSimulation() {
        if (!this.isSimulating) {
            this.isSimulating = true;
            this.isPaused = false;
            
            // Update the simulation state
            if (this.simulation) {
                this.simulation.startSimulation();
            }
            
            // Start animation loop
            this.simulationInterval = setInterval(() => {
                this.updateResults();
            }, 1000 / 30); // 30 FPS update rate
        } else if (this.isPaused) {
            this.isPaused = false;
            
            // Resume the simulation
            if (this.simulation) {
                this.simulation.startSimulation();
            }
        }
        
        document.querySelector('#start-simulation').classList.add('active');
        document.querySelector('#pause-simulation').classList.remove('active');
    }

    pauseSimulation() {
        if (this.isSimulating && !this.isPaused) {
            this.isPaused = true;
            
            // Pause the simulation
            if (this.simulation) {
                this.simulation.stopSimulation();
            }
        }
        
        document.querySelector('#pause-simulation').classList.add('active');
        document.querySelector('#start-simulation').classList.remove('active');
    }

    stopSimulation() {
        if (this.isSimulating) {
            this.isSimulating = false;
            this.isPaused = false;
            
            // Stop the simulation
            if (this.simulation) {
                this.simulation.stopSimulation();
            }
            
            clearInterval(this.simulationInterval);
            this.clearResults();
        }
        
        document.querySelector('#start-simulation').classList.remove('active');
        document.querySelector('#pause-simulation').classList.remove('active');
    }

    updateResults() {
        const resultsDiv = document.getElementById('measurement-results');
        resultsDiv.innerHTML = '<h4>Simulation Results</h4>';
        
        // Add voltage and current measurements for each component
        this.components.forEach((component, index) => {
            resultsDiv.innerHTML += `
                <div class="measurement">
                    <span>${component.type} ${index + 1}:</span>
                    <span>V = ${(Math.random() * 5).toFixed(2)}V</span>
                    <span>I = ${(Math.random() * 0.1).toFixed(3)}A</span>
                </div>
            `;
        });
    }

    clearResults() {
        const resultsDiv = document.getElementById('measurement-results');
        resultsDiv.innerHTML = '';
    }

    render() {
        this.drawGrid();
        this.drawComponents();
        this.drawWires();
    }

    deleteSelectedComponent() {
        if (!this.selectedComponent) return;
        
        // Find connected wires
        const connectedWires = this.findConnectedWires(this.selectedComponent);
        
        // Remove connected wires
        connectedWires.forEach(wire => {
            const index = this.wires.indexOf(wire);
            if (index !== -1) {
                this.wires.splice(index, 1);
            }
        });
        
        // Remove the component
        const index = this.components.indexOf(this.selectedComponent);
        if (index !== -1) {
            this.components.splice(index, 1);
        }
        
        this.selectedComponent = null;
        this.updatePropertyPanel();
        this.render();
    }

    // Check if a terminal already has a connection
    terminalHasConnection(terminal) {
        // Allow multiple connections to ground terminals
        if (this.isGroundTerminal(terminal)) {
            return false; // Always return false for ground terminals to allow multiple connections
        }
        
        // For non-ground terminals, maintain the existing behavior
        return this.wires.some(wire => 
            this.isSamePoint(wire.start, terminal) || this.isSamePoint(wire.end, terminal)
        );
    }

    // Check if a terminal belongs to a ground component
    isGroundTerminal(terminal) {
        for (const component of this.components) {
            if (component.type === 'ground') {
                const nodes = component.getNodes();
                for (const node of nodes) {
                    if (this.isSamePoint(node, terminal)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Show error when attempting to connect to an already connected terminal
    showConnectionError() {
        // Create temporary error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'connection-error';
        errorMsg.textContent = 'Terminal already connected!';
        errorMsg.style.position = 'fixed';
        errorMsg.style.top = '20px';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translateX(-50%)';
        errorMsg.style.backgroundColor = 'var(--error-color)';
        errorMsg.style.color = 'white';
        errorMsg.style.padding = '8px 16px';
        errorMsg.style.borderRadius = '4px';
        errorMsg.style.zIndex = '1000';
        document.body.appendChild(errorMsg);
        
        // Remove after 3 seconds
        setTimeout(() => {
            document.body.removeChild(errorMsg);
        }, 3000);
    }
    
    // Clear the entire canvas
    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This will delete all components and wires.')) {
            this.components = [];
            this.wires = [];
            this.selectedComponent = null;
            this.wireStartPoint = null;
            this.wireEndPoint = null;
            this.updatePropertyPanel();
            this.render();
        }
    }
    
    // Find all wires connected to a specific component
    findConnectedWires(component) {
        const componentNodes = component.getNodes();
        return this.wires.filter(wire => 
            componentNodes.some(node => 
                this.isSamePoint(wire.start, node) || this.isSamePoint(wire.end, node)
            )
        );
    }
}

// Initialize Circuit Board
document.addEventListener('DOMContentLoaded', () => {
    window.circuitBoard = new CircuitBoard();
}); 