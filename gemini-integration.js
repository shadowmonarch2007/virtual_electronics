/**
 * Gemini AI Integration for Circuit Generation
 */
class GeminiIntegration {
    constructor(apiKey = null) {
        // Get API key from parameters, URL, localStorage or use default
        let customApiKey = apiKey;
        
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('gen_key')) {
            customApiKey = urlParams.get('gen_key');
            // Save to localStorage for future use
            localStorage.setItem('circuit_generator_api_key', customApiKey);
        } 
        // If not in URL, check localStorage
        else if (localStorage.getItem('circuit_generator_api_key')) {
            customApiKey = localStorage.getItem('circuit_generator_api_key');
        }
        
        this.apiKey = customApiKey || 'AIzaSyDT8SUS934YQe871ZamWhLSbz4uERxRDS0'; // Default key
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.circuitBoard = null;
    }

    initialize(circuitBoard) {
        this.circuitBoard = circuitBoard;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const generateButton = document.getElementById('generate-circuit');
        const inputField = document.getElementById('circuit-description-input');

        generateButton.addEventListener('click', () => {
            const description = inputField.value.trim();
            if (description) {
                this.generateCircuitFromDescription(description);
            } else {
                alert('Please enter a circuit description first.');
            }
        });

        // Also trigger generation on Enter key
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const description = inputField.value.trim();
                if (description) {
                    this.generateCircuitFromDescription(description);
                }
            }
        });
    }

    async generateCircuitFromDescription(description) {
        if (!description || description.trim() === '') {
            this.showErrorMessage('Please enter a circuit description first.');
            return;
        }

        this.showLoadingIndicator();
        
        try {
            // Format the prompt for Gemini
            const prompt = this.createPrompt(description);
            
            // Call Gemini API
            const circuitData = await this.callGeminiAPI(prompt);
            
            // Validate the circuit data
            if (!circuitData) {
                throw new Error('No valid component names were found in your description. Please mention specific components like resistor, capacitor, LED, etc.');
            }
            
            if (!circuitData.components || !Array.isArray(circuitData.components) || circuitData.components.length === 0) {
                throw new Error('No components found in the circuit data');
            }
            
            // Check if all components have valid types
            const validTypes = ['voltage_source', 'current_source', 'resistor', 'capacitor', 'inductor', 
                                'diode', 'LED', 'transistor', 'ground'];
            
            const invalidComponents = circuitData.components.filter(comp => 
                !validTypes.includes(comp.type)
            );
            
            if (invalidComponents.length > 0) {
                console.warn('Invalid component types:', invalidComponents.map(c => c.type));
            }
            
            // Log the components that will be created
            console.log('Creating circuit with these components:');
            circuitData.components.forEach(comp => {
                console.log(`- ${comp.type}${comp.value ? ` (${comp.value})` : ''}`);
            });
            
            // Create the circuit
            this.createCircuitFromData(circuitData);
            
            // Show success message with component count
            const componentNames = circuitData.components
                .filter(comp => comp.type !== 'ground') // Exclude ground from the count for user feedback
                .map(comp => this.formatComponentName(comp.type))
                .join(', ');
                
            const componentCount = circuitData.components.length;
            const connectionCount = circuitData.connections ? circuitData.connections.length : 0;
            
            this.showSuccessMessage(`Created circuit with ${componentNames}.`);
            
            console.log('Circuit created with', componentCount, 'components and', connectionCount, 'connections');
        } catch (error) {
            console.error('Error generating circuit:', error);
            this.showErrorMessage(`Failed to generate circuit: ${error.message}. Please try again with a different description.`);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    createPrompt(description) {
        return `
You are a circuit design assistant. Convert the following circuit description into a JSON representation.

DESCRIPTION: ${description}

OUTPUT RULES:
1. Return ONLY a JSON object with no other text
2. The JSON should have two main arrays: "components" and "connections"
3. For components, include:
   - "type": One of [voltage_source, current_source, resistor, capacitor, inductor, diode, LED, transistor, ground]
   - "value": The component value with unit (null if not applicable)
   - "position": [x, y] coordinates starting from [50, 50] and spaced appropriately
4. For connections, include:
   - "from": The source component index (0-based)
   - "to": The target component index (0-based)
5. IMPORTANT: Only include components that are EXPLICITLY mentioned in the user's description
6. Do not add any additional components that weren't specifically mentioned (except ground when needed for circuit completion)
7. Ensure the circuit is properly connected

Example output:
{
  "components": [
    {"type": "voltage_source", "value": "10V", "position": [50, 50]},
    {"type": "resistor", "value": "1kΩ", "position": [150, 50]},
    {"type": "LED", "value": null, "position": [250, 50]}
  ],
  "connections": [
    {"from": 0, "to": 1},
    {"from": 1, "to": 2},
    {"from": 2, "to": 0}
  ]
}

Now, please convert my circuit description into a JSON representation following these rules, INCLUDING ONLY the components mentioned in the description.
`;
    }

    async callGeminiAPI(prompt) {
        // If using a mock for development/testing
        if (this.apiKey === 'YOUR_GEMINI_API_KEY' || this.apiKey === 'AIzaSyDT8SUS934YQe871ZamWhLSbz4uERxRDS0') {
            console.warn('Using mock API response. Replace with your actual Gemini API key for production.');
            // Extract description from prompt
            const descriptionMatch = prompt.match(/DESCRIPTION: (.*?)(?:\n|$)/);
            const description = descriptionMatch ? descriptionMatch[1] : '';
            return this.getMockResponse(description);
        }

        // Actual API call
        const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract JSON from the response
        let jsonResponse;
        try {
            const textResponse = data.candidates[0].content.parts[0].text;
            // Extract JSON object from text if it contains extra content
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonResponse = JSON.parse(jsonMatch[0]);
            } else {
                jsonResponse = JSON.parse(textResponse);
            }
        } catch (error) {
            console.error('Failed to parse JSON from API response:', error);
            throw new Error('Invalid response from Gemini API');
        }

        return jsonResponse;
    }

    getMockResponse(description = '') {
        // Use the description to create a more relevant mock response
        const lowerDesc = description.toLowerCase();
        
        // First, determine which components are explicitly mentioned
        const components = [];
        
        // Parse component mentions
        if (lowerDesc.includes('voltage source') || lowerDesc.includes('battery') || lowerDesc.includes('volt')) {
            // Extract battery voltage if specified
            let batteryVoltage = '5V';
            const voltageMatch = lowerDesc.match(/(\d+)\s*v/i);
            if (voltageMatch) {
                batteryVoltage = voltageMatch[1] + 'V';
            }
            components.push({"type": "voltage_source", "value": batteryVoltage, "position": [100, 150]});
        }
        
        if (lowerDesc.includes('current source')) {
            let currentValue = '0.1A';
            const currentMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:a|amp)/i);
            if (currentMatch) {
                currentValue = currentMatch[1] + 'A';
            }
            components.push({"type": "current_source", "value": currentValue, "position": [100, 200]});
        }
        
        if (lowerDesc.includes('resistor')) {
            let resistorValue = '1kΩ';
            const resistorKMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:k|kohm|kΩ)/i);
            if (resistorKMatch) {
                resistorValue = resistorKMatch[1] + 'kΩ';
            } else {
                const ohmMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:ohm|Ω)/i);
                if (ohmMatch) {
                    resistorValue = ohmMatch[1] + 'Ω';
                }
            }
            components.push({"type": "resistor", "value": resistorValue, "position": [250, 150]});
        }
        
        if (lowerDesc.includes('capacitor')) {
            let capacitorValue = '100μF';
            const capacitorMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:μ|u|μf|uf)/i);
            if (capacitorMatch) {
                capacitorValue = capacitorMatch[1] + 'μF';
            } else {
                const nanoMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:n|nf)/i);
                if (nanoMatch) {
                    capacitorValue = nanoMatch[1] + 'nF';
                }
            }
            components.push({"type": "capacitor", "value": capacitorValue, "position": [250, 200]});
        }
        
        if (lowerDesc.includes('inductor')) {
            let inductorValue = '10mH';
            const inductorMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:m|mh)/i);
            if (inductorMatch) {
                inductorValue = inductorMatch[1] + 'mH';
            }
            components.push({"type": "inductor", "value": inductorValue, "position": [400, 150]});
        }
        
        if (lowerDesc.includes('diode') && !lowerDesc.includes('led')) {
            components.push({"type": "diode", "value": null, "position": [400, 200]});
        }
        
        if (lowerDesc.includes('led')) {
            components.push({"type": "LED", "value": null, "position": [400, 250]});
        }
        
        if (lowerDesc.includes('transistor')) {
            components.push({"type": "transistor", "value": null, "position": [550, 150]});
        }
        
        // Check if no valid components were found
        if (components.length === 0) {
            // Return null to indicate no valid component was mentioned
            return null;
        }
        
        // Always add a ground if there's at least one other component
        // Ground is necessary for circuit completion
        if (components.length > 0) {
            components.push({"type": "ground", "value": null, "position": [100, 300]});
        }
        
        // Generate connections based on component types
        // This is a simplified connection algorithm
        const connections = [];
        
        // Start with the power source (voltage or current) if available
        const powerSourceIndex = components.findIndex(c => c.type === "voltage_source" || c.type === "current_source");
        const groundIndex = components.findIndex(c => c.type === "ground");
        
        if (powerSourceIndex >= 0 && components.length > 1) {
            // Find components other than the power source and ground
            const otherComponents = components
                .map((c, index) => ({ ...c, index }))
                .filter(c => c.index !== powerSourceIndex && c.index !== groundIndex);
            
            if (otherComponents.length > 0) {
                // Connect power source to the first component
                connections.push({"from": powerSourceIndex, "to": otherComponents[0].index});
                
                // Connect components in series
                for (let i = 0; i < otherComponents.length - 1; i++) {
                    connections.push({"from": otherComponents[i].index, "to": otherComponents[i + 1].index});
                }
                
                // Connect the last component to ground
                if (groundIndex >= 0) {
                    connections.push({"from": otherComponents[otherComponents.length - 1].index, "to": groundIndex});
                    
                    // Complete the circuit
                    connections.push({"from": groundIndex, "to": powerSourceIndex});
                } else {
                    // If no ground, connect the last component back to the power source
                    connections.push({"from": otherComponents[otherComponents.length - 1].index, "to": powerSourceIndex});
                }
            } else if (groundIndex >= 0) {
                // If only power source and ground
                connections.push({"from": powerSourceIndex, "to": groundIndex});
                connections.push({"from": groundIndex, "to": powerSourceIndex});
            }
        }
        
        return {
            "components": components,
            "connections": connections
        };
    }

    createCircuitFromData(circuitData) {
        // Clear the canvas first
        this.circuitBoard.clearCanvas();
        
        // Map component types from API to our application
        const componentTypeMap = {
            'voltage_source': 'voltage-source',
            'current_source': 'current-source',
            'resistor': 'resistor',
            'capacitor': 'capacitor',
            'inductor': 'inductor',
            'diode': 'diode',
            'LED': 'diode', // Map LED to diode with different properties
            'transistor': 'transistor',
            'ground': 'ground'
        };

        // Create components
        const componentReferences = [];
        circuitData.components.forEach(component => {
            const componentType = componentTypeMap[component.type] || component.type;
            const [x, y] = component.position;
            
            // Extract component properties from the value
            let customProperties = null;
            if (component.value) {
                    const valueMatch = component.value.match(/([0-9.]+)([a-zA-Z]+)?/);
                    if (valueMatch) {
                    const value = parseFloat(valueMatch[1]);
                    const unit = valueMatch[2] || '';
                    
                    // Create appropriate property object based on component type
                    if (componentType === 'voltage-source') {
                        customProperties = {
                            voltage: { value: value, unit: unit || 'V' }
                        };
                    }
                    else if (componentType === 'current-source') {
                        customProperties = {
                            current: { value: value, unit: unit || 'A' }
                        };
                    }
                    else if (componentType === 'resistor') {
                        customProperties = {
                            resistance: { value: value, unit: unit || 'Ω' }
                        };
                    }
                    else if (componentType === 'capacitor') {
                        customProperties = {
                            capacitance: { value: value, unit: unit || 'µF' }
                        };
                    }
                    else if (componentType === 'inductor') {
                        customProperties = {
                            inductance: { value: value, unit: unit || 'mH' }
                        };
                    }
                    else if (componentType === 'diode') {
                        customProperties = {
                            forward_voltage: { value: value, unit: unit || 'V' }
                        };
                    }
                }
            }
            
            // Special case for LED
            if (component.type === 'LED') {
                customProperties = customProperties || {};
                customProperties.forward_voltage = { value: 2.0, unit: 'V' };
                customProperties.subtype = 'LED';
                customProperties.color = 'red';
            }
            
            // Add component to board with the custom properties
            const circuitComponent = this.circuitBoard.addComponent(componentType, {x, y}, customProperties);
            
            // Ensure component is draggable
            if (circuitComponent && circuitComponent.draggable !== undefined) {
                circuitComponent.draggable = true;
            }
            
            componentReferences.push(circuitComponent);
        });
        
        console.log("Components created:", componentReferences.length);
        
        // Use a longer delay to ensure components are fully initialized before creating wires
        setTimeout(() => {
            // Create connections between components
            if (circuitData.connections && circuitData.connections.length > 0) {
                console.log("Attempting to create", circuitData.connections.length, "connections");
                
                // Create all wires directly
                const createdWires = [];
                
                circuitData.connections.forEach(connection => {
                    const fromComponent = componentReferences[connection.from];
                    const toComponent = componentReferences[connection.to];
                    
                    if (!fromComponent || !toComponent) {
                        console.warn("Invalid component reference in connection");
                        return;
                    }
                    
                    console.log(`Connecting ${fromComponent.type} to ${toComponent.type}`);
                    
                    // Get connection nodes
                    let fromNodes = this.getComponentNodes(fromComponent);
                    let toNodes = this.getComponentNodes(toComponent);
                    
                    if (!fromNodes.length || !toNodes.length) {
                        console.warn("No connection points found for components");
                        return;
                    }
                    
                    // Find appropriate connection points based on component types
                    let fromNode, toNode;
                    
                    // Select appropriate nodes based on component types
                    if (fromComponent.type === 'voltage-source') {
                        fromNode = fromNodes.find(n => n.type === 'positive') || fromNodes[0];
                    } else if (fromComponent.type === 'ground') {
                        fromNode = fromNodes.find(n => n.type === 'terminal') || fromNodes[0];
                    } else if (fromComponent.type === 'diode') {
                        fromNode = fromNodes.find(n => n.type === 'output') || fromNodes[1];
                    } else {
                        // For most components, the second node is usually the output
                        fromNode = fromNodes.find(n => n.type === 'output') || 
                                  (fromNodes.length > 1 ? fromNodes[1] : fromNodes[0]);
                    }
                    
                    if (toComponent.type === 'voltage-source') {
                        toNode = toNodes.find(n => n.type === 'negative') || toNodes[1];
                    } else if (toComponent.type === 'ground') {
                        toNode = toNodes.find(n => n.type === 'terminal') || toNodes[0];
                    } else if (toComponent.type === 'diode') {
                        toNode = toNodes.find(n => n.type === 'input') || toNodes[0];
                    } else {
                        // For most components, the first node is usually the input
                        toNode = toNodes.find(n => n.type === 'input') || toNodes[0];
                    }
                    
                    if (fromNode && toNode) {
                        // Create wire directly
                        try {
                            console.log("Creating wire:", fromNode, "to", toNode);
                            
                            // Method 1: Add wire directly to the wires array
                            this.circuitBoard.wires.push({
                                start: { ...fromNode },
                                end: { ...toNode }
                            });
                            
                            createdWires.push({
                                from: fromComponent.type,
                                to: toComponent.type
                            });
                        } catch (error) {
                            console.error("Error creating wire:", error);
                        }
                    } else {
                        console.warn("Could not identify connection points between components");
                    }
                });
                
                console.log("Created wires:", createdWires.length);
            }
            
            // Force a render to update the canvas
            this.circuitBoard.render();
        }, 1000); // Use a longer timeout to ensure everything is initialized
    }
    
    // Helper method to get component nodes
    getComponentNodes(component) {
        if (!component) return [];
        
        // Try different ways to get nodes
        if (typeof component.getNodes === 'function') {
            return component.getNodes();
        } else if (component.nodes) {
            return component.nodes;
        } else if (component.connectionPoints) {
            return component.connectionPoints;
        }
        return [];
    }

    showLoadingIndicator() {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <i class="fas fa-spinner"></i>
            <span>Generating circuit...</span>
        `;
        loadingIndicator.id = 'loading-indicator';
        document.body.appendChild(loadingIndicator);
    }

    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    showErrorMessage(message) {
        // Create a modal for the error message
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        const messageBox = document.createElement('div');
        messageBox.style.backgroundColor = 'white';
        messageBox.style.padding = '20px';
        messageBox.style.borderRadius = '8px';
        messageBox.style.maxWidth = '400px';
        messageBox.style.textAlign = 'center';
        
        messageBox.innerHTML = `
            <p>${message}</p>
            <button id="ok-button" style="
                background-color: var(--primary-color); 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                margin-top: 10px;
                cursor: pointer;">OK</button>
        `;
        
        modal.appendChild(messageBox);
        document.body.appendChild(modal);
        
        document.getElementById('ok-button').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    // Helper function to format component names for user display
    formatComponentName(type) {
        const names = {
            'voltage_source': 'voltage source',
            'current_source': 'current source',
            'resistor': 'resistor',
            'capacitor': 'capacitor',
            'inductor': 'inductor',
            'diode': 'diode',
            'LED': 'LED',
            'transistor': 'transistor',
            'ground': 'ground'
        };
        return names[type] || type;
    }
    
    showSuccessMessage(message) {
        // Create a success notification that auto-dismisses
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = 'var(--success-color)';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        notification.style.zIndex = '1000';
        notification.style.transition = 'opacity 0.3s ease-out';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // The circuit board is initialized in circuit-board.js
    // We'll wait for that to complete before setting up the Gemini integration
    const checkInterval = setInterval(() => {
        if (window.circuitBoard) {
            const geminiIntegration = new GeminiIntegration();
            geminiIntegration.initialize(window.circuitBoard);
            clearInterval(checkInterval);
        }
    }, 100);
}); 