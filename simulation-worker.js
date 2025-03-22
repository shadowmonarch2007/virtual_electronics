// Simulation Worker for Virtual Circuit Lab
// This worker handles circuit simulation calculations off the main thread

// Add stability control constants
const SIMULATION_STABILITY = {
    VALUES_HISTORY_SIZE: 5,       // Number of historical values to maintain for stability
    VOLTAGE_CHANGE_THRESHOLD: 0.1, // Voltage change threshold for filtering rapid fluctuations
    CURRENT_CHANGE_THRESHOLD: 0.01, // Current change threshold
    TIME_CONSTANT_FACTOR: 0.2,     // Factor for time constant calculations
    STABILIZATION_ITERATIONS: 20   // Number of iterations before considering the simulation stable
};

// State variables for the simulation
let simulationState = {
    running: false,
    speed: 1,
    type: 'transient',
    components: [],
    wires: [],
    time: 0,
    // Add stability tracking
    iterationCount: 0,
    componentValueHistory: {},  // Track component value history for stability
    wireValueHistory: {},       // Track wire value history for stability
    stabilized: false,          // Flag to indicate if simulation has stabilized
    stabilityTracker: {
        samplesCollected: 0,
        maxSamples: 5,
        prevValues: new Map(), // Map to track previous values for components
        smoothingFactor: 0.7,  // Weight for exponential smoothing (0-1)
        varianceThreshold: 0.1 // Threshold for acceptable variance
    }
};

// Add API Support for External Module Integration
const SIMULATION_API = {
    // External module callback registry
    externalModules: [],
    
    // Register an external module for enhanced simulation
    registerModule: function(moduleConfig) {
        this.externalModules.push(moduleConfig);
        console.log(`External module registered: ${moduleConfig.name}`);
        return true;
    },
    
    // Call all registered modules with the current simulation state
    processWithExternalModules: function(components, wires, time) {
        let results = {
            components: [...components],
            wires: [...wires],
            modified: false
        };
        
        // Process through each registered module in sequence
        this.externalModules.forEach(module => {
            if (typeof module.process === 'function') {
                try {
                    const moduleResult = module.process(results.components, results.wires, time);
                    if (moduleResult && moduleResult.components && moduleResult.wires) {
                        results = moduleResult;
                        results.modified = true;
                    }
                } catch (error) {
                    console.error(`Error in external module ${module.name}:`, error);
                }
            }
        });
        
        return results;
    },
    
    // Get the list of registered modules
    getRegisteredModules: function() {
        return this.externalModules.map(module => ({
            name: module.name,
            description: module.description,
            version: module.version
        }));
    }
};

// Enhanced Calculation Constants
const CALCULATION_CONSTANTS = {
    // Physical constants
    ELECTRON_CHARGE: 1.602e-19,    // Coulombs
    BOLTZMANN: 1.381e-23,          // J/K
    TEMPERATURE: 300,              // Room temperature in Kelvin
    
    // Circuit analysis constants
    MIN_CONDUCTANCE: 1e-12,        // Minimum conductance to avoid division by zero
    CONVERGENCE_CRITERION: 1e-6,   // Convergence criterion for iterative solutions
    MAX_ITERATIONS: 50,            // Maximum iterations for convergence
    
    // Numerical integration parameters
    INTEGRATION_METHOD: 'trapezoid', // 'euler', 'trapezoid', or 'rk4'
    TIMESTEP_MIN: 1e-6,            // Minimum timestep for variable timestepping
    TIMESTEP_MAX: 1e-2,            // Maximum timestep for variable timestepping
    
    // Signal processing
    FILTER_ORDER: 2,               // Order of digital filters
    CUTOFF_FREQUENCY: 0.1          // Normalized cutoff frequency (0-1)
};

// Add advanced filter implementations for signal processing
const SignalProcessing = {
    // Low-pass filter implementation (IIR)
    lowPassFilter: function(input, prevOutput, alpha = 0.2) {
        return alpha * input + (1 - alpha) * prevOutput;
    },
    
    // High-pass filter (removes DC offset)
    highPassFilter: function(input, prevInput, prevOutput, alpha = 0.8) {
        return alpha * prevOutput + alpha * (input - prevInput);
    },
    
    // Moving average filter
    movingAverage: function(inputArray, windowSize = 5) {
        if (inputArray.length === 0) return 0;
        const validWindow = Math.min(windowSize, inputArray.length);
        const sum = inputArray.slice(-validWindow).reduce((acc, val) => acc + val, 0);
        return sum / validWindow;
    },
    
    // Median filter (removes outliers)
    medianFilter: function(inputArray, windowSize = 5) {
        if (inputArray.length === 0) return 0;
        const validWindow = Math.min(windowSize, inputArray.length);
        const windowData = inputArray.slice(-validWindow).sort((a, b) => a - b);
        const middle = Math.floor(windowData.length / 2);
        return windowData.length % 2 === 0 
            ? (windowData[middle - 1] + windowData[middle]) / 2
            : windowData[middle];
    },
    
    // Kalman filter for state estimation with noise
    kalmanFilter: function(measurement, prevEstimate, errorCovariance, options = {}) {
        const Q = options.processNoise || 0.001;  // Process noise
        const R = options.measurementNoise || 0.1; // Measurement noise
        
        // Prediction step
        const predictedEstimate = prevEstimate;
        const predictedErrorCovariance = errorCovariance + Q;
        
        // Update step
        const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + R);
        const currentEstimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
        const currentErrorCovariance = (1 - kalmanGain) * predictedErrorCovariance;
        
        return {
            estimate: currentEstimate,
            errorCovariance: currentErrorCovariance
        };
    },
    
    // Apply adaptive filtering to a value based on its stability
    adaptiveFilter: function(newValue, history, stability) {
        // More filtering when stability is high, less when stability is low
        const alpha = Math.min(0.8, Math.max(0.1, 1 - stability));
        const filterStrength = stability > 0.8 ? 0.9 : alpha;
        
        // Apply low-pass filter with adaptive strength
        if (history.length > 0) {
            return this.lowPassFilter(newValue, history[history.length - 1], filterStrength);
        }
        return newValue;
    }
};

// Add validation and error handling utilities
const SimulationValidator = {
    // Check if a value is a valid number
    isValidNumber: function(value) {
        return typeof value === 'number' && isFinite(value) && !isNaN(value);
    },
    
    // Validate component properties
    validateComponent: function(component) {
        if (!component || typeof component !== 'object') return false;
        
        // Check component type
        if (!component.type || typeof component.type !== 'string') return false;
        
        // Validate properties based on component type
        switch (component.type) {
            case 'resistor':
                if (component.resistance !== undefined && !this.isValidNumber(component.resistance)) {
                    component.resistance = 1000; // Default value
                }
                break;
                
            case 'capacitor':
                if (component.capacitance !== undefined && !this.isValidNumber(component.capacitance)) {
                    component.capacitance = 1e-6; // Default value
                }
                break;
                
            case 'inductor':
                if (component.inductance !== undefined && !this.isValidNumber(component.inductance)) {
                    component.inductance = 1e-3; // Default value
                }
                break;
                
            case 'voltage-source':
                if (component.voltage !== undefined && !this.isValidNumber(component.voltage)) {
                    component.voltage = 5; // Default value
                }
                break;
                
            case 'current-source':
                if (component.current !== undefined && !this.isValidNumber(component.current)) {
                    component.current = 0.01; // Default value
                }
                break;
        }
        
        // Ensure voltage and current values are valid
        if (component.voltage !== undefined && !this.isValidNumber(component.voltage)) {
            component.voltage = 0;
        }
        
        if (component.current !== undefined && !this.isValidNumber(component.current)) {
            component.current = 0;
        }
        
        return true;
    },
    
    // Validate wire properties
    validateWire: function(wire) {
        if (!wire || typeof wire !== 'object') return false;
        
        // Ensure startComponent and endComponent exist
        if (!wire.startComponent || !wire.endComponent) return false;
        
        // Ensure voltage and current values are valid
        if (wire.voltage !== undefined && !this.isValidNumber(wire.voltage)) {
            wire.voltage = 0;
        }
        
        if (wire.current !== undefined && !this.isValidNumber(wire.current)) {
            wire.current = 0;
        }
        
        return true;
    },
    
    // Validate all components in the simulation
    validateSimulation: function(components, wires) {
        let totalInvalidComponents = 0;
        let totalInvalidWires = 0;
        
        // Validate components
        components.forEach(component => {
            if (!this.validateComponent(component)) {
                totalInvalidComponents++;
            }
        });
        
        // Validate wires
        wires.forEach(wire => {
            if (!this.validateWire(wire)) {
                totalInvalidWires++;
            }
        });
        
        // Return validation summary
        return {
            valid: totalInvalidComponents === 0 && totalInvalidWires === 0,
            invalidComponents: totalInvalidComponents,
            invalidWires: totalInvalidWires
        };
    }
};

