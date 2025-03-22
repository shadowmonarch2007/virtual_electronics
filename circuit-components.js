class CircuitComponent {
    constructor(type, x, y, customProperties = null) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        
        // Get default value first
        const defaultValue = this.getDefaultValue();
        
        // If custom properties are provided, override the default value
        if (customProperties) {
            // For voltage source, use the custom voltage value
            if (type === 'voltage-source' && customProperties.voltage) {
                this.value = customProperties.voltage;
            }
            // For other component types, handle accordingly
            else if (type === 'resistor' && customProperties.resistance) {
                this.value = customProperties.resistance;
            }
            else if (type === 'capacitor' && customProperties.capacitance) {
                this.value = customProperties.capacitance;
            }
            else if (type === 'inductor' && customProperties.inductance) {
                this.value = customProperties.inductance;
            }
            else if (type === 'current-source' && customProperties.current) {
                this.value = customProperties.current;
            }
            else if (type === 'diode' && customProperties.forward_voltage) {
                this.value = customProperties.forward_voltage;
            }
            else {
                this.value = defaultValue;
            }
            
            // Handle additional properties
            if (customProperties.subtype) {
                this.subtype = customProperties.subtype;
            }
            if (customProperties.color) {
                this.color = customProperties.color;
            }
        } else {
            // No custom properties, use default
            this.value = defaultValue;
        }
        
        this.nodes = [];
        this.selected = false;
    }

    getDefaultValue() {
        switch (this.type) {
            case 'resistor': return { value: 1000, unit: 'Ω' }; // 1kΩ
            case 'capacitor': return { value: 1e-6, unit: 'F' }; // 1µF
            case 'inductor': return { value: 1e-3, unit: 'H' }; // 1mH
            case 'voltage-source': return { value: 5, unit: 'V' }; // 5V
            case 'current-source': return { value: 0.001, unit: 'A' }; // 1mA
            case 'diode': return { value: 0.7, unit: 'V' }; // 0.7V forward voltage
            case 'transistor': return { value: 100, unit: 'β' }; // current gain
            case 'ground': return { value: 0, unit: 'V' }; // 0V reference
            default: return { value: 0, unit: '' };
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Draw component based on type
        switch (this.type) {
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
            case 'diode':
                this.drawDiode(ctx);
                break;
            case 'transistor':
                this.drawTransistor(ctx);
                break;
            case 'ground':
                this.drawGround(ctx);
                break;
        }
        
        // Draw connection points
        this.drawConnectionPoints(ctx);
        
        // Draw selection indicator if selected
        if (this.selected) {
            this.drawSelectionBox(ctx);
        }
        
        ctx.restore();
    }

    drawResistor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        
        // Draw zigzag
        ctx.lineTo(-15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 10);
        ctx.lineTo(0, -10);
        ctx.lineTo(5, 10);
        ctx.lineTo(10, -10);
        ctx.lineTo(15, 10);
        ctx.lineTo(20, 0);
        
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawCapacitor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-5, 0);
        
        // Draw plates
        ctx.moveTo(-5, -15);
        ctx.lineTo(-5, 15);
        ctx.moveTo(5, -15);
        ctx.lineTo(5, 15);
        
        ctx.moveTo(5, 0);
        ctx.lineTo(20, 0);
        
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawInductor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        
        // Draw coils
        for (let i = 0; i < 4; i++) {
            ctx.arc(-10 + i * 10, 0, 5, Math.PI, 0, false);
        }
        
        ctx.lineTo(20, 0);
        
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawVoltageSource(ctx) {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw plus and minus
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, -5);
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 0);
        ctx.moveTo(-5, 5);
        ctx.lineTo(5, 5);
        ctx.stroke();
    }

    drawCurrentSource(ctx) {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 10);
        ctx.moveTo(-5, 5);
        ctx.lineTo(0, 10);
        ctx.lineTo(5, 5);
        ctx.stroke();
    }

    drawDiode(ctx) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-5, 0);
        
        // Draw triangle
        ctx.moveTo(-5, -10);
        ctx.lineTo(-5, 10);
        ctx.lineTo(5, 0);
        ctx.closePath();
        
        // Draw line
        ctx.moveTo(5, -10);
        ctx.lineTo(5, 10);
        
        ctx.moveTo(5, 0);
        ctx.lineTo(20, 0);
        
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
            ctx.fillStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();
    }

    drawTransistor(ctx) {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw emitter
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Draw collector and base lines
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-5, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
    }

    drawGround(ctx) {
        // Draw ground terminal line
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, 0);
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--component-color') || '#1F2937';
        } catch (e) {
            ctx.strokeStyle = '#1F2937'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw ground symbol (3 decreasing lines)
        ctx.beginPath();
        // First (longest) line
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        // Second line
        ctx.moveTo(-8, 5);
        ctx.lineTo(8, 5);
        // Third line
        ctx.moveTo(-4, 10);
        ctx.lineTo(4, 10);
        ctx.stroke();
    }

    drawSelectionBox(ctx) {
        // Use a fallback color if CSS variable is not available
        try {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--selection-color') || '#3B82F6';
        } catch (e) {
            ctx.strokeStyle = '#3B82F6'; // Fallback color
        }
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw a slightly larger box around the component
        ctx.strokeRect(-30, -25, 60, 50);
        
        // Draw selection handles at each corner
        const corners = [
            { x: -30, y: -25 },
            { x: 30, y: -25 },
            { x: 30, y: 25 },
            { x: -30, y: 25 }
        ];
        
        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
            // Use a fallback color if CSS variable is not available
            try {
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--selection-color') || '#3B82F6';
            } catch (e) {
                ctx.fillStyle = '#3B82F6'; // Fallback color
            }
            ctx.fill();
        });
        
        ctx.setLineDash([]);
    }

    drawConnectionPoints(ctx) {
        const nodes = this.getNodes();
        
        nodes.forEach(node => {
            // Calculate point position based on component center
            let x = 0;
            let y = 0;
            
            if (node.type === 'input' || node.type === 'base') {
                x = -20;
                y = 0;
            } else if (node.type === 'output') {
                x = 20;
                y = 0;
            } else if (node.type === 'positive' || node.type === 'collector' || node.type === 'terminal') {
                x = 0;
                y = -20;
            } else if (node.type === 'negative' || node.type === 'emitter') {
                x = 0;
                y = 20;
            }
            
            // Draw connection point
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--connection-color') || '#ff9800';
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--connection-border') || '#e65100';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            
            // Add labels for source terminals
            if (this.type.includes('source')) {
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color') || '#333';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (node.type === 'positive') {
                    ctx.fillText('+', x, y - 12);
                } else if (node.type === 'negative') {
                    ctx.fillText('-', x, y + 12);
                }
            }
        });
    }

    getNodes() {
        const rotationRad = this.rotation * Math.PI / 180;
        const cos = Math.cos(rotationRad);
        const sin = Math.sin(rotationRad);
        
        // Helper function to rotate points
        const rotatePoint = (x, y) => {
            return {
                x: this.x + x * cos - y * sin,
                y: this.y + x * sin + y * cos
            };
        };
        
        switch (this.type) {
            case 'resistor':
            case 'inductor':
                return [
                    { ...rotatePoint(-20, 0), type: 'input' },
                    { ...rotatePoint(20, 0), type: 'output' }
                ];
                
            case 'capacitor':
                return [
                    { ...rotatePoint(-20, 0), type: 'input' },
                    { ...rotatePoint(20, 0), type: 'output' }
                ];
                
            case 'voltage-source':
            case 'current-source':
                return [
                    { ...rotatePoint(0, -20), type: 'positive', x: this.x, y: this.y - 20 },
                    { ...rotatePoint(0, 20), type: 'negative', x: this.x, y: this.y + 20 }
                ];
                
            case 'diode':
                return [
                    { ...rotatePoint(-15, 0), type: 'input' },
                    { ...rotatePoint(15, 0), type: 'output' }
                ];
                
            case 'transistor':
                return [
                    { ...rotatePoint(0, -20), type: 'collector' },
                    { ...rotatePoint(-20, 0), type: 'base' },
                    { ...rotatePoint(0, 20), type: 'emitter' }
                ];
                
            case 'ground':
                return [
                    { ...rotatePoint(0, -20), type: 'terminal' }
                ];
                
            default:
                return [];
        }
    }
}

