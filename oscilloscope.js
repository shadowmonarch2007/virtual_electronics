// Enhanced Oscilloscope Class for Virtual Circuit Lab
class EnhancedOscilloscope {
    constructor(container, timeScale = 1, voltageScale = 1) {
        this.container = container;
        this.timeScale = timeScale;
        this.voltageScale = voltageScale;
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
        this.waveformMemory = 5; // Seconds of waveform to store
        this.samplingRate = 1000; // Samples per second
        this.dataBuffer = {
            1: { x: [], y: [] },
            2: { x: [], y: [] },
            3: { x: [], y: [] },
            4: { x: [], y: [] }
        };
        this.lastUpdate = 0;
        
        // Add settings object with defaults
        this.settings = {
            accuracyLevel: 'medium',
            samplingRate: 5,
            noiseFiltering: 5,
            waveformPersistence: 5,
            externalModule: 'none'
        };
        
        // Initialize the oscilloscope
        this.init();
        
        // Store a reference to this oscilloscope instance on the container element
        container._oscilloscope = this;
        
        console.log("Oscilloscope initialized");
    }
    
    init() {
        // Clear any existing content
        this.container.innerHTML = '';
        
        // Apply default settings
        this.applySettings();
        
        // Initialize the oscilloscope display
        this.initializeDisplay();
    }
    