// Process messages from main thread
self.onmessage = function(event) {
    const message = event.data;
    
    switch (message.type) {
        case 'start-simulation':
            startSimulation(message.data);
            break;
        case 'pause-simulation':
            pauseSimulation();
            break;
        case 'stop-simulation':
            stopSimulation();
            break;
        case 'update-speed':
            updateSimulationSpeed(message.speed);
            break;
        case 'update-component':
            updateComponent(message.componentId, message.property, message.value);
            break;
        case 'update-accuracy':
            updateAccuracy(message.settings);
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
};

// Start the simulation with given data
function startSimulation(data) {
    simulationState.components = data.components || [];
    simulationState.wires = data.wires || [];
    simulationState.type = data.simulationType || 'tran';
    simulationState.speed = data.simulationSpeed || 1;
    simulationState.time = 0;
    simulationState.running = true;
    simulationState.iterationCount = 0;
    simulationState.componentValueHistory = {};
    simulationState.wireValueHistory = {};
    simulationState.stabilized = false;
    
    // Initialize value history for stability
    initializeValueHistory();
    
    // Configure stability tracker based on simulationType
    if (simulationState.type === 'ac') {
        simulationState.stabilityTracker.maxSamples = 10;
        simulationState.stabilityTracker.smoothingFactor = 0.8;
    } else if (simulationState.type === 'dc') {
        simulationState.stabilityTracker.maxSamples = 3;
        simulationState.stabilityTracker.smoothingFactor = 0.5;
    }
    
    // Set up interval for simulation steps based on speed
    const interval = Math.max(10, 50 / simulationState.speed); // Min 10ms, max 50ms / speed
    
    // Start simulation loop
    simulationInterval = setInterval(() => {
        if (simulationState.running) {
            performSimulationStep();
        }
    }, interval);
    
    // Notify the main thread that simulation has started
    self.postMessage({
        type: 'simulation-started'
    });
}

// Initialize value history for stability calculations
function initializeValueHistory() {
    // Initialize history for components
    simulationState.components.forEach(component => {
        simulationState.componentValueHistory[component.id] = {
            voltage: new Array(SIMULATION_STABILITY.VALUES_HISTORY_SIZE).fill(component.values?.voltage || 0),
            current: new Array(SIMULATION_STABILITY.VALUES_HISTORY_SIZE).fill(component.values?.current || 0)
        };
    });
    
    // Initialize history for wires
    simulationState.wires.forEach(wire => {
        simulationState.wireValueHistory[wire.id] = {
            current: new Array(SIMULATION_STABILITY.VALUES_HISTORY_SIZE).fill(wire.current || 0)
        };
    });
}

// Perform a single simulation step with error handling
function performSimulationStep() {
    if (!simulationState.running) return;
    
    try {
        // Increment iteration counter
        simulationState.iterationCount++;
        
        // Validate components and wires before calculation
        simulationState.components.forEach(component => {
            SimulationValidator.validateComponent(component);
        });
        
        simulationState.wires.forEach(wire => {
            SimulationValidator.validateWire(wire);
        });
        
        // Perform analysis based on simulation type
        let results;
        switch (simulationState.type) {
            case 'tran':
                results = performTransientAnalysis();
                break;
            case 'dc':
                results = performDCAnalysis();
                break;
            case 'ac':
                results = performACAnalysis();
                break;
            default:
                results = performTransientAnalysis();
        }
        
        // Validate results before sending
        if (results && results.components && results.wires) {
            // Validate all component values after calculation
            results.components.forEach(component => {
                SimulationValidator.validateComponent(component);
            });
            
            // Validate all wire values after calculation
            results.wires.forEach(wire => {
                SimulationValidator.validateWire(wire);
            });
            
            // Send results back to main thread
            self.postMessage({
                type: 'simulation-update',
                components: results.components,
                wires: results.wires,
                time: simulationState.time,
                stabilized: simulationState.stabilized,
                validationResult: SimulationValidator.validateSimulation(
                    results.components,
                    results.wires
                )
            });
        } else {
            console.error("Invalid simulation results", results);
        }
    } catch (error) {
        console.error("Error in simulation step:", error);
        // Attempt to recover and continue simulation
        self.postMessage({
            type: 'simulation-error',
            error: {
                message: error.message,
                stack: error.stack
            },
            time: simulationState.time
        });
        
        // Try to recover from error by resetting problematic components
        try {
            recoverFromError();
        } catch (recoveryError) {
            console.error("Failed to recover from simulation error:", recoveryError);
        }
    }
}

// Try to recover from simulation errors
function recoverFromError() {
    // Reset any components with invalid values
    simulationState.components.forEach(component => {
        if (!SimulationValidator.validateComponent(component)) {
            // Reset to default values
            component.values = {
                voltage: 0,
                current: 0,
                power: 0
            };
        }
    });
    
    // Reset any wires with invalid values
    simulationState.wires.forEach(wire => {
        if (!SimulationValidator.validateWire(wire)) {
            wire.current = 0;
            wire.voltage = 0;
        }
    });
    
    // Reset stability tracking
    simulationState.stabilized = false;
    simulationState.iterationCount = 0;
    
    // Reinitialize value history
    initializeValueHistory();
}

// Apply stability filtering to component values with error handling
function applyStabilityFilter(component) {
    // Skip stability filtering if the component is a voltage or current source
    // These should maintain their set values
    if (component.type === 'voltage-source' || component.type === 'current-source') {
        return;
    }
    
    // Get component history or initialize it
    if (!simulationState.componentValueHistory[component.id]) {
        simulationState.componentValueHistory[component.id] = {
            voltage: {
                values: [],
                movingAvg: component.values.voltage || 0,
                exponentialAvg: component.values.voltage || 0,
                variance: 0,
                fluctuationCount: 0,
                steadyCount: 0,
                lastUpdate: simulationState.time
            },
            current: {
                values: [],
                movingAvg: component.values.current || 0,
                exponentialAvg: component.values.current || 0,
                variance: 0,
                fluctuationCount: 0,
                steadyCount: 0,
                lastUpdate: simulationState.time
            }
        };
    }
    
    const history = simulationState.componentValueHistory[component.id];
    
    // Apply enhanced stability filter to voltage
    const filteredVoltage = enhancedStabilityFilter(
        component.values.voltage, 
        history.voltage,
        simulationState.time
    );
    
    // Apply enhanced stability filter to current
    const filteredCurrent = enhancedStabilityFilter(
        component.values.current, 
        history.current,
        simulationState.time
    );
    
    // Update component values with filtered values
    component.values.voltage = filteredVoltage;
    component.values.current = filteredCurrent;
    
    // Update component's direct voltage/current if they exist
    if (component.voltage !== undefined) {
        component.voltage = filteredVoltage;
    }
    if (component.current !== undefined) {
        component.current = filteredCurrent;
    }
}

// Enhanced stability filter with improved handling of fluctuations
function enhancedStabilityFilter(newValue, history, currentTime) {
    // If value isn't a number, return 0
    if (typeof newValue !== 'number' || isNaN(newValue) || !isFinite(newValue)) {
        return 0;
    }
    
    // Check if update is too frequent (can cause fluctuations)
    const timeDelta = currentTime - history.lastUpdate;
    
    // Limit the influence of very rapid updates
    let timeWeight = Math.min(1, timeDelta * 10);
    history.lastUpdate = currentTime;
    
    // Add the new value to history array (keep last 10 values)
    history.values.push(newValue);
    if (history.values.length > 10) {
        history.values.shift();
    }
    
    // Calculate simple moving average
    const sum = history.values.reduce((acc, val) => acc + val, 0);
    history.movingAvg = sum / history.values.length;
    
    // Calculate median (robust against outliers)
    const sortedValues = [...history.values].sort((a, b) => a - b);
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0 
        ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
        : sortedValues[mid];
    
    // Calculate variance to detect unstable values
    const variance = history.values.reduce((sum, val) => 
        sum + Math.pow(val - history.movingAvg, 2), 0) / history.values.length;
    
    history.variance = 0.8 * history.variance + 0.2 * variance; // Smooth variance
    
    // Detect if the signal is fluctuating based on normalized difference
    const normalizedDiff = Math.abs(newValue - history.exponentialAvg) / 
                    (Math.abs(history.exponentialAvg) || 0.01); // Avoid division by zero
    
    // Track signal stability
    if (normalizedDiff > 0.15) { // 15% change is considered significant
        history.fluctuationCount++;
        history.steadyCount = 0;
    } else {
        history.steadyCount++;
        history.fluctuationCount = Math.max(0, history.fluctuationCount - 0.5);
    }
    
    // Use adaptive alpha based on fluctuation level
    let alpha = 0.3; // Default
    
    if (history.fluctuationCount > 5) {
        // Highly fluctuating signal - very aggressive smoothing
        alpha = 0.05; 
    } else if (history.fluctuationCount > 2) {
        // Moderately fluctuating - moderate smoothing
        alpha = 0.1;
    } else if (history.steadyCount > 10) {
        // Very stable signal - be more responsive
        alpha = 0.5; 
    }
    
    // Apply exponential moving average with calculated alpha
    history.exponentialAvg = alpha * timeWeight * newValue + 
                            (1 - alpha * timeWeight) * history.exponentialAvg;
    
    // Choose between different filtering methods based on signal quality
    let outputValue;
    
    if (history.fluctuationCount > 5) {
        // Highly fluctuating signal - use median filter (very robust to spikes)
        outputValue = median;
    } else if (history.fluctuationCount > 2) {
        // Moderate fluctuations - use exponential moving average
        outputValue = history.exponentialAvg;
    } else {
        // Stable signal - use a weighted blend of current and smoothed value
        outputValue = 0.7 * newValue + 0.3 * history.exponentialAvg;
    }
    
    // Limit output to reasonable values
    const maxLimit = 1000;
    return Math.max(-maxLimit, Math.min(maxLimit, outputValue));
}

// Apply stability filtering to wire values with error handling
function applyWireStabilityFilter(wire) {
    try {
        if (!wire.id || !simulationState.wireValueHistory[wire.id]) return;
        
        const history = simulationState.wireValueHistory[wire.id];
        
        // Apply exponential moving average for current
        const currentValue = wire.current;
        
        // Validate current value before using it
        if (SimulationValidator.isValidNumber(currentValue)) {
            history.current.shift();
            history.current.push(currentValue);
            
            // Weighted average with adaptive weighting
            const weightFactor = simulationState.stabilized ? 0.3 : 0.6;
            const smoothedCurrent = weightedAverage(history.current, weightFactor);
            wire.current = smoothedCurrent;
        } else {
            // Reset to a safe value if invalid
            wire.current = 0;
        }
    } catch (error) {
        console.error(`Error applying stability filter to wire ${wire.id}:`, error);
        // Set to safe values in case of error
        wire.current = 0;
        if (wire.voltage !== undefined) {
            wire.voltage = 0;
        }
    }
}

// Process voltage source component with error handling
function processVoltageSource(component, time) {
    try {
        // Get component parameters with defaults
        const amplitude = parseFloat(component.parameters?.amplitude || 5);
        const frequency = parseFloat(component.parameters?.frequency || 1);
        const dcOffset = parseFloat(component.parameters?.dcOffset || 0);
        const waveform = component.parameters?.waveform || 'dc';
        
        let voltage = dcOffset;
        
        // Calculate voltage based on waveform type
        switch (waveform) {
            case 'dc':
                voltage = amplitude;
                break;
            case 'sine':
                voltage = amplitude * Math.sin(2 * Math.PI * frequency * time) + dcOffset;
                break;
            case 'square':
                voltage = ((Math.sin(2 * Math.PI * frequency * time) >= 0) ? amplitude : -amplitude) + dcOffset;
                break;
            case 'triangle':
                voltage = amplitude * (2 * Math.abs((time * frequency) % 1 - 0.5) - 0.5) * 2 + dcOffset;
                break;
            case 'sawtooth':
                voltage = amplitude * ((time * frequency) % 1 - 0.5) * 2 + dcOffset;
                break;
            default:
                voltage = amplitude; // Default to DC if unknown waveform
        }
        
        // Validate voltage value
        if (!SimulationValidator.isValidNumber(voltage)) {
            voltage = amplitude; // Fall back to amplitude if calculation fails
        }
        
        // Apply precise voltage calculation and avoid floating point issues
        voltage = parseFloat(voltage.toFixed(6));
        
        // Update component values
        component.values = { 
            voltage: voltage,
            current: component.values?.current || 0, // Maintain current value
            power: voltage * (component.values?.current || 0)
        };
    } catch (error) {
        console.error(`Error processing voltage source ${component.id}:`, error);
        // Set to safe values in case of error
        component.values = {
            voltage: 0,
            current: 0,
            power: 0
        };
    }
}

// Process capacitor component with error handling
function processCapacitor(component, componentsById, wiresById, time) {
    try {
        // Get capacitance and initial values
        const capacitance = parseFloat(component.parameters?.capacitance || 1e-6); // Default: 1µF
        const prevVoltage = component.values?.voltage || 0;
        const prevCurrent = component.values?.current || 0;
        
        // Get connected components
        const connections = getComponentConnections(component, wiresById);
        
        // Find voltage sources connected to the capacitor
        const connectedVoltageSources = findConnectedVoltageSources(component, connections, componentsById, wiresById);
        
        let voltage = prevVoltage;
        let current = prevCurrent;
        
        if (connectedVoltageSources.length > 0) {
            // Calculate time constant for RC circuit
            const sourceVoltage = connectedVoltageSources[0].values?.voltage || 0;
            const totalResistance = calculateTotalResistance(connectedVoltageSources[0], component, componentsById, wiresById);
            const timeConstant = totalResistance * capacitance;
            
            // Calculate new voltage based on RC charging equation
            // V(t) = Vs + (V0 - Vs) * e^(-t/RC)
            // Use a safe version of the exponential function to prevent overflow
            let chargeRate;
            try {
                chargeRate = Math.exp(-SIMULATION_STABILITY.TIME_CONSTANT_FACTOR / Math.max(timeConstant, 1e-9));
            } catch (e) {
                // Fallback if exp calculation fails
                chargeRate = 0.9;
            }
            
            voltage = sourceVoltage + (prevVoltage - sourceVoltage) * chargeRate;
            
            // Calculate current: I = C * dV/dt
            current = capacitance * (voltage - prevVoltage) / (0.01 * simulationState.speed);
        } else {
            // If no voltage source, capacitor discharges
            const dischargeRate = 0.99; // Simplified discharge
            voltage = prevVoltage * dischargeRate;
            current = -capacitance * (voltage - prevVoltage) / (0.01 * simulationState.speed);
        }
        
        // Validate calculated values
        if (!SimulationValidator.isValidNumber(voltage)) voltage = prevVoltage;
        if (!SimulationValidator.isValidNumber(current)) current = 0;
        
        // Apply precision
        voltage = parseFloat(voltage.toFixed(6));
        current = parseFloat(current.toFixed(9));
        
        // Ensure values are within reasonable limits
        voltage = Math.max(Math.min(voltage, 100), -100);
        current = Math.max(Math.min(current, 1), -1);
        
        // Update component values
        component.values = { 
            voltage, 
            current,
            power: voltage * current
        };
    } catch (error) {
        console.error(`Error processing capacitor ${component.id}:`, error);
        // Set to safe values in case of error
        component.values = {
            voltage: component.values?.voltage || 0,
            current: 0,
            power: 0
        };
    }
}

// Process resistor component with error handling
function processResistor(component, componentsById, wiresById) {
    try {
        // Get connected components to determine voltage and current
        const connections = getComponentConnections(component, wiresById);
        const resistance = parseFloat(component.parameters?.resistance || 1000);
        
        let voltage = 0;
        let current = 0;
        
        // Find voltage sources connected to the resistor
        const connectedVoltageSources = findConnectedVoltageSources(component, connections, componentsById, wiresById);
        
        if (connectedVoltageSources.length > 0) {
            // For simplicity, use the first voltage source's voltage divided by the total resistance
            const voltageSource = connectedVoltageSources[0];
            // Calculate total resistance in the path
            const totalResistance = calculateTotalResistance(voltageSource, component, componentsById, wiresById);
            
            // Ensure non-zero resistance to prevent division by zero
            const safeResistance = Math.max(resistance, 0.1);
            const safeTotalResistance = Math.max(totalResistance, 0.1);
            
            voltage = (voltageSource.values?.voltage || 0) * (safeResistance / safeTotalResistance);
            current = voltage / safeResistance;
        } else {
            // If no voltage source found, check for current sources
            const connectedCurrentSources = findConnectedCurrentSources(component, connections, componentsById, wiresById);
            
            if (connectedCurrentSources.length > 0) {
                // Use current from the first current source
                current = connectedCurrentSources[0].values?.current || 0;
                voltage = current * resistance;
            }
        }
        
        // Validate calculated values
        if (!SimulationValidator.isValidNumber(voltage)) voltage = 0;
        if (!SimulationValidator.isValidNumber(current)) current = 0;
        
        // Apply precision to avoid floating point issues
        voltage = parseFloat(voltage.toFixed(6));
        current = parseFloat(current.toFixed(9));
        
        // Ensure values are within reasonable limits
        voltage = Math.max(Math.min(voltage, 100), -100);
        current = Math.max(Math.min(current, 1), -1);
        
        // Update component values
        component.values = { 
            voltage, 
            current,
            power: voltage * current
        };
    } catch (error) {
        console.error(`Error processing resistor ${component.id}:`, error);
        // Set to safe values in case of error
        component.values = {
            voltage: 0,
            current: 0,
            power: 0
        };
    }
}

// Check if simulation has reached stability
function checkSimulationStability() {
    let stable = true;
    
    // Check component stability
    for (const componentId in simulationState.componentValueHistory) {
        const history = simulationState.componentValueHistory[componentId];
        const voltageStability = calculateStability(history.voltage);
        const currentStability = calculateStability(history.current);
        
        if (voltageStability > SIMULATION_STABILITY.VOLTAGE_CHANGE_THRESHOLD || 
            currentStability > SIMULATION_STABILITY.CURRENT_CHANGE_THRESHOLD) {
            stable = false;
            break;
        }
    }
    
    // Check wire stability
    if (stable) {
        for (const wireId in simulationState.wireValueHistory) {
            const history = simulationState.wireValueHistory[wireId];
            const currentStability = calculateStability(history.current);
            
            if (currentStability > SIMULATION_STABILITY.CURRENT_CHANGE_THRESHOLD) {
                stable = false;
                break;
            }
        }
    }
    
    return stable;
}

// Calculate stability metric from history array
function calculateStability(history) {
    if (history.length < 2) return 0;
    
    // Calculate average change between consecutive values
    let totalChange = 0;
    for (let i = 1; i < history.length; i++) {
        totalChange += Math.abs(history[i] - history[i-1]);
    }
    
    return totalChange / (history.length - 1);
}

// Perform transient analysis for time-domain simulation with enhanced accuracy
function performTransientAnalysis() {
    // Create lookup tables for faster component and wire access
    const componentsById = {};
    simulationState.components.forEach(component => {
        componentsById[component.id] = component;
        
        // Initialize values if not already set
        if (!component.values) {
            component.values = { voltage: 0, current: 0, power: 0 };
        }
    });
    
    const wiresById = {};
    simulationState.wires.forEach(wire => {
        wiresById[wire.id] = wire;
        
        // Initialize current if not already set
        if (wire.current === undefined) {
            wire.current = 0;
        }
        if (wire.voltage === undefined) {
            wire.voltage = 0;
        }
    });
    
    // Use time-dependent scaling for more accurate calculations during start-up
    const startupScaling = Math.min(1.0, simulationState.time * 10);
    
    // Process each component based on its type with circuit physics
    simulationState.components.forEach(component => {
        switch (component.type) {
            case 'voltage-source':
                processVoltageSource(component, simulationState.time);
                break;
            case 'current-source':
                processCurrentSource(component, simulationState.time);
                break;
            case 'resistor':
                processResistor(component, componentsById, wiresById);
                break;
            case 'capacitor':
                processCapacitor(component, componentsById, wiresById, simulationState.time);
                break;
            case 'inductor':
                processInductor(component, componentsById, wiresById, simulationState.time);
                break;
            // Add more component types here as needed
            case 'diode':
                processDiode(component, componentsById, wiresById);
                break;
            case 'transistor-npn':
            case 'transistor-pnp':
                processTransistor(component, componentsById, wiresById);
                break;
            default:
                // Default handling for unknown components
                component.values = component.values || { voltage: 0, current: 0, power: 0 };
        }
        
        // Calculate power for all components
        component.values.power = component.values.voltage * component.values.current;
        
        // Apply stability filtering to component values
        applyStabilization(component.id, 'voltage', component.values.voltage);
        applyStabilization(component.id, 'current', component.values.current);
    });
    
    // Update wire currents based on connected components
    simulationState.wires.forEach(wire => {
        // Calculate wire current based on connected components
        calculateWireCurrent(wire, componentsById, wiresById);
        
        // Apply stability filtering to wire values
        applyWireStabilityFilter(wire);
    });
    
    // Apply circuit conservation laws (Kirchhoff's laws)
    applyConservationLaws(simulationState.components, simulationState.wires, componentsById, wiresById);
    
    // Process with external modules if registered
    if (SIMULATION_API.externalModules.length > 0) {
        const externalResults = SIMULATION_API.processWithExternalModules(
            simulationState.components, 
            simulationState.wires,
            simulationState.time
        );
        
        if (externalResults.modified) {
            simulationState.components = externalResults.components;
            simulationState.wires = externalResults.wires;
        }
    }
    
    // Check simulation stability
    simulationState.stabilized = checkSimulationStability();
    
    return { components: simulationState.components, wires: simulationState.wires };
}

// Apply conservation laws to ensure physical correctness
function applyConservationLaws(components, wires, componentsById, wiresById) {
    // Find all voltage loops in the circuit
    const voltageLoops = findVoltageLoops(components, wires, componentsById, wiresById);
    
    // Apply Kirchhoff's Voltage Law to each loop
    voltageLoops.forEach(loop => {
        let totalVoltage = 0;
        
        // Calculate total voltage around loop
        loop.forEach(element => {
            if (element.type === 'component') {
                const component = componentsById[element.id];
                const voltage = component?.values?.voltage || 0;
                totalVoltage += element.direction * voltage;
            }
        });
        
        // If total voltage is not near zero, adjust component voltages
        if (Math.abs(totalVoltage) > 0.001) {
            const correction = totalVoltage / loop.length;
            
            // Distribute correction among passive components
            loop.forEach(element => {
                if (element.type === 'component') {
                    const component = componentsById[element.id];
                    
                    // Only adjust passive components, not sources
                    if (component && component.type !== 'voltage-source' && component.type !== 'current-source') {
                        component.values.voltage -= element.direction * correction;
                    }
                }
            });
        }
    });
    
    // Find all current nodes in the circuit
    const currentNodes = findCurrentNodes(components, wires, componentsById, wiresById);
    
    // Apply Kirchhoff's Current Law to each node
    currentNodes.forEach(node => {
        let totalCurrent = 0;
        
        // Calculate total current at node
        node.connections.forEach(connection => {
            if (connection.type === 'component') {
                const component = componentsById[connection.id];
                const current = component?.values?.current || 0;
                totalCurrent += connection.direction * current;
            } else if (connection.type === 'wire') {
                const wire = wiresById[connection.id];
                const current = wire?.current || 0;
                totalCurrent += connection.direction * current;
            }
        });
        
        // If total current is not near zero, adjust component currents
        if (Math.abs(totalCurrent) > 0.001) {
            const correction = totalCurrent / node.connections.length;
            
            // Distribute correction among passive components
            node.connections.forEach(connection => {
                if (connection.type === 'component') {
                    const component = componentsById[connection.id];
                    
                    // Only adjust passive components, not sources
                    if (component && component.type !== 'current-source') {
                        component.values.current -= connection.direction * correction;
                    }
                } else if (connection.type === 'wire') {
                    const wire = wiresById[connection.id];
                    if (wire) {
                        wire.current -= connection.direction * correction;
                    }
                }
            });
        }
    });
}

// Helper function to find voltage loops in the circuit
function findVoltageLoops(components, wires, componentsById, wiresById) {
    // This is a simplified implementation - a full implementation would use graph theory
    // to find all possible loops in the circuit
    const loops = [];
    
    // For simplicity, we'll just identify basic loops where components are connected in series
    components.forEach(component => {
        const connections = getComponentConnections(component, wiresById);
        if (connections.length === 2) {
            // Potentially part of a loop
            const loop = [{ type: 'component', id: component.id, direction: 1 }];
            
            // Try to follow connections to find a complete loop
            let currentWire = connections[0].wire;
            let previousComponentId = component.id;
            let maxIterations = 10; // Limit iterations to prevent infinite loops
            
            while (currentWire && maxIterations > 0) {
                // Find other components connected to this wire
                const connectedComponents = [];
                currentWire.connections.forEach(connection => {
                    const [componentId, terminal] = connection.split('-');
                    if (componentId !== previousComponentId) {
                        connectedComponents.push({
                            component: componentsById[componentId],
                            terminal: terminal
                        });
                    }
                });
                
                // If exactly one other component found, continue building the loop
                if (connectedComponents.length === 1) {
                    const nextComponent = connectedComponents[0].component;
                    if (nextComponent) {
                        loop.push({ type: 'component', id: nextComponent.id, direction: 1 });
                        
                        // If loop completes back to original component, add to loops
                        if (nextComponent.id === component.id) {
                            loops.push(loop);
                            break;
                        }
                        
                        // Continue to the next wire
                        const nextConnections = getComponentConnections(nextComponent, wiresById);
                        const nextWire = nextConnections.find(c => c.wire.id !== currentWire.id)?.wire;
                        
                        previousComponentId = nextComponent.id;
                        currentWire = nextWire;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
                
                maxIterations--;
            }
        }
    });
    
    return loops;
}

// Helper function to find current nodes in the circuit
function findCurrentNodes(components, wires, componentsById, wiresById) {
    const nodes = [];
    
    // Each wire junction or component terminal can be a node
    wires.forEach(wire => {
        if (wire.connections && wire.connections.length > 0) {
            const node = {
                id: `node-${wire.id}`,
                connections: []
            };
            
            // Add all components connected to this wire
            wire.connections.forEach(connection => {
                const [componentId, terminal] = connection.split('-');
                const component = componentsById[componentId];
                
                if (component) {
                    node.connections.push({
                        type: 'component',
                        id: componentId,
                        direction: terminal === '1' ? 1 : -1 // Assuming terminal 1 is input, 2 is output
                    });
                }
            });
            
            // Add other wires connected to this wire (for complex circuits)
            // This is simplified - full implementation would need to identify all wire junctions
            
            if (node.connections.length > 1) {
                nodes.push(node);
            }
        }
    });
    
    return nodes;
}

// Process transistor components - simplified BJT model
function processTransistor(component, componentsById, wiresById) {
    const isNPN = component.type === 'transistor-npn';
    const connections = getComponentConnections(component, wiresById);
    
    // Get transistor parameters
    const beta = parseFloat(component.parameters?.beta || 100); // Current gain
    const vbe = parseFloat(component.parameters?.vbe || 0.7);  // Base-emitter voltage
    
    // Find connected components to determine voltages
    let vb = 0; // Base voltage
    let vc = 0; // Collector voltage 
    let ve = 0; // Emitter voltage
    
    // Default values
    let ib = 0; // Base current
    let ic = 0; // Collector current
    let ie = 0; // Emitter current
    
    // Simple transistor model
    if (connections.length >= 3) {
        // Determine terminal voltages based on connected components
        // This is simplified - full implementation would trace the entire circuit
        
        // Find base voltage
        const baseConnection = connections.find(c => c.terminal === 'b');
        if (baseConnection) {
            const connectedComponents = findConnectedComponents(baseConnection.wire, component.id, componentsById);
            const voltageSource = connectedComponents.find(c => c.component.type === 'voltage-source');
            if (voltageSource) {
                vb = voltageSource.component.values?.voltage || 0;
            }
        }
        
        // Find collector voltage
        const collectorConnection = connections.find(c => c.terminal === 'c');
        if (collectorConnection) {
            const connectedComponents = findConnectedComponents(collectorConnection.wire, component.id, componentsById);
            const voltageSource = connectedComponents.find(c => c.component.type === 'voltage-source');
            if (voltageSource) {
                vc = voltageSource.component.values?.voltage || 0;
            }
        }
        
        // Emitter is often grounded (0V)
        const emitterConnection = connections.find(c => c.terminal === 'e');
        if (emitterConnection) {
            const connectedComponents = findConnectedComponents(emitterConnection.wire, component.id, componentsById);
            const voltageSource = connectedComponents.find(c => c.component.type === 'voltage-source');
            if (voltageSource) {
                ve = voltageSource.component.values?.voltage || 0;
            }
        }
        
        // Calculate transistor currents using Ebers-Moll model (simplified)
        const vbe_actual = vb - ve;
        
        // Check if transistor is in forward active region
        if (isNPN) {
            if (vbe_actual > vbe && vc > ve) {
                // NPN in forward active region
                ib = (vbe_actual - vbe) / 1000; // Base current through base resistance (~1kΩ)
                ic = beta * ib; // Collector current
                ie = ib + ic; // Emitter current (KCL)
            }
        } else {
            // PNP transistor
            if (vbe_actual < -vbe && vc < ve) {
                // PNP in forward active region
                ib = (vbe - vbe_actual) / 1000; // Base current
                ic = beta * ib; // Collector current
                ie = ib + ic; // Emitter current
            }
        }
    }
    
    // Ensure reasonable limits
    ic = Math.min(Math.max(ic, -1), 1);
    ib = Math.min(Math.max(ib, -0.1), 0.1);
    ie = Math.min(Math.max(ie, -1), 1);
    
    // Update component values
    component.values = {
        voltage: vc - ve,
        current: ic,
        base_current: ib,
        emitter_current: ie,
        vbe: vbe_actual,
        vce: vc - ve
    };
}

// Process diode component
function processDiode(component, componentsById, wiresById) {
    const connections = getComponentConnections(component, wiresById);
    
    // Get diode parameters
    const forwardVoltage = parseFloat(component.parameters?.forwardVoltage || 0.7);
    const saturationCurrent = parseFloat(component.parameters?.saturationCurrent || 1e-12);
    
    // Find connected components to determine voltage
    let voltage = 0;
    
    // Find voltage across diode from connected components
    if (connections.length >= 2) {
        // Simple model: check for voltage sources or other components
        const connectedSources = [];
        
        connections.forEach(connection => {
            const wire = connection.wire;
            if (wire && wire.connections) {
                wire.connections.forEach(wireConnection => {
                    if (!wireConnection.startsWith(component.id)) {
                        const [connectedComponentId, terminal] = wireConnection.split('-');
                        const connectedComponent = componentsById[connectedComponentId];
                        
                        if (connectedComponent && connectedComponent.values) {
                            connectedSources.push({
                                component: connectedComponent,
                                terminal: terminal,
                                voltage: connectedComponent.values.voltage || 0
                            });
                        }
                    }
                });
            }
        });
        
        // Simplified voltage calculation based on connected components
        if (connectedSources.length > 0) {
            // Use the highest voltage source connected
            const maxSource = connectedSources.reduce((max, source) => 
                source.voltage > max.voltage ? source : max, connectedSources[0]);
            
            voltage = maxSource.voltage * 0.9; // Small voltage drop in circuit
        }
    }
    
    // Calculate diode current using diode equation
    // I = Is * (e^(V/Vt) - 1) where Vt is thermal voltage (~26mV at room temperature)
    let current = 0;
    const thermalVoltage = 0.026; // 26mV at room temperature
    
    if (voltage > 0) {
        // Forward bias
        if (voltage > forwardVoltage) {
            // Above forward voltage threshold, diode conducts
            const vOverride = Math.min(voltage, 5); // Limit to prevent numerical overflow
            current = saturationCurrent * (Math.exp(vOverride / thermalVoltage) - 1);
            voltage = forwardVoltage; // Clamp voltage to forward voltage
        } else {
            // Below threshold, minimal conduction
            current = saturationCurrent * (Math.exp(voltage / thermalVoltage) - 1);
        }
    } else {
        // Reverse bias
        // Very small leakage current in reverse bias
        current = -saturationCurrent;
    }
    
    // Ensure current is within reasonable limits
    current = Math.min(Math.max(current, -1), 1);
    
    // Update component values
    component.values = {
        voltage: voltage,
        current: current,
        power: voltage * current
    };
}

// Helper function to find components connected to a wire
function findConnectedComponents(wire, excludeComponentId, componentsById) {
    const connectedComponents = [];
    
    if (wire && wire.connections) {
        wire.connections.forEach(connection => {
            const [componentId, terminal] = connection.split('-');
            
            // Skip the excluded component (to avoid circular reference)
            if (componentId !== excludeComponentId) {
                const component = componentsById[componentId];
                if (component) {
                    connectedComponents.push({
                        component: component,
                        terminal: terminal
                    });
                }
            }
        });
    }
    
    return connectedComponents;
}

// DC Analysis with simplified component values
function performDCAnalysis() {
    // Similar approach but simplified for DC values
    simulationState.components.forEach(component => {
        if (component.type === 'voltage-source') {
            component.values.voltage = component.properties.voltage.value;
            
            // Find connected resistors for current calculation
            let totalResistance = 1000; // Default resistance
            simulationState.components.forEach(c => {
                if (c.type === 'resistor') {
                    totalResistance = c.properties.resistance.value;
                }
            });
            
            component.values.current = component.values.voltage / totalResistance;
            component.values.power = component.values.voltage * component.values.current;
        } else if (component.type === 'resistor') {
            // Find connected voltage sources
            let sourceVoltage = 5; // Default voltage
            simulationState.components.forEach(c => {
                if (c.type === 'voltage-source') {
                    sourceVoltage = c.properties.voltage.value;
                }
            });
            
            const resistance = component.properties.resistance.value;
            component.values.current = sourceVoltage / resistance;
            component.values.voltage = component.values.current * resistance;
            component.values.power = component.values.voltage * component.values.current;
        } else if (component.type === 'capacitor') {
            // In DC steady state, capacitors are open circuits
            component.values.voltage = 0;
            component.values.current = 0;
            component.values.power = 0;
        } else if (component.type === 'inductor') {
            // In DC steady state, inductors are short circuits
            component.values.voltage = 0;
            // Find circuit current
            let circuitCurrent = 0.1; // Default current
            simulationState.components.forEach(c => {
                if (c.type === 'resistor' && c.values.current) {
                    circuitCurrent = c.values.current;
                }
            });
            component.values.current = circuitCurrent;
            component.values.power = 0;
        } else {
            // Other components (simplified)
            component.values.voltage = 0.5;
            component.values.current = 0.01;
            component.values.power = component.values.voltage * component.values.current;
        }
    });
    
    // Update wires
    simulationState.wires.forEach(wire => {
        // Find components connected to this wire
        const sourceId = wire.source?.componentId;
        const targetId = wire.target?.componentId;
        
        let sourceComponent = null;
        let targetComponent = null;
        
        simulationState.components.forEach(component => {
            if (component.id === sourceId) sourceComponent = component;
            if (component.id === targetId) targetComponent = component;
        });
        
        if (sourceComponent && sourceComponent.values.current) {
            wire.current = sourceComponent.values.current;
            wire.voltage = sourceComponent.values.voltage;
        } else if (targetComponent && targetComponent.values.current) {
            wire.current = targetComponent.values.current;
            wire.voltage = targetComponent.values.voltage;
        } else {
            wire.current = 0.01;
            wire.voltage = 0.1;
        }
    });
}

// AC Analysis with improved waveform generation
function performACAnalysis() {
    // Get components and their relevant properties
    const voltageSourceComponents = [];
    const resistorComponents = [];
    const capacitorComponents = [];
    const inductorComponents = [];
    
    simulationState.components.forEach(component => {
        if (component.type === 'voltage-source') voltageSourceComponents.push(component);
        if (component.type === 'resistor') resistorComponents.push(component);
        if (component.type === 'capacitor') capacitorComponents.push(component);
        if (component.type === 'inductor') inductorComponents.push(component);
    });
    
    // Process voltage sources first to generate accurate AC waveforms
    voltageSourceComponents.forEach(voltageSource => {
        const amplitude = parseFloat((voltageSource.value?.value || voltageSource.properties?.voltage?.value || 5).toFixed(6));
        const frequency = parseFloat((voltageSource.properties?.frequency?.value || 1000).toFixed(2)); // Default 1kHz
        const waveformType = voltageSource.properties?.waveform?.value || 'sine';
        
        // Generate waveform based on type
        let voltage = 0;
        const timeInSeconds = simulationState.time;
        
        switch (waveformType) {
            case 'sine':
                voltage = amplitude * Math.sin(2 * Math.PI * frequency * timeInSeconds);
                break;
            case 'square':
                voltage = amplitude * Math.sign(Math.sin(2 * Math.PI * frequency * timeInSeconds));
                break;
            case 'triangle':
                voltage = amplitude * (2 * Math.abs((2 * frequency * timeInSeconds) % 2 - 1) - 1);
                break;
            case 'sawtooth':
                voltage = amplitude * (2 * ((frequency * timeInSeconds) % 1) - 1);
                break;
            default:
                voltage = amplitude * Math.sin(2 * Math.PI * frequency * timeInSeconds);
        }
        
        voltageSource.values.voltage = parseFloat(voltage.toFixed(6));
        
        // Calculate current through the source based on the connected components
        let totalImpedance = calculateCircuitImpedance(resistorComponents, capacitorComponents, inductorComponents, frequency);
        voltageSource.values.current = parseFloat((voltageSource.values.voltage / totalImpedance).toFixed(9));
        voltageSource.values.power = parseFloat((voltageSource.values.voltage * voltageSource.values.current).toFixed(6));
    });
    
    // Process passive components and calculate their response to AC signals
    const responses = processComponents(resistorComponents, capacitorComponents, inductorComponents, voltageSourceComponents);
    
    // Update wire values based on component connections
    updateACWireValues();
    
    // Send the frequency response data along with component updates
    self.postMessage({
        type: 'frequency-response',
        data: responses
    });
}

// Calculate the total circuit impedance
function calculateCircuitImpedance(resistors, capacitors, inductors, frequency) {
    // In a real implementation, we would analyze the full circuit topology
    // This simplified approach just sums component impedances (assumes series circuit)
    
    let totalResistance = resistors.reduce((sum, r) => sum + (r.value?.value || 1000), 1000); // Default 1kΩ
    
    // Calculate capacitive reactance: Xc = 1/(2πfC)
    const totalCapacitiveReactance = capacitors.reduce((sum, c) => {
        const capacitance = ((c.value?.value || 10) * 1e-6); // μF to F
        const reactance = frequency > 0 ? 1 / (2 * Math.PI * frequency * capacitance) : Infinity;
        return sum + reactance;
    }, 0);
    
    // Calculate inductive reactance: Xl = 2πfL
    const totalInductiveReactance = inductors.reduce((sum, l) => {
        const inductance = ((l.value?.value || 1) * 1e-3); // mH to H
        const reactance = 2 * Math.PI * frequency * inductance;
        return sum + reactance;
    }, 0);
    
    // Total impedance (simplified for series circuit)
    return Math.sqrt(totalResistance * totalResistance + 
                   Math.pow(totalInductiveReactance - totalCapacitiveReactance, 2));
}

// Process component values for AC analysis
function processComponents(resistors, capacitors, inductors, voltageSources) {
    const results = [];
    const freqStep = 100; // Hz
    const freqMax = 10000; // Hz
    
    // Get circuit parameters
    const voltageSource = voltageSources.length > 0 ? voltageSources[0] : null;
    const frequency = voltageSource ? 
        parseFloat((voltageSource.properties?.frequency?.value || 1000).toFixed(2)) : 1000;
    const amplitude = voltageSource ? 
        parseFloat((voltageSource.value?.value || voltageSource.properties?.voltage?.value || 5).toFixed(6)) : 5;
    
    // Calculate and set AC values for resistors
    resistors.forEach(resistor => {
        const resistance = parseFloat((resistor.value?.value || 1000).toFixed(6));
        const current = parseFloat((voltageSource.values.current).toFixed(9));
        const voltage = parseFloat((current * resistance).toFixed(6));
        
        resistor.values.voltage = voltage;
        resistor.values.current = current;
        resistor.values.power = parseFloat((voltage * current).toFixed(6));
    });
    
    // Calculate and set AC values for capacitors
    capacitors.forEach(capacitor => {
        const capacitanceF = parseFloat(((capacitor.value?.value || 10) * 1e-6).toFixed(12)); // μF to F
        const reactance = frequency > 0 ? 1 / (2 * Math.PI * frequency * capacitanceF) : Infinity;
        const current = parseFloat((amplitude / reactance).toFixed(9));
        
        // In AC, capacitor voltage lags current by 90°
        const phaseShift = -Math.PI / 2; // -90 degrees
        const timeInSeconds = simulationState.time;
        const voltage = parseFloat((amplitude * Math.sin(2 * Math.PI * frequency * timeInSeconds + phaseShift)).toFixed(6));
        
        capacitor.values.voltage = voltage;
        capacitor.values.current = current;
        capacitor.values.power = parseFloat((voltage * current).toFixed(6));
    });
    
    // Calculate and set AC values for inductors
    inductors.forEach(inductor => {
        const inductanceH = parseFloat(((inductor.value?.value || 1) * 1e-3).toFixed(9)); // mH to H
        const reactance = 2 * Math.PI * frequency * inductanceH;
        const current = parseFloat((amplitude / reactance).toFixed(9));
        
        // In AC, inductor voltage leads current by 90°
        const phaseShift = Math.PI / 2; // 90 degrees
        const timeInSeconds = simulationState.time;
        const voltage = parseFloat((amplitude * Math.sin(2 * Math.PI * frequency * timeInSeconds + phaseShift)).toFixed(6));
        
        inductor.values.voltage = voltage;
        inductor.values.current = current;
        inductor.values.power = parseFloat((voltage * current).toFixed(6));
    });
    
    // Generate frequency response data for graph plotting
    for (let f = 10; f <= freqMax; f += freqStep) {
        // Calculate circuit response at this frequency
        const impedance = calculateCircuitImpedance(resistors, capacitors, inductors, f);
        const magnitude = parseFloat((amplitude / impedance).toFixed(6));
        
        // Calculate phase based on component reactances
        let totalReactance = 0;
        
        inductors.forEach(inductor => {
            const inductanceH = ((inductor.value?.value || 1) * 1e-3); // mH to H
            totalReactance += 2 * Math.PI * f * inductanceH;
        });
        
        capacitors.forEach(capacitor => {
            const capacitanceF = ((capacitor.value?.value || 10) * 1e-6); // μF to F
            totalReactance -= 1 / (2 * Math.PI * f * capacitanceF);
        });
        
        const totalResistance = resistors.reduce((sum, r) => sum + (r.value?.value || 1000), 1000);
        const phase = Math.atan2(totalReactance, totalResistance);
        
        results.push({
            frequency: f,
            magnitude: magnitude,
            phase: phase,
            impedance: impedance
        });
    }
    
    return results;
}

// Update wire values in AC circuit
function updateACWireValues() {
    // Map components by ID for faster lookup
    const componentsById = {};
    simulationState.components.forEach(component => {
        componentsById[component.id] = component;
    });
    
    // Update wires based on connections
    simulationState.wires.forEach(wire => {
        const sourceId = wire.source?.componentId;
        const targetId = wire.target?.componentId;
        
        const sourceComponent = sourceId ? componentsById[sourceId] : null;
        const targetComponent = targetId ? componentsById[targetId] : null;
        
        // Set wire current and voltage based on connected components
        if (sourceComponent && sourceComponent.values) {
            wire.current = parseFloat((sourceComponent.values.current || 0).toFixed(9));
            wire.voltage = parseFloat((sourceComponent.values.voltage || 0).toFixed(6));
        } else if (targetComponent && targetComponent.values) {
            wire.current = parseFloat((targetComponent.values.current || 0).toFixed(9));
            wire.voltage = parseFloat((targetComponent.values.voltage || 0).toFixed(6));
        }
    });
}

// Pause the simulation
function pauseSimulation() {
    simulationState.running = false;
    self.postMessage({
        type: 'simulation-paused'
    });
}

// Stop the simulation completely
function stopSimulation() {
    simulationState.running = false;
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    // Reset all component and wire values
    resetSimulationValues();
    
    self.postMessage({
        type: 'simulation-stopped',
        components: simulationState.components.map(c => ({
            id: c.id,
            values: c.values
        })),
        wires: simulationState.wires.map(w => ({
            id: w.id,
            current: w.current,
            voltage: w.voltage
        }))
    });
}

// Reset all component and wire values
function resetSimulationValues() {
    simulationState.components.forEach(component => {
        component.values = {
            voltage: 0,
            current: 0,
            power: 0
        };
    });
    
    simulationState.wires.forEach(wire => {
        wire.current = 0;
        wire.voltage = 0;
    });
}

// Update a specific component's properties during simulation
function updateComponent(componentId, property, value) {
    const component = simulationState.components.find(c => c.id === componentId);
    if (!component) return;
    
    // Update component's property
    if (property === 'value') {
        component.value = { value: parseFloat(value) };
    } else if (component[property] !== undefined) {
        component[property] = value;
    }
    
    // If simulation is running, recalculate values
    if (simulationState.running) {
        switch (simulationState.type) {
            case 'tran':
                performTransientAnalysis();
                break;
            case 'dc':
                performDCAnalysis();
                break;
            case 'ac':
                performACAnalysis();
                break;
            default:
                performTransientAnalysis();
        }
    }
}

// Update the simulation speed
function updateSimulationSpeed(speed) {
    if (speed <= 0) return;
    
    simulationState.speed = speed;
    
    // If simulation is running, restart the interval with new speed
    if (simulationState.running && simulationInterval) {
        clearInterval(simulationInterval);
        const interval = Math.max(10, 50 / speed); // Min 10ms, max 50ms / speed
        simulationInterval = setInterval(() => {
            // Same simulation step logic as in startSimulation
            if (!simulationState.running) return;
            
            switch (simulationState.type) {
                case 'tran':
                    performTransientAnalysis();
                    break;
                case 'dc':
                    performDCAnalysis();
                    break;
                case 'ac':
                    performACAnalysis();
                    break;
                default:
                    performTransientAnalysis();
            }
            
            simulationState.time += 0.01 * simulationState.speed;
            
            self.postMessage({
                type: 'simulation-update',
                components: simulationState.components.map(c => ({
                    id: c.id,
                    values: c.values
                })),
                wires: simulationState.wires.map(w => ({
                    id: w.id,
                    current: w.current,
                    voltage: w.voltage
                })),
                time: simulationState.time
            });
        }, interval);
    }
}

// Resume the simulation
function resumeSimulation() {
    simulationState.running = true;
    console.log("Simulation resumed");
}

// Update simulation components during runtime (for interactive changes)
function updateSimulationComponents(components, wires) {
    // Update the simulation state with new components and wires
    if (components) simulationState.components = components;
    if (wires) simulationState.wires = wires;
    
    // Reinitialize value history for new or updated components
    initializeValueHistory();
    
    // Reset stabilization flags
    simulationState.stabilized = false;
    simulationState.iterationCount = 0;
    
    console.log("Simulation components updated");
}

// Add this function to apply time-based averaging
function applyStabilization(componentId, type, newValue) {
    const tracker = simulationState.stabilityTracker;
    const key = `${componentId}-${type}`;
    
    if (!tracker.prevValues.has(key)) {
        tracker.prevValues.set(key, {
            values: [newValue],
            average: newValue,
            smoothed: newValue
        });
        return newValue;
    }
    
    const valueData = tracker.prevValues.get(key);
    
    // Add new value to history (keeping only the last N values)
    valueData.values.push(newValue);
    if (valueData.values.length > tracker.maxSamples) {
        valueData.values.shift();
    }
    
    // Calculate average
    valueData.average = valueData.values.reduce((sum, val) => sum + val, 0) / valueData.values.length;
    
    // Apply exponential smoothing
    valueData.smoothed = tracker.smoothingFactor * newValue + (1 - tracker.smoothingFactor) * valueData.smoothed;
    
    // Calculate variance to detect unstable values
    const variance = valueData.values.reduce((sum, val) => sum + Math.pow(val - valueData.average, 2), 0) / valueData.values.length;
    
    // Update state
    tracker.prevValues.set(key, valueData);
    
    // Choose best value based on variance
    if (variance > tracker.varianceThreshold) {
        // High variance, use smoothed value
        return valueData.smoothed;
    } else {
        // Low variance, use raw value for responsiveness
        return newValue;
    }
}

// Modify the performTransientAnalysis function to use the stabilization
function performTransientAnalysis() {
    // Create lookup tables for components and wires
    const componentMap = new Map();
    simulationState.components.forEach(component => {
        componentMap.set(component.id, component);
        
        // Initialize component values if not set
        if (component.type === 'voltage-source' && !component.voltage) {
            component.voltage = component.value || 5; // Default to 5V
        }
        if (component.type === 'current-source' && !component.current) {
            component.current = component.value || 0.01; // Default to 10mA
        }
        if (component.type === 'resistor' && !component.resistance) {
            component.resistance = component.value || 1000; // Default to 1k ohm
        }
        if (component.type === 'capacitor' && !component.capacitance) {
            component.capacitance = component.value || 1e-6; // Default to 1uF
        }
        if (component.type === 'inductor' && !component.inductance) {
            component.inductance = component.value || 1e-3; // Default to 1mH
        }
    });
    
    // Calculate new component values based on circuit analysis
    simulationState.components.forEach(component => {
        // Apply component-specific calculations
        if (component.type === 'resistor') {
            // V = IR, calculate voltage drop across resistor
            const current = component.current || 0;
            const resistance = component.resistance || 1000;
            const voltageDrop = current * resistance;
            
            // Apply stabilization
            component.voltage = applyStabilization(component.id, 'voltage', voltageDrop);
        }
        
        else if (component.type === 'capacitor') {
            // I = C * dV/dt
            // V = V0 + (1/C) * integral(I dt)
            const capacitance = component.capacitance || 1e-6;
            const current = component.current || 0;
            
            // Simple numerical integration
            const deltaV = (current * 0.01) / capacitance;
            const newVoltage = (component.voltage || 0) + deltaV;
            
            // Apply stabilization
            component.voltage = applyStabilization(component.id, 'voltage', newVoltage);
        }
        
        else if (component.type === 'inductor') {
            // V = L * dI/dt
            // I = I0 + (1/L) * integral(V dt)
            const inductance = component.inductance || 1e-3;
            const voltage = component.voltage || 0;
            
            // Simple numerical integration
            const deltaI = (voltage * 0.01) / inductance;
            const newCurrent = (component.current || 0) + deltaI;
            
            // Apply stabilization
            component.current = applyStabilization(component.id, 'current', newCurrent);
        }
        
        // Ensure all components have current and voltage values
        if (component.voltage === undefined) component.voltage = 0;
        if (component.current === undefined) component.current = 0;
    });
    
    // Update wire states based on connected components
    simulationState.wires.forEach(wire => {
        const startComponent = componentMap.get(wire.startComponent);
        const endComponent = componentMap.get(wire.endComponent);
        
        if (startComponent && endComponent) {
            // Simple voltage propagation - more complex circuits would need proper nodal analysis
            wire.voltage = startComponent.voltage || 0;
            wire.current = startComponent.current || 0;
        }
    });
    
    // Return updated components and wires
    return { components: simulationState.components, wires: simulationState.wires };
}

// Add a function to update the accuracy settings
function updateAccuracy(settings) {
    if (!settings) return;
    
    try {
        // Update stability settings based on accuracy level
        if (settings.accuracyLevel === 'low') {
            simulationState.stabilityTracker.maxSamples = 3;
            simulationState.stabilityTracker.smoothingFactor = 0.5;
            simulationState.stabilityTracker.varianceThreshold = 0.2;
        } 
        else if (settings.accuracyLevel === 'medium') {
            simulationState.stabilityTracker.maxSamples = 5;
            simulationState.stabilityTracker.smoothingFactor = 0.7;
            simulationState.stabilityTracker.varianceThreshold = 0.1;
        }
        else if (settings.accuracyLevel === 'high') {
            simulationState.stabilityTracker.maxSamples = 8;
            simulationState.stabilityTracker.smoothingFactor = 0.8;
            simulationState.stabilityTracker.varianceThreshold = 0.05;
        }
        else if (settings.accuracyLevel === 'ultra') {
            simulationState.stabilityTracker.maxSamples = 12;
            simulationState.stabilityTracker.smoothingFactor = 0.9;
            simulationState.stabilityTracker.varianceThreshold = 0.02;
        }
        
        // Apply calculation resolution if provided
        if (settings.calculationResolution) {
            const factor = parseInt(settings.calculationResolution);
            if (!isNaN(factor) && factor >= 1) {
                // Adjust simulation step size based on resolution
                // Higher resolution = smaller steps = more accurate calculations
                simulationState.calcResolution = factor;
            }
        }
        
        // Apply stability factor if provided
        if (settings.stabilityFactor) {
            const factor = parseInt(settings.stabilityFactor);
            if (!isNaN(factor) && factor >= 1 && factor <= 10) {
                simulationState.stabilityTracker.maxSamples = Math.max(3, Math.round(factor * 1.2));
                simulationState.stabilityTracker.smoothingFactor = 0.5 + (factor * 0.05);
            }
        }
        
        console.log("Simulation accuracy settings updated:", settings);
    } catch (error) {
        console.error("Error updating accuracy settings:", error);
    }
} 