// Circuit Simulation Engine
class CircuitSimulation {
    constructor() {
        this.components = [];
        this.nodes = new Map();
        this.groundNodeIndex = null;
        this.matrix = [];
        this.solution = [];
        this.isRunning = false;
    }

    addComponent(component) {
        this.components.push(component);
    }

    buildNodeList() {
        this.nodes.clear();
        this.groundNodeIndex = null;
        let nodeIndex = 0;
        
        // First pass: find ground nodes
        for (const component of this.components) {
            if (component.type === 'ground') {
                const nodes = component.getNodes();
                const terminalNode = nodes[0]; // Ground has one terminal
                const key = `${Math.round(terminalNode.x)},${Math.round(terminalNode.y)}`;
                this.nodes.set(key, 0); // Always assign ground to node 0
                this.groundNodeIndex = 0;
                nodeIndex = 1; // Start other nodes from 1
                break;
            }
        }
        
        // Second pass: add all other nodes
        for (const component of this.components) {
            if (component.type !== 'ground') { // Skip ground in second pass
                const componentNodes = component.getNodes();
                for (const node of componentNodes) {
                    const key = `${Math.round(node.x)},${Math.round(node.y)}`;
                    if (!this.nodes.has(key)) {
                        this.nodes.set(key, nodeIndex++);
                    }
                }
            }
        }
    }