    initializeDisplay() {
        // Clear container
        this.container.innerHTML = '';
        
        // Ensure container has adequate dimensions
        if (!this.container.style.height || this.container.style.height === 'auto') {
            this.container.style.height = '300px';
        }
        
        console.log("Initializing oscilloscope display in container:", this.container.id);
        console.log("Container dimensions:", this.container.offsetWidth, "x", this.container.offsetHeight);
        
        // Check if Plotly is available
        if (typeof Plotly === 'undefined') {
            console.error("Plotly library not available. Cannot initialize oscilloscope display.");
            // Create fallback message
            this.container.innerHTML = '<div style="color: red; padding: 20px;">Plotly library not loaded. Oscilloscope cannot be displayed.</div>';
            return;
        }
        
        // Create the simplest possible plot with a green sine wave
        try {
            const points = 100;
            const x = Array(points).fill().map((_, i) => i * 0.1);
            const y = x.map(t => 3 * Math.sin(t * Math.PI));
            
            const data = [{
                x: x,
                y: y,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: '#00ff00',
                    width: 2
                }
            }];
            
            const layout = {
                margin: { t: 10, r: 10, b: 30, l: 40 },
                xaxis: {
                    title: 'Time (ms)',
                    showgrid: true,
                    zeroline: true,
                    gridcolor: 'rgba(0, 255, 0, 0.3)',
                    zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                    color: 'rgba(0, 255, 0, 0.7)',
                    range: [0, 10]
                },
                yaxis: {
                    title: 'Voltage (V)',
                    showgrid: true,
                    zeroline: true,
                    gridcolor: 'rgba(0, 255, 0, 0.3)',
                    zerolinecolor: 'rgba(0, 255, 0, 0.5)',
                    color: 'rgba(0, 255, 0, 0.7)',
                    range: [-5, 5]
                },
                plot_bgcolor: '#001824',
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
                font: {
                    color: 'rgba(0, 255, 0, 0.7)',
                    size: 10
                },
                showlegend: false
            };
            
            const config = {
                displayModeBar: false,
                responsive: true,
                staticPlot: false
            };
            
            Plotly.newPlot(this.container, data, layout, config)
                .then(() => {
                    console.log("Basic oscilloscope display initialized successfully");
                    
                    // Apply phosphor glow effect to traces
                    const traces = this.container.querySelectorAll('.traces path.js-line');
                    traces.forEach(trace => {
                        trace.style.filter = 'drop-shadow(0 0 3px rgba(0, 255, 0, 0.7))';
                    });
                    
                    // Add basic readings display
                    this.addReadingsDisplay();
                })
                .catch(err => {
                    console.error("Error initializing basic display:", err);
                    // Create fallback message in case of error
                    this.container.innerHTML = '<div style="color: red; padding: 20px;">Error initializing oscilloscope: ' + err.message + '</div>';
                });
        } catch (err) {
            console.error("Exception in basic display initialization:", err);
            // Create fallback message in case of error
            this.container.innerHTML = '<div style="color: red; padding: 20px;">Error initializing oscilloscope: ' + err.message + '</div>';
        }
    }
    
    updateTheme(theme) {
        // Always keep CRO appearance regardless of theme
        Plotly.relayout(this.container, {
            'plot_bgcolor': '#001824',
            'paper_bgcolor': 'rgba(0, 0, 0, 0)',
            'xaxis.gridcolor': 'rgba(0, 255, 0, 0.3)',
            'yaxis.gridcolor': 'rgba(0, 255, 0, 0.3)',
            'xaxis.zerolinecolor': 'rgba(0, 255, 0, 0.5)',
            'yaxis.zerolinecolor': 'rgba(0, 255, 0, 0.5)',
            'xaxis.color': 'rgba(0, 255, 0, 0.7)',
            'yaxis.color': 'rgba(0, 255, 0, 0.7)',
            'font.color': 'rgba(0, 255, 0, 0.7)'
        });
    }
    
    addChannel(channelConfig) {
        // Define bright signal colors that stand out against dark background
        const channelColors = {
            1: '#00ff00', // Green (main channel)
            2: '#ff4500', // Orange-Red
            3: '#00bfff', // Deep Sky Blue
            4: '#ffff00'  // Yellow
        };
        
        // Use the channel color or a default if not provided
        const color = channelConfig.color || channelColors[channelConfig.id] || '#00ff00';
        
        this.channels.set(channelConfig.id, {
            id: channelConfig.id,
            color: color,
            visible: channelConfig.visible,
            data: { x: [], y: [] }
        });
        
        // Add trace to the plot with phosphor-like glow effect
        Plotly.addTraces(this.container, {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            line: {
                color: color,
                width: 2,
                shape: 'spline', // Smooth line for realistic appearance
                smoothing: 1.3, // Increased smoothing for analog look
            },
            fill: 'none',
            hoverinfo: 'none',
            visible: channelConfig.visible ? true : 'legendonly'
        });
        
        console.log(`Added oscilloscope channel ${channelConfig.id} with color ${color}`);
    }
    
    // Add oscilloscope controls overlay
    addControlsOverlay() {
        // Skip if the container has the controls already
        if (this.container.querySelector('.oscilloscope-controls-overlay')) {
            return;
        }
        
        const controlsOverlay = document.createElement('div');
        controlsOverlay.className = 'oscilloscope-controls-overlay';
        controlsOverlay.style.position = 'absolute';
        controlsOverlay.style.top = '5px';
        controlsOverlay.style.left = '5px';
        controlsOverlay.style.backgroundColor = 'rgba(0, 20, 0, 0.7)';
        controlsOverlay.style.color = '#00ff00';
        controlsOverlay.style.padding = '5px';
        controlsOverlay.style.borderRadius = '3px';
        controlsOverlay.style.fontFamily = 'monospace';
        controlsOverlay.style.fontSize = '10px';
        controlsOverlay.style.zIndex = '100';
        
        // Add time base control
        const timeBaseControl = document.createElement('div');
        timeBaseControl.innerHTML = `
            <label style="display: flex; align-items: center; margin-bottom: 5px;">
                <span style="min-width: 70px;">Time Base:</span>
                <input type="range" min="0.1" max="10" step="0.1" value="${this.timeScale}" style="flex-grow: 1; margin: 0 5px;">
                <span id="timebase-value">${this.timeScale} ms/div</span>
            </label>
        `;
        controlsOverlay.appendChild(timeBaseControl);
        
        // Add voltage scale control
        const voltageScaleControl = document.createElement('div');
        voltageScaleControl.innerHTML = `
            <label style="display: flex; align-items: center; margin-bottom: 5px;">
                <span style="min-width: 70px;">Voltage:</span>
                <input type="range" min="0.1" max="10" step="0.1" value="${this.voltageScale}" style="flex-grow: 1; margin: 0 5px;">
                <span id="voltage-value">${this.voltageScale} V/div</span>
            </label>
        `;
        controlsOverlay.appendChild(voltageScaleControl);
        
        // Add trigger control (placeholder for future enhancement)
        const triggerControl = document.createElement('div');
        triggerControl.innerHTML = `
            <label style="display: flex; align-items: center;">
                <span style="min-width: 70px;">Trigger:</span>
                <select style="flex-grow: 1; background: #001824; color: #00ff00; border: 1px solid #00ff00;">
                    <option value="auto">Auto</option>
                    <option value="normal">Normal</option>
                    <option value="single">Single</option>
                </select>
            </label>
        `;
        controlsOverlay.appendChild(triggerControl);
        
        // Add event listeners
        const timeBaseInput = timeBaseControl.querySelector('input');
        const timeBaseValue = timeBaseControl.querySelector('#timebase-value');
        timeBaseInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setTimeScale(value);
            timeBaseValue.textContent = `${value} ms/div`;
        });
        
        const voltageInput = voltageScaleControl.querySelector('input');
        const voltageValue = voltageScaleControl.querySelector('#voltage-value');
        voltageInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setVoltageScale(value);
            voltageValue.textContent = `${value} V/div`;
        });
        
        this.container.appendChild(controlsOverlay);
    }
    
    setActiveChannel(channelId) {
        this.activeChannel = channelId;
    }
    
    setChannelVisibility(channelId, visible) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.visible = visible;
            
            // Update plot visibility
            const update = {
                visible: visible ? true : 'legendonly'
            };
            
            Plotly.restyle(this.container, update, channelId-1);
            console.log(`Channel ${channelId} visibility set to ${visible}`);
        }
    }
    
    setTimeScale(scale) {
        this.timeScale = scale;
        
        // Update x-axis range
        Plotly.relayout(this.container, {
            'xaxis.range': [0, this.timeScale * 10], // 10 divisions
            'xaxis.dtick': this.timeScale // Set grid lines at scale intervals
        });
        
        console.log(`Time scale set to ${scale} ms/div`);
    }
    
    setVoltageScale(scale) {
        this.voltageScale = scale;
        
        // Update y-axis range
        Plotly.relayout(this.container, {
            'yaxis.range': [-this.voltageScale * 4, this.voltageScale * 4], // 8 divisions centered at 0
            'yaxis.dtick': this.voltageScale // Set grid lines at scale intervals
        });
        
        console.log(`Voltage scale set to ${scale} V/div`);
    }
    
    setCursorType(type) {
        this.cursorType = type;
        
        // Clear existing cursors
        this.clearCursors();
        
        // Setup new cursors if not 'off'
        if (type !== 'off') {
            this.setupCursors(type);
        }
        
        console.log(`Cursor type set to ${type}`);
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
        this.updateCursorInfo();
    }
    
    drawCursors() {
        const shapes = [];
        
        // Add time cursors if set - using bright green for visibility
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
                    color: 'rgba(0, 255, 0, 0.7)',
                    width: 1,
                    dash: 'dash'
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
                    color: 'rgba(0, 255, 0, 0.7)',
                    width: 1,
                    dash: 'dash'
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
                    color: 'rgba(0, 255, 0, 0.7)',
                    width: 1,
                    dash: 'dash'
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
                    color: 'rgba(0, 255, 0, 0.7)',
                    width: 1,
                    dash: 'dash'
                }
            });
        }
        
        // Draw cursor lines
        Plotly.relayout(this.container, { shapes: shapes });
    }
    
    updateCursorInfo() {
        let cursorText = '<div style="background-color: rgba(0,30,0,0.7); color: #00ff00; padding: 8px; border-radius: 4px; font-family: monospace;">';
        
        // Time cursor measurements
        if (this.timeCursors.x1 !== null && this.timeCursors.x2 !== null) {
            const t1 = this.timeCursors.x1.toFixed(2);
            const t2 = this.timeCursors.x2.toFixed(2);
            const dt = Math.abs(this.timeCursors.x2 - this.timeCursors.x1).toFixed(2);
            const freq = (1000 / parseFloat(dt)).toFixed(2);
            
            cursorText += `Δt: ${dt} ms (${freq} Hz)<br>`;
        }
        
        // Voltage cursor measurements
        if (this.voltageCursors.y1 !== null && this.voltageCursors.y2 !== null) {
            const v1 = this.voltageCursors.y1.toFixed(2);
            const v2 = this.voltageCursors.y2.toFixed(2);
            const dv = Math.abs(this.voltageCursors.y2 - this.voltageCursors.y1).toFixed(2);
            
            cursorText += `ΔV: ${dv} V`;
        }
        
        cursorText += '</div>';
        
        // Create overlay for cursor info
        const cursorOverlay = document.createElement('div');
        cursorOverlay.style.position = 'absolute';
        cursorOverlay.style.top = '10px';
        cursorOverlay.style.right = '10px';
        cursorOverlay.style.zIndex = '100';
        cursorOverlay.innerHTML = cursorText;
        
        // Remove any existing cursor overlay
        const existingOverlay = this.container.querySelector('.cursor-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Add the new cursor overlay
        cursorOverlay.className = 'cursor-overlay';
        this.container.appendChild(cursorOverlay);
    }
    
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
    
    updateData(components, wires, timeStep) {
        if (!components || !wires) return;
        
        // Create lookup tables for faster access
        const componentsMap = new Map();
        const wiresMap = new Map();
        
        components.forEach(component => {
            componentsMap.set(component.id, component);
        });
        
        wires.forEach(wire => {
            wiresMap.set(wire.id, wire);
        });
        
        // Initialize filter parameters if not already set
        if (!this.filterConfig) {
            this.filterConfig = {
                enabled: true,
                samplingInterval: this.samplingInterval || 1,
                alpha: 0.7, // Exponential moving average factor
                outlierThreshold: 0.8,
                adaptiveSampling: true,
                noiseReduction: true
            };
        }
        
        // Initialize filter state if not already set
        if (!this.filterState) {
            this.filterState = {
                lastValues: new Map(),
                movingAverages: new Map(),
                standardDeviations: new Map(),
                signalStats: new Map()
            };
        }
        
        // Determine if we should sample based on sampling interval
        const shouldSample = (this.sampleCounter || 0) % this.filterConfig.samplingInterval === 0;
        this.sampleCounter = (this.sampleCounter || 0) + 1;
        
        if (!shouldSample && this.filterConfig.samplingInterval > 1) {
            return;
        }
        
        // Process each channel
        this.channels.forEach((channel, index) => {
            if (!channel.visible) return;
            
            let value = null;
            let componentOrWireId = this.componentAssignments[index + 1].id;
            
            // Get component or wire value
            if (componentOrWireId) {
                const component = componentsMap.get(componentOrWireId);
                const wire = wiresMap.get(componentOrWireId);
                
                if (component) {
                    // Get value based on component type and channel mode
                    if (channel.mode === 'voltage') {
                        value = component.voltage !== undefined ? component.voltage : 
                               (component.values ? component.values.voltage : 0);
                        
                        // Special handling for voltage sources
                        if (component.type === 'voltage-source' && component.voltage !== undefined) {
                            value = component.voltage;
                        }
                    } else if (channel.mode === 'current') {
                        value = component.current !== undefined ? component.current : 
                               (component.values ? component.values.current : 0);
                        
                        // Special handling for current sources
                        if (component.type === 'current-source' && component.current !== undefined) {
                            value = component.current;
                        }
                    }
                } else if (wire) {
                    // Get wire value based on channel mode
                    if (channel.mode === 'voltage') {
                        value = wire.voltage !== undefined ? wire.voltage : 0;
                    } else if (channel.mode === 'current') {
                        value = wire.current !== undefined ? wire.current : 0;
                    }
                }
            }
            
            // Apply filtering if enabled
            if (value !== null && this.filterConfig.enabled) {
                const channelId = `channel-${index + 1}`;
                
                // Get last value, or use current value if no last value
                const lastValue = this.filterState.lastValues.get(channelId) ?? value;
                
                // Calculate moving average
                const alpha = this.filterConfig.alpha;
                let movingAvg = this.filterState.movingAverages.get(channelId) ?? value;
                movingAvg = alpha * value + (1 - alpha) * movingAvg;
                
                // Detect outliers
                const isOutlier = Math.abs(value - movingAvg) > 
                                  this.filterConfig.outlierThreshold * Math.abs(movingAvg);
                
                // Apply filtering
                if (isOutlier && lastValue !== null) {
                    // Use last value for outliers
                    value = lastValue;
                } else if (this.filterConfig.noiseReduction) {
                    // Apply smoothing
                    value = movingAvg;
                }
                
                // Store values for next iteration
                this.filterState.lastValues.set(channelId, value);
                this.filterState.movingAverages.set(channelId, movingAvg);
            }
            
            // Limit maximum value to prevent extreme readings
            const MAX_VALUE = 1000;
            if (value !== null) {
                value = Math.max(-MAX_VALUE, Math.min(MAX_VALUE, value));
            }
            
            // Add data point to channel buffer
            if (value !== null) {
                // Create dataY array if it doesn't exist
                if (!channel.dataY) {
                    channel.dataY = [];
                }
                
                // Create dataX array if it doesn't exist
                if (!channel.dataX) {
                    channel.dataX = [];
                    channel.lastTimePoint = 0;
                }
                
                // Scale value by voltage scale
                const scaledValue = value * this.voltageScale;
                
                // Scale time by time scale
                const scaledTime = channel.lastTimePoint + timeStep * this.timeScale;
                channel.lastTimePoint = scaledTime;
                
                // Add scaled values to arrays
                channel.dataY.push(scaledValue);
                channel.dataX.push(scaledTime);
                
                // Limit number of points
                if (channel.dataY.length > this.dataBuffer[index + 1].maxPoints) {
                    channel.dataY.shift();
                    channel.dataX.shift();
                }
            }
        });
        
        // Update the plot
        this.updatePlot();
        
        // Update the cursor if active
        if (this.cursorType !== 'off') {
            this.updateCursor();
        }
    }
    
    // Enhanced filter for visible data with interpolation
    enhancedFilterVisibleData(data, timeWindow, currentTime) {
        if (data.x.length === 0) return { x: [], y: [] };
        
        const latestTime = data.x[data.x.length - 1];
        const oldestVisibleTime = Math.max(0, latestTime - timeWindow);
        
        // Find index of oldest visible data point
        let startIndex = 0;
        for (let i = data.x.length - 1; i >= 0; i--) {
            if (data.x[i] < oldestVisibleTime) {
                startIndex = i;
                break;
            }
        }
        
        // Extract visible portion of data with additional point for continuity
        if (startIndex > 0) startIndex--;
        
        // If we need more points for a nice display, use interpolation
        if (data.x.length - startIndex < 20 && data.x.length > 2) {
            // Perform linear interpolation to create smoother waveforms
            return this.interpolateData(data.x.slice(startIndex), data.y.slice(startIndex), 50);
        }
        
        return {
            x: data.x.slice(startIndex),
            y: data.y.slice(startIndex)
        };
    }
    
    // Linear interpolation for smoother waveforms
    interpolateData(xValues, yValues, targetPoints) {
        if (xValues.length < 2) return { x: xValues, y: yValues };
        
        const result = {
            x: [],
            y: []
        };
        
        const minX = xValues[0];
        const maxX = xValues[xValues.length - 1];
        const step = (maxX - minX) / (targetPoints - 1);
        
        for (let i = 0; i < targetPoints; i++) {
            const x = minX + i * step;
            
            // Find surrounding points for interpolation
            let j = 0;
            while (j < xValues.length - 1 && xValues[j + 1] < x) j++;
            
            // If exactly on a point or beyond range, use that point
            if (j >= xValues.length - 1 || x <= xValues[0]) {
                const yVal = j >= xValues.length - 1 ? yValues[yValues.length - 1] : yValues[0];
                result.x.push(x);
                result.y.push(yVal);
                continue;
            }
            
            // Perform linear interpolation between the two closest points
            const x0 = xValues[j];
            const x1 = xValues[j + 1];
            const y0 = yValues[j];
            const y1 = yValues[j + 1];
            
            // Linear interpolation formula: y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
            const interpolatedY = y0 + (x - x0) * (y1 - y0) / (x1 - x0);
            
            result.x.push(x);
            result.y.push(interpolatedY);
        }
        
        return result;
    }
    
    // Safe parsing of float values with NaN/undefined handling
    safeParseFloat(value, defaultValue = 0) {
        if (value === undefined || value === null || isNaN(value)) {
            return defaultValue;
        }
        return parseFloat(value);
    }
    
    // Calculate variance for signal analysis
    calculateVariance(values, mean) {
        if (values.length < 2) return 0;
        
        return values.reduce((sum, value) => {
            const diff = value - mean;
            return sum + (diff * diff);
        }, 0) / values.length;
    }
    
    // Method to update the readings display with current values
    updateReadingsDisplay() {
        if (!this.readingsDisplay) return;
        
        let readingsHTML = '<table style="border-collapse: collapse;">';
        
        // Add header
        readingsHTML += '<tr><th style="text-align: left; padding: 2px 5px;">Channel</th>' +
                       '<th style="text-align: right; padding: 2px 5px;">Value</th>' +
                       '<th style="text-align: left; padding: 2px 5px;">Unit</th>' +
                       '<th style="text-align: right; padding: 2px 5px;">Min</th>' +
                       '<th style="text-align: right; padding: 2px 5px;">Max</th>' +
                       '<th style="text-align: right; padding: 2px 5px;">Freq</th></tr>';
        
        // Add data for each channel
        this.channels.forEach((channel, channelId) => {
            if (!channel.visible) return;
            
            const lastValue = channel.dataY[channel.dataY.length - 1];
            const formattedValue = lastValue !== undefined ? lastValue.toFixed(3) : 'N/A';
            
            // Calculate min, max, and frequency if we have enough data
            let minValue = 'N/A';
            let maxValue = 'N/A';
            let frequency = 'N/A';
            
            if (channel.dataY.length > 10) {
                // Calculate min and max
                const values = channel.dataY.slice(-100); // Use last 100 points
                minValue = Math.min(...values).toFixed(3);
                maxValue = Math.max(...values).toFixed(3);
                
                // Try to calculate frequency using zero crossings
                frequency = this.calculateFrequency(channel.dataY, channel.dataX).toFixed(1);
            }
            
            // Determine the unit based on assignment
            const assignment = this.componentAssignments[channelId];
            let unit = 'V';
            
            if (assignment && assignment.type === 'wire') {
                unit = 'mA';
            } else if (assignment && assignment.type === 'component') {
                // Check component type for units
                const componentType = document.querySelector(`[data-component-id="${assignment.id}"]`)?.dataset?.component;
                if (componentType === 'current-source') {
                    unit = 'mA';
                }
            }
            
            const channelColor = channel.color || '#00ff00';
            
            readingsHTML += `<tr>
                <td style="text-align: left; padding: 2px 5px;">
                    <span style="color: ${channelColor};">■</span> CH${channelId}
                </td>
                <td style="text-align: right; padding: 2px 5px; font-weight: bold;">${formattedValue}</td>
                <td style="text-align: left; padding: 2px 5px;">${unit}</td>
                <td style="text-align: right; padding: 2px 5px;">${minValue}</td>
                <td style="text-align: right; padding: 2px 5px;">${maxValue}</td>
                <td style="text-align: right; padding: 2px 5px;">${frequency} Hz</td>
            </tr>`;
        });
        
        readingsHTML += '</table>';
        this.readingsDisplay.innerHTML = readingsHTML;
    }
    
    // Calculate frequency using improved zero crossings detection method with better noise handling
    calculateFrequency(dataY, dataX) {
        if (!dataY || !dataY.length) return 0;
        
        // Require at least 30 data points for accurate frequency calculation
        if (dataY.length < 30) return 0;
        
        // Calculate signal statistics
        const sum = dataY.reduce((a, b) => a + b, 0);
        const mean = sum / dataY.length;
        
        const squaredDiffs = dataY.map(value => Math.pow(value - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / dataY.length;
        const stdev = Math.sqrt(variance);
        
        const min = Math.min(...dataY);
        const max = Math.max(...dataY);
        const range = max - min;
        
        // Skip if signal range is too small (likely DC or noise)
        if (range < 0.01) return 0;
        
        // Calculate noise ratio (stdev/range)
        const noiseRatio = stdev / range;
        
        // Adaptive thresholding based on signal characteristics
        const threshold = mean;
        const hysteresis = stdev * (noiseRatio > 0.3 ? 0.5 : 0.2);
        
        const risingThreshold = threshold + hysteresis;
        const fallingThreshold = threshold - hysteresis;
        
        // Find rising zero crossings with hysteresis
        const crossings = [];
        let rising = false;
        
        for (let i = 1; i < dataY.length; i++) {
            // Rising edge detection with hysteresis
            if (!rising && dataY[i-1] < fallingThreshold && dataY[i] > fallingThreshold) {
                rising = true;
            } 
            // Crossing the rising threshold
            else if (rising && dataY[i-1] < risingThreshold && dataY[i] > risingThreshold) {
                crossings.push(dataX[i]);
                rising = false;
            }
        }
        
        // Calculate periods
        const periods = [];
        for (let i = 1; i < crossings.length; i++) {
            const period = crossings[i] - crossings[i-1];
            // Only include reasonable periods
            if (period > 0 && period < 10) {  // Max 10 seconds period
                periods.push(period);
            }
        }
        
        // Skip if no valid periods
        if (periods.length < 2) return 0;
        
        // Filter out outliers
        periods.sort((a, b) => a - b);
        const q1Index = Math.floor(periods.length * 0.25);
        const q3Index = Math.floor(periods.length * 0.75);
        const q1 = periods[q1Index];
        const q3 = periods[q3Index];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const filteredPeriods = periods.filter(period => period >= lowerBound && period <= upperBound);
        
        // Skip if not enough valid periods after filtering
        if (filteredPeriods.length < 2) return 0;
        
        // Calculate average period
        const avgPeriod = filteredPeriods.reduce((a, b) => a + b, 0) / filteredPeriods.length;
        
        // Calculate frequency
        const frequency = 1 / avgPeriod;
        
        // Round to 2 decimal places for display
        return Math.round(frequency * 100) / 100;
    }
    
    // Add this method after initializeDisplay
    addReadingsDisplay() {
        // Create readings display with oscilloscope styling
        this.readingsDisplay = document.createElement('div');
        this.readingsDisplay.className = 'oscilloscope-readings';
        this.readingsDisplay.style.position = 'absolute';
        this.readingsDisplay.style.bottom = '10px';
        this.readingsDisplay.style.right = '10px';
        this.readingsDisplay.style.backgroundColor = 'rgba(0, 10, 0, 0.7)';
        this.readingsDisplay.style.color = '#00ff00';
        this.readingsDisplay.style.padding = '5px';
        this.readingsDisplay.style.borderRadius = '3px';
        this.readingsDisplay.style.fontFamily = 'monospace';
        this.readingsDisplay.style.fontSize = '10px';
        this.readingsDisplay.style.zIndex = '100';
        this.readingsDisplay.style.maxWidth = '300px';
        this.readingsDisplay.style.maxHeight = '100px';
        this.readingsDisplay.style.overflow = 'auto';
        
        // Initial content
        this.readingsDisplay.innerHTML = `
            <table style="border-collapse: collapse;">
                <tr>
                    <th style="text-align: left; padding: 2px 5px;">Channel</th>
                    <th style="text-align: right; padding: 2px 5px;">Value</th>
                    <th style="text-align: left; padding: 2px 5px;">Unit</th>
                    <th style="text-align: right; padding: 2px 5px;">Min</th>
                    <th style="text-align: right; padding: 2px 5px;">Max</th>
                    <th style="text-align: right; padding: 2px 5px;">Freq</th>
                </tr>
                <tr>
                    <td style="text-align: left; padding: 2px 5px;">
                        <span style="color: #00ff00;">■</span> CH1
                    </td>
                    <td style="text-align: right; padding: 2px 5px; font-weight: bold;">0.000</td>
                    <td style="text-align: left; padding: 2px 5px;">V</td>
                    <td style="text-align: right; padding: 2px 5px;">0.000</td>
                    <td style="text-align: right; padding: 2px 5px;">0.000</td>
                    <td style="text-align: right; padding: 2px 5px;">0.0 Hz</td>
                </tr>
            </table>
        `;
        
        this.container.appendChild(this.readingsDisplay);
    }
    
    // Add a method to update settings
    updateSettings(newSettings) {
        if (!newSettings) return;
        
        // Update settings
        Object.assign(this.settings, newSettings);
        
        // Apply settings to oscilloscope behavior
        this.applySettings();
        
        console.log("Oscilloscope settings updated:", this.settings);
    }
    
    // Apply settings to oscilloscope behavior
    applySettings() {
        // Update data buffer size based on persistence
        this.dataBuffer[1].maxPoints = 100 + (this.settings.waveformPersistence * 100);
        this.dataBuffer[2].maxPoints = 100 + (this.settings.waveformPersistence * 100);
        this.dataBuffer[3].maxPoints = 100 + (this.settings.waveformPersistence * 100);
        this.dataBuffer[4].maxPoints = 100 + (this.settings.waveformPersistence * 100);
        
        // Update filtering parameters
        const filterLevel = this.settings.noiseFiltering / 10;
        this.filterConfig = {
            enabled: filterLevel > 0.1,
            alpha: 0.1 + (filterLevel * 0.8), // Exponential moving average factor
            outlierThreshold: 0.5 + (filterLevel * 0.5),
            adaptiveSampling: true,
            noiseReduction: filterLevel > 0.5
        };
        
        // Update sampling rate
        this.samplingInterval = Math.max(1, 11 - this.settings.samplingRate);
        
        // Update accuracyLevel-dependent settings
        switch(this.settings.accuracyLevel) {
            case 'low':
                this.dataBuffer[1].maxPoints = Math.min(this.dataBuffer[1].maxPoints, 300);
                this.dataBuffer[2].maxPoints = Math.min(this.dataBuffer[2].maxPoints, 300);
                this.dataBuffer[3].maxPoints = Math.min(this.dataBuffer[3].maxPoints, 300);
                this.dataBuffer[4].maxPoints = Math.min(this.dataBuffer[4].maxPoints, 300);
                this.filterConfig.alpha = Math.min(this.filterConfig.alpha, 0.5);
                break;
            case 'medium':
                // Default settings are fine
                break;
            case 'high':
                this.filterConfig.outlierThreshold = Math.max(this.filterConfig.outlierThreshold, 0.8);
                this.filterConfig.alpha = Math.max(this.filterConfig.alpha, 0.7);
                break;
            case 'ultra':
                this.filterConfig.outlierThreshold = Math.max(this.filterConfig.outlierThreshold, 0.95);
                this.filterConfig.alpha = Math.max(this.filterConfig.alpha, 0.9);
                this.dataBuffer[1].maxPoints = Math.max(this.dataBuffer[1].maxPoints, 800);
                this.dataBuffer[2].maxPoints = Math.max(this.dataBuffer[2].maxPoints, 800);
                this.dataBuffer[3].maxPoints = Math.max(this.dataBuffer[3].maxPoints, 800);
                this.dataBuffer[4].maxPoints = Math.max(this.dataBuffer[4].maxPoints, 800);
                break;
        }
        
        // Update plot layout
        if (this.plot) {
            const layout = { 
                title: 'Oscilloscope',
                xaxis: { title: 'Time (s)' },
                yaxis: { title: 'Voltage (V)' }
            };
            
            Plotly.relayout(this.plot, layout);
        }
    }

    // Update the updateData method to use improved filtering
    updateData(dataPoint) {
        // Skip NaN or invalid values
        if (typeof dataPoint !== 'number' || isNaN(dataPoint) || !isFinite(dataPoint)) {
            // Use previous valid value or 0
            dataPoint = this.dataBuffer.length > 0 ? this.dataBuffer[this.dataBuffer.length - 1] : 0;
        }
        
        // Apply aggressive filtering based on settings
        const filteredPoint = this.filterDataPoint(dataPoint);
        
        // Add point to buffer
        this.dataBuffer.push(filteredPoint);
        
        // Keep buffer size based on settings
        while (this.dataBuffer.length > this.bufferSize) {
            this.dataBuffer.shift();
        }
        
        // Update min/max values with decay factor to handle changes
        // in signal amplitude over time
        const decayFactor = 0.99;
        this.maxValue = Math.max(filteredPoint, this.maxValue * decayFactor);
        this.minValue = Math.min(filteredPoint, this.minValue * decayFactor);
        
        // Calculate average and normalize
        this.calculateAverage();
        
        // If time to update display
        if (this.canUpdateDisplay()) {
            this.updateDisplay();
            this.lastDisplayUpdateTime = Date.now();
        }
        
        // Update frequency if enough data points and settings allow
        if (this.dataBuffer.length > this.samplesForFrequency && this.settings.accuracyLevel !== 'low') {
            this.calculateFrequency();
        }
    }

    // Add a new method for improved filtering
    filterDataPoint(newPoint) {
        if (!this.dataBuffer || this.dataBuffer.length === 0) {
            return newPoint;
        }
        
        // Get previous filtered point
        const prevPoint = this.dataBuffer[this.dataBuffer.length - 1];
        
        // If the new value is very different from previous value
        // it might be an outlier - use different filtering approach
        const diff = Math.abs(newPoint - prevPoint);
        const threshold = (this.maxValue - this.minValue) * 0.15; // 15% of range
        
        // Adaptive filtering approach
        let filteredPoint;
        
        if (this.settings.noiseFiltering >= 80) {
            // Apply very strict filtering for high noise filtering
            // Use Kalman-inspired filtering approach
            
            // Get prediction error
            const error = newPoint - prevPoint;
            
            // Calculate Kalman gain (0.01 to 0.5 depending on noise setting)
            // Higher noise setting = lower Kalman gain = more filtering
            const kalmanGain = Math.max(0.01, 0.5 - (this.settings.noiseFiltering / 200));
            
            // Update estimate
            filteredPoint = prevPoint + kalmanGain * error;
            
        } else if (diff > threshold) {
            // If change is large, it might be an outlier
            // Use median of previous points and new point
            const recentPoints = [...this.dataBuffer.slice(-5), newPoint];
            recentPoints.sort((a, b) => a - b);
            const mid = Math.floor(recentPoints.length / 2);
            filteredPoint = recentPoints.length % 2 === 0 
                ? (recentPoints[mid - 1] + recentPoints[mid]) / 2 
                : recentPoints[mid];
        } else {
            // Normal case - exponential moving average
            // Adjust alpha based on noise filtering setting (0.1 to 0.8)
            const alpha = Math.max(0.1, 0.8 - (this.settings.noiseFiltering / 100));
            filteredPoint = alpha * newPoint + (1 - alpha) * prevPoint;
        }
        
        return filteredPoint;
    }

    // Update frequency calculation for better stability
    calculateFrequency() {
        // Don't recalculate too often
        const now = Date.now();
        if (now - this.lastFrequencyUpdate < 500) { // Only update every 500ms
            return;
        }
        this.lastFrequencyUpdate = now;
        
        // Use only recent data for frequency calculation
        const dataForAnalysis = this.dataBuffer.slice(-this.samplesForFrequency);
        
        // Find the average value to determine the center line
        const avg = dataForAnalysis.reduce((sum, val) => sum + val, 0) / dataForAnalysis.length;
        
        // Find zero crossings (from below to above only to count full cycles)
        const crossings = [];
        for (let i = 1; i < dataForAnalysis.length; i++) {
            if (dataForAnalysis[i-1] < avg && dataForAnalysis[i] >= avg) {
                crossings.push(i);
            }
        }
        
        // If less than 2 crossings, can't calculate frequency
        if (crossings.length < 2) {
            // Keep previous frequency or set to 0
            if (!this.frequency) this.frequency = 0;
            return;
        }
        
        // Calculate periods (distances between crossings)
        const periods = [];
        for (let i = 1; i < crossings.length; i++) {
            periods.push(crossings[i] - crossings[i-1]);
        }
        
        // Remove outliers - periods that are too different from the median
        if (periods.length > 3) {
            periods.sort((a, b) => a - b);
            const medianPeriod = periods[Math.floor(periods.length / 2)];
            const filteredPeriods = periods.filter(period => 
                Math.abs(period - medianPeriod) / medianPeriod < 0.3); // Within 30% of median
            
            if (filteredPeriods.length > 1) {
                // Use filtered periods
                const avgPeriod = filteredPeriods.reduce((sum, val) => sum + val, 0) / filteredPeriods.length;
                const newFreq = this.sampleRate / avgPeriod;
                
                // Smooth frequency updates to prevent jumps
                const alpha = 0.3; // Low pass filter factor
                this.frequency = this.frequency 
                    ? alpha * newFreq + (1 - alpha) * this.frequency 
                    : newFreq;
            }
        } else if (periods.length > 0) {
            // Not enough data for outlier removal
            const avgPeriod = periods.reduce((sum, val) => sum + val, 0) / periods.length;
            const newFreq = this.sampleRate / avgPeriod;
            
            // Smooth frequency updates
            const alpha = 0.3;
            this.frequency = this.frequency 
                ? alpha * newFreq + (1 - alpha) * this.frequency 
                : newFreq;
        }
        
        // Ensure we have a numeric value
        if (typeof this.frequency !== 'number' || isNaN(this.frequency)) {
            this.frequency = 0;
        }
        
        // Round to 2 decimal places for display
        this.frequency = Math.round(this.frequency * 100) / 100;
    }
} 