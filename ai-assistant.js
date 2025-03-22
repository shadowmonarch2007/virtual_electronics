class CircuitAIAssistant {
    constructor(apiKey = null) {
        this.container = null;
        this.isMinimized = false;
        this.messages = [];
        
        // Initialize with null API key - will be set manually later
        this.apiKey = null;
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.componentInfo = {
            resistor: {
                title: 'Resistor',
                description: 'A resistor limits the flow of electric current in a circuit.',
                usage: 'Used for current limiting, voltage division, and heat generation.',
                properties: {
                    resistance: {
                        unit: 'Ω',
                        typical: ['1kΩ', '10kΩ', '100kΩ'],
                        description: 'Higher resistance = more current limitation'
                    }
                },
                examples: [
                    'Current limiting for LEDs',
                    'Voltage divider circuits',
                    'Pull-up/pull-down resistors'
                ]
            },
            capacitor: {
                title: 'Capacitor',
                description: 'A capacitor stores electrical energy in an electric field.',
                usage: 'Used for filtering, timing, and energy storage.',
                properties: {
                    capacitance: {
                        unit: 'F',
                        typical: ['1µF', '10µF', '100µF'],
                        description: 'Higher capacitance = more charge storage'
                    }
                },
                examples: [
                    'Power supply filtering',
                    'Timing circuits',
                    'Coupling/decoupling'
                ]
            },
            inductor: {
                title: 'Inductor',
                description: 'An inductor stores energy in a magnetic field.',
                usage: 'Used in filters, voltage regulation, and energy storage.',
                properties: {
                    inductance: {
                        unit: 'H',
                        typical: ['1mH', '10mH', '100mH'],
                        description: 'Higher inductance = stronger magnetic field'
                    }
                },
                examples: [
                    'Power supply smoothing',
                    'RF filters',
                    'Voltage regulators'
                ]
            },
            ground: {
                title: 'Ground',
                description: 'Ground provides a reference point of zero voltage (0V) in a circuit.',
                usage: 'Used as a voltage reference point and to complete the circuit path.',
                properties: {
                    voltage: {
                        unit: 'V',
                        typical: ['0V'],
                        description: 'Ground is always at 0V potential'
                    }
                },
                examples: [
                    'Reference point for voltage measurements',
                    'Return path for current flow',
                    'Common point in power supplies',
                    'Safety connection to earth in real circuits'
                ]
            }
        };

        this.createInterface();
        this.setupEventListeners();
    }

    createInterface() {
        // Create assistant container
        this.container = document.createElement('div');
        this.container.className = 'ai-assistant';
        this.container.id = 'circuit-ai-assistant'; // Add a unique ID
        
        // Create header
        const header = document.createElement('div');
        header.className = 'assistant-header';
        header.innerHTML = `
            <div class="header-title">
                <i class="fas fa-robot"></i>
                <span>Circuit Assistant</span>
            </div>
            <div class="header-controls">
                <button class="minimize-btn">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Create API key input area
        const apiKeyArea = document.createElement('div');
        apiKeyArea.className = 'api-key-area';
        apiKeyArea.innerHTML = `
            <div class="api-key-input">
                <input type="password" id="assistant-api-key-input" placeholder="Enter Gemini API Key">
                <button class="save-key-btn">
                    <i class="fas fa-check"></i>
                </button>
            </div>
            <div class="api-key-status">
                <span class="status-text">API Key not set</span>
            </div>
        `;

        // Create messages container
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'messages';

        // Create input area
        const inputArea = document.createElement('div');
        inputArea.className = 'input-area';
        inputArea.innerHTML = `
            <input type="text" placeholder="Ask about circuits or components..." disabled>
            <button class="send-btn" disabled>
                <i class="fas fa-paper-plane"></i>
            </button>
        `;

        // Create suggestions
        const suggestions = document.createElement('div');
        suggestions.className = 'suggestions';
        suggestions.innerHTML = `
            <div class="suggestion-chip" data-query="How do I create a voltage divider?">
                Voltage divider circuit
            </div>
            <div class="suggestion-chip" data-query="What is the purpose of a capacitor?">
                About capacitors
            </div>
            <div class="suggestion-chip" data-query="How to measure current?">
                Measuring current
            </div>
        `;

        // Assemble interface
        this.container.appendChild(header);
        this.container.appendChild(apiKeyArea);
        this.container.appendChild(messagesContainer);
        this.container.appendChild(suggestions);
        this.container.appendChild(inputArea);

        // Add to document
        document.body.appendChild(this.container);
        
        // Add welcome message
        this.addMessage(`Welcome to Circuit Assistant! Please enter your Gemini API key to start chatting.`);
    }

    setupEventListeners() {
        // Minimize button
        this.container.querySelector('.minimize-btn').addEventListener('click', () => {
            this.toggleMinimize();
        });

        // Close button
        this.container.querySelector('.close-btn').addEventListener('click', () => {
            this.hide();
        });

        // API Key save button
        this.container.querySelector('.save-key-btn').addEventListener('click', () => {
            this.saveApiKey();
        });

        // API Key input enter key
        this.container.querySelector('#assistant-api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });

        // Send button
        this.container.querySelector('.send-btn').addEventListener('click', () => {
            const input = this.container.querySelector('.input-area input');
            if (!input.disabled) {
                this.handleQuery(input.value);
                input.value = '';
            }
        });

        // Input enter key
        this.container.querySelector('.input-area input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.target.disabled) {
                this.handleQuery(e.target.value);
                e.target.value = '';
            }
        });

        // Suggestion chips
        this.container.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (this.apiKey) {
                    this.handleQuery(chip.dataset.query);
                } else {
                    this.addMessage('Please set your API key first to use the assistant.', true);
                }
            });
        });

        // Make draggable
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        this.container.querySelector('.assistant-header').addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === this.container.querySelector('.assistant-header') || 
                e.target.closest('.assistant-header')) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                this.container.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    saveApiKey() {
        const apiKeyInput = this.container.querySelector('#assistant-api-key-input');
        const apiKey = apiKeyInput.value.trim();
        const statusText = this.container.querySelector('.api-key-status .status-text');
        
        if (!apiKey) {
            // Show error if API key is empty
            statusText.textContent = 'Please enter a valid API key';
            statusText.style.color = 'var(--error-color)';
            return;
        }
        
        // Check if the API key has a valid format (typically starts with 'AIza')
        if (!apiKey.startsWith('AIza')) {
            statusText.textContent = 'Invalid API key format. Gemini keys typically start with "AIza"';
            statusText.style.color = 'var(--error-color)';
            
            // Add a helpful message about obtaining API keys
            this.addMessage(`
To get a valid Gemini API key:
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key or use an existing one
4. Copy and paste the key here
            `, false);
            return;
        }
        
        // Update status to show we're validating
        statusText.textContent = 'Validating API key...';
        statusText.style.color = 'var(--text-secondary)';
        
        // Test the API key with a simple request
        this.validateApiKey(apiKey).then(isValid => {
            if (isValid) {
                // Save the valid API key
                this.apiKey = apiKey;
                
                // Update status and enable chat
                statusText.textContent = 'API Key set successfully';
                statusText.style.color = 'var(--success-color)';
                
                // Enable chat input
                const chatInput = this.container.querySelector('.input-area input');
                chatInput.disabled = false;
                
                // Enable send button
                const sendButton = this.container.querySelector('.send-btn');
                sendButton.disabled = false;
                
                // Add confirmation message
                this.addMessage('API Key set successfully! You can now chat with the Circuit Assistant.', false);
                
                // Clear the API key input for security
                apiKeyInput.value = '';
            } else {
                // Show error for invalid API key
                statusText.textContent = 'Invalid API key. Please check and try again.';
                statusText.style.color = 'var(--error-color)';
                
                // Add a helpful message about obtaining API keys
                this.addMessage(`
Your API key was rejected by Google's servers. Please check that:
1. You've copied the entire key correctly
2. Your key has access to the Gemini API
3. You haven't reached your quota limit
                `, false);
            }
        }).catch(error => {
            // Show error if validation fails
            console.error('API key validation error:', error);
            statusText.textContent = 'Could not validate API key. Check console for details.';
            statusText.style.color = 'var(--error-color)';
        });
    }

    async validateApiKey(apiKey) {
        try {
            // Simple test prompt to validate the API key
            const testPrompt = "Respond with 'valid' if you can see this message.";
            
            const response = await fetch(`${this.apiEndpoint}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: testPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 10,
                    }
                })
            });
            
            // If we get a successful response, the API key is valid
            return response.ok;
        } catch (error) {
            console.error('API key validation error:', error);
            return false;
        }
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.container.classList.toggle('minimized');
    }

    show() {
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }

    addMessage(message, isUser = false) {
        // Ensure we're adding messages to our specific container
        const messagesContainer = this.container.querySelector('.messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageElement.innerHTML = `
            <div class="message-content">
                ${isUser ? `<i class="fas fa-user"></i>` : `<i class="fas fa-robot"></i>`}
                <div class="message-text">${message}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add to message history
        this.messages.push({ text: message, isUser });
    }

    async handleQuery(query) {
        if (!query || query.trim() === '') return;
        
        if (!this.apiKey) {
            this.addMessage('Please set your API key first to use the assistant.', false);
            return;
        }
        
        // Add user message to chat
        this.addMessage(query, true);
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message assistant-message typing-indicator-container';
        typingIndicator.innerHTML = `
            <div class="message-content">
                <i class="fas fa-robot"></i>
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        this.container.querySelector('.messages').appendChild(typingIndicator);
        this.container.querySelector('.messages').scrollTop = this.container.querySelector('.messages').scrollHeight;
        
        try {
            let response;
            if (query.startsWith('/component ')) {
                // Handle component info command
                const componentName = query.replace('/component ', '').trim().toLowerCase();
                if (this.componentInfo[componentName]) {
                    response = this.showComponentInfo(componentName);
                } else {
                    response = `Sorry, I don't have information about the component "${componentName}".`;
                }
            } else {
                // Try to get AI response
                try {
                    response = await this.getGeminiResponse(query);
                } catch (apiError) {
                    console.error('API error, falling back to local response:', apiError);
                    // If API fails, use fallback response
                    response = this.handleFallbackResponse(query);
                    // Add note about the fallback
                    response += '\n\n<small><i>Note: This response was generated locally as the API call failed. Please check your API key.</i></small>';
                }
            }
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add assistant message
            this.addMessage(response, false);
        } catch (error) {
            console.error('Error handling query:', error);
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add error message with suggestion
            this.addMessage(`Sorry, I encountered an error: ${error.message}. 
            
You can still try:
1. Using the /component command (e.g., "/component resistor")
2. Asking basic circuit questions like "What is Ohm's law?"
3. Checking your API key if responses aren't working`, false);
        }
    }

    async getGeminiResponse(query) {
        try {
            const contextPrompt = `
You are a Circuit Assistant AI helping a user with circuit design concepts and explaining electronics.
Only answer questions related to electronics, circuits, electrical engineering, and the components in the virtual lab.
If asked about unrelated topics, politely redirect to electronics topics.

Current question: ${query}
`;

            const response = await this.callGeminiAPI(contextPrompt);
            return response || this.handleFallbackResponse(query);
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw new Error('Failed to get response from the AI service');
        }
    }

    async callGeminiAPI(prompt) {
        try {
            console.log('Calling Gemini API with key:', this.apiKey ? 'Key exists (hidden)' : 'No key');
            
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
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1000,
                    }
                })
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error details:', errorData);
                throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('API response received', data);
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No response received from the AI service');
            }
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error in API call:', error);
            throw error;
        }
    }

    handleFallbackResponse(query) {
        // Simple fallback responses for common questions
        const normalizedQuery = query.toLowerCase();
        
        if (normalizedQuery.includes('resistor')) {
            return this.showComponentInfo('resistor');
        } else if (normalizedQuery.includes('capacitor')) {
            return this.showComponentInfo('capacitor');
        } else if (normalizedQuery.includes('inductor')) {
            return this.showComponentInfo('inductor');
        } else if (normalizedQuery.includes('ground')) {
            return this.showComponentInfo('ground');
        } else if (normalizedQuery.includes('voltage divider')) {
            return `
A voltage divider is a circuit that uses resistors in series to create a lower voltage from a higher voltage source.

The output voltage (Vout) can be calculated as:
Vout = Vin × (R2 / (R1 + R2))

Where:
- Vin is the input voltage
- R1 is the first resistor (connected to Vin)
- R2 is the second resistor (connected to ground)

To create a voltage divider in this lab:
1. Add a voltage source
2. Connect two resistors in series
3. The output voltage is measured across the second resistor
`;
        } else if (normalizedQuery.includes('ohm') && normalizedQuery.includes('law')) {
            return `
Ohm's Law states that the current through a conductor is directly proportional to the voltage and inversely proportional to the resistance.

The formula is: V = I × R

Where:
- V is the voltage in volts (V)
- I is the current in amperes (A)
- R is the resistance in ohms (Ω)

You can rearrange this formula to find any of the values:
- I = V / R (current equals voltage divided by resistance)
- R = V / I (resistance equals voltage divided by current)
`;
        } else if (normalizedQuery.includes('circuit') && normalizedQuery.includes('series')) {
            return `
In a series circuit, components are connected end-to-end, creating a single path for current flow.

Key characteristics of series circuits:
- The current is the same through all components
- Voltage is divided across components (proportional to their resistance)
- Total resistance = sum of all individual resistances (Rtotal = R1 + R2 + R3 + ...)
- Power supplies add up if they're also in series

To create a series circuit in this lab:
1. Add components (like resistors, LEDs, etc.)
2. Connect them end-to-end in a single chain
3. Add a power source and ground to complete the circuit
`;
        } else if (normalizedQuery.includes('circuit') && normalizedQuery.includes('parallel')) {
            return `
In a parallel circuit, components are connected across common points, creating multiple paths for current.

Key characteristics of parallel circuits:
- Voltage is the same across all components
- Current divides through the different paths (inversely proportional to resistance)
- Total resistance is less than the smallest individual resistance
- The formula for total resistance: 1/Rtotal = 1/R1 + 1/R2 + 1/R3 + ...
- Power supplies with the same voltage will reinforce each other

To create a parallel circuit in this lab:
1. Add components (like resistors, LEDs, etc.)
2. Connect them in parallel (same start points and same end points)
3. Add a power source and ground
`;
        } else {
            return this.getDefaultResponse();
        }
    }

    getDefaultResponse() {
        return `I'm your Circuit Assistant! I can help with circuit design, explain electronic components, or answer questions about electrical engineering concepts. Try asking me about resistors, capacitors, Ohm's law, or how to design specific circuits.`;
    }

    showComponentInfo(component) {
        const info = this.componentInfo[component];
        if (!info) return `Sorry, I don't have information about this component yet.`;
        
        let responseHTML = `
<div class="component-info">
    <h4>${info.title}</h4>
    <p>${info.description}</p>
    <h5>Common Uses:</h5>
    <p>${info.usage}</p>
`;
        
        // Add properties if available
        if (info.properties) {
            responseHTML += `<h5>Properties:</h5><ul>`;
            for (const [propName, propInfo] of Object.entries(info.properties)) {
                responseHTML += `
                <li>
                    <strong>${propName} (${propInfo.unit}):</strong> ${propInfo.description}<br>
                    Typical values: ${propInfo.typical.join(', ')}
                </li>`;
            }
            responseHTML += `</ul>`;
        }
        
        // Add examples if available
        if (info.examples) {
            responseHTML += `<h5>Example Applications:</h5><ul>`;
            for (const example of info.examples) {
                responseHTML += `<li>${example}</li>`;
            }
            responseHTML += `</ul>`;
        }
        
        responseHTML += `</div>`;
        return responseHTML;
    }

    // Add circuit feedback capability
    provideCircuitFeedback(circuit) {
        // This method is called when components are added to the circuit
        if (!circuit || !circuit.components) return;
        
        // Get component count
        const componentCount = circuit.components.length;
        
        // Only provide feedback when we have at least 2 components
        if (componentCount >= 2) {
            // Check what types of components are present
            const componentTypes = circuit.components.map(c => c.type);
            const hasVoltageSource = componentTypes.includes('voltage-source');
            const hasGround = componentTypes.includes('ground');
            const hasResistor = componentTypes.includes('resistor');
            
            // Provide feedback based on circuit composition
            if (hasVoltageSource && !hasGround) {
                this.addMessage("Don't forget to add a ground to complete your circuit!");
            } else if (hasVoltageSource && hasResistor && componentCount >= 3) {
                this.addMessage("You're building a great circuit! You can simulate it using the Start Simulation button.");
            }
        }
    }
}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.circuitAssistant = new CircuitAIAssistant();
}); 