    buildMatrix() {
        const size = this.nodes.size;
        
        // If ground node exists, we can reduce the matrix size by 1
        const matrixSize = this.groundNodeIndex !== null ? size - 1 : size;
        this.matrix = Array(matrixSize).fill().map(() => Array(matrixSize + 1).fill(0));
        
        for (const component of this.components) {
            if (component.type !== 'ground') { // Skip ground in matrix building
                this.addComponentToMatrix(component);
            }
        }
    }

    addComponentToMatrix(component) {
        const nodes = component.getNodes();
        if (nodes.length < 2) return; // Skip components with less than 2 nodes
        
        const key1 = `${Math.round(nodes[0].x)},${Math.round(nodes[0].y)}`;
        const key2 = `${Math.round(nodes[1].x)},${Math.round(nodes[1].y)}`;
        
        const n1 = this.nodes.get(key1);
        const n2 = this.nodes.get(key2);
        
        // Skip if node indices are undefined
        if (n1 === undefined || n2 === undefined) return;
        
        // Adjust indices for reduced matrix if ground exists
        const idx1 = (this.groundNodeIndex === 0 && n1 > 0) ? n1 - 1 : n1;
        const idx2 = (this.groundNodeIndex === 0 && n2 > 0) ? n2 - 1 : n2;
        
        // Skip ground node in matrix operations
        if (this.groundNodeIndex === 0) {
            if (n1 === 0 || n2 === 0) {
                // One node is ground
                if (component.type === 'voltage-source') {
                    if (n1 === 0) {
                        // n2 is non-ground, node voltage = source voltage
                        this.matrix[idx2][this.matrix[0].length - 1] = component.value.value;
                    } else {
                        // n1 is non-ground, node voltage = source voltage
                        this.matrix[idx1][this.matrix[0].length - 1] = component.value.value;
                    }
                }
                return;
            }
        }
        
        // For non-ground connections
        switch (component.type) {
            case 'resistor':
                const conductance = 1 / component.value.value;
                if (idx1 < this.matrix.length && idx2 < this.matrix.length) {
                    this.matrix[idx1][idx1] += conductance;
                    this.matrix[idx2][idx2] += conductance;
                    this.matrix[idx1][idx2] -= conductance;
                    this.matrix[idx2][idx1] -= conductance;
                }
                break;
            case 'voltage-source':
                // Simplified voltage source handling
                if (idx1 < this.matrix.length && idx2 < this.matrix.length) {
                    if (nodes[0].type === 'positive') {
                        this.matrix[idx1][this.matrix[0].length - 1] += component.value.value;
                    } else {
                        this.matrix[idx2][this.matrix[0].length - 1] += component.value.value;
                    }
                }
                break;
        }
    }

    solve() {
        // Implement matrix solution
        this.buildNodeList();
        this.buildMatrix();
        
        // Only solve if we have a valid matrix
        if (this.matrix.length > 0) {
            this.solution = this.gaussianElimination(this.matrix);
            
            // Insert ground voltage (0) if ground exists
            if (this.groundNodeIndex === 0) {
                this.solution = [0, ...this.solution];
            }
        } else {
            this.solution = [];
        }
    }

    gaussianElimination(matrix) {
        // Implement Gaussian elimination algorithm
        // This is a placeholder - you'll need to implement the full algorithm
        return Array(matrix.length).fill(0);
    }

    // Add this method to handle component position updates
    updateComponentPosition(component) {
        // Rebuild the node list when component positions change
        this.buildNodeList();
        
        // If we're in the middle of a simulation, we might need to rebuild the matrix
        if (this.matrix.length > 0) {
            this.buildMatrix();
        }
    }

    // Method to rebuild the network when wires or components change
    rebuildNetwork() {
        // Rebuild nodes and matrix for the simulation
        this.buildNodeList();
        
        // If we're in an active simulation, rebuild the matrix
        if (this.matrix.length > 0) {
            this.buildMatrix();
            
            // Optionally re-solve if in continuous simulation mode
            if (this.isRunning) {
                this.solve();
            }
        }
    }

    // Methods to control simulation state
    startSimulation() {
        this.isRunning = true;
    }
    
    stopSimulation() {
        this.isRunning = false;
    }
}

// Export classes
window.CircuitComponent = CircuitComponent;
window.CircuitSimulation = CircuitSimulation; 