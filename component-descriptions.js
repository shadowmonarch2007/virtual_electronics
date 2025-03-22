/**
 * Component descriptions for tooltips
 * This file contains descriptions for each component type used in the circuit simulator
 */

// Component Descriptions for Virtual Labs
// Contains detailed descriptions of electronic components and circuits

const componentDescriptions = {
    resistor: {
        name: "Resistor",
        symbol: "R",
        unit: "Ohms (Ω)",
        description: "A resistor is a passive two-terminal electrical component that implements electrical resistance as a circuit element. Resistors act to reduce current flow, and at the same time, act to lower voltage levels within circuits.",
        formula: "V = I × R (Ohm's Law)",
        behavior: "Resistors dissipate electrical energy as heat. The power dissipated by a resistor is given by P = I²R or P = V²/R.",
        examples: "Current limiting, voltage division, biasing active components, timing circuits",
        types: ["Fixed", "Variable (potentiometer, rheostat)", "Thermistor", "Light Dependent Resistor (LDR)"]
    },
    capacitor: {
        name: "Capacitor",
        symbol: "C",
        unit: "Farads (F)",
        description: "A capacitor is a passive two-terminal electronic component that stores electrical energy in an electric field. A capacitor consists of two conductors separated by a dielectric material.",
        formula: "Q = C × V, I = C × dV/dt",
        behavior: "Capacitors block DC current but allow AC current to pass. They can store and release energy, and their impedance decreases with frequency.",
        examples: "Filtering, coupling/decoupling, timing, energy storage, power conditioning",
        types: ["Ceramic", "Electrolytic", "Tantalum", "Film", "Mica", "Variable"]
    },
    inductor: {
        name: "Inductor",
        symbol: "L",
        unit: "Henries (H)",
        description: "An inductor is a passive two-terminal electrical component that stores energy in a magnetic field when electric current flows through it. An inductor typically consists of an insulated wire wound into a coil.",
        formula: "V = L × dI/dt",
        behavior: "Inductors resist changes in current. They allow DC to pass but block high-frequency AC. Their impedance increases with frequency.",
        examples: "Filters, chokes, energy storage, transformers, oscillators",
        types: ["Air core", "Iron core", "Ferrite core", "Toroidal", "Coupled inductors"]
    },
    diode: {
        name: "Diode",
        symbol: "D",
        unit: "N/A",
        description: "A diode is a semiconductor device that essentially acts as a one-way switch for current. It allows current to flow in one direction (forward biased) but blocks it in the opposite direction (reverse biased).",
        formula: "I = Is(e^(V/VT) - 1) (Shockley diode equation)",
        behavior: "Conducts when forward biased (anode positive relative to cathode), blocks when reverse biased. Has a forward voltage drop (typically 0.7V for silicon).",
        examples: "Rectification, signal demodulation, voltage regulation, logic gates, protection circuits",
        types: ["Standard", "Zener", "Light Emitting Diode (LED)", "Photodiode", "Schottky", "Varactor"]
    },
    transistor: {
        name: "Transistor",
        symbol: "Q",
        unit: "N/A",
        description: "A transistor is a semiconductor device used to amplify or switch electronic signals. It is a fundamental building block of modern electronic devices.",
        formula: "For BJT: Ic = β × Ib, For FET: Id = k(Vgs - Vth)²",
        behavior: "Can operate as an amplifier or switch. Controls current flow through one channel by applying voltage or current to another.",
        examples: "Amplification, switching, oscillation, logic gates, memory cells",
        types: ["Bipolar Junction Transistor (BJT)", "Field Effect Transistor (FET)", "MOSFET", "JFET", "Darlington"]
    },
    voltageSource: {
        name: "Voltage Source",
        symbol: "V",
        unit: "Volts (V)",
        description: "A voltage source is an electrical component that provides a constant potential difference (voltage) between its terminals, regardless of the current drawn from it.",
        formula: "V = constant",
        behavior: "Maintains a fixed voltage regardless of the load current (ideal voltage source). Real voltage sources have internal resistance.",
        examples: "Batteries, power supplies, generators, solar cells",
        types: ["DC", "AC", "Independent", "Dependent", "Controlled"]
    },
    currentSource: {
        name: "Current Source",
        symbol: "I",
        unit: "Amperes (A)",
        description: "A current source is an electrical component that provides a constant current, regardless of the voltage across its terminals.",
        formula: "I = constant",
        behavior: "Maintains a fixed current regardless of the load resistance (ideal current source). Real current sources have internal conductance.",
        examples: "Transistor current mirrors, certain power supplies, charging circuits",
        types: ["DC", "AC", "Independent", "Dependent", "Controlled"]
    },
    ground: {
        name: "Ground",
        symbol: "GND",
        unit: "N/A",
        description: "Ground refers to a reference point in an electrical circuit from which voltages are measured. It is often connected to the earth, but not always.",
        formula: "V = 0 (by definition at the ground node)",
        behavior: "Provides a common reference point. In circuit analysis, ground is usually assigned a voltage of zero.",
        examples: "Signal reference, safety grounding, common return path",
        types: ["Earth ground", "Chassis ground", "Digital ground", "Analog ground", "Floating ground"]
    },
    opamp: {
        name: "Operational Amplifier (Op-Amp)",
        symbol: "U",
        unit: "N/A",
        description: "An operational amplifier (op-amp) is a high-gain electronic voltage amplifier with a differential input and, usually, a single-ended output. Op-amps are among the most widely used electronic devices today, being used in a vast array of consumer, industrial, and scientific devices. An ideal op-amp has infinite open-loop gain, infinite input impedance, and zero output impedance.",
        formula: "Vout = A × (V+ - V-), where A is the open-loop gain",
        behavior: "High gain, differential input voltage amplification",
        examples: [
            "Amplifiers (inverting, non-inverting)",
            "Filters (active)",
            "Comparators",
            "Integrators and differentiators",
            "Oscillators"
        ],
        types: [
            "General Purpose Op-Amps",
            "Precision Op-Amps",
            "High-Speed Op-Amps",
            "Low-Noise Op-Amps",
            "Power Op-Amps"
        ]
    },
    transformer: {
        name: "Transformer",
        symbol: "T",
        unit: "N/A",
        description: "A transformer is a passive electrical device that transfers electrical energy from one circuit to another through electromagnetic induction. A varying current in the primary winding creates a varying magnetic flux in the transformer's core, which induces a varying electromotive force (EMF) across the secondary winding. Transformers are used to increase or decrease AC voltages in electric power applications.",
        formula: "Vs/Vp = Ns/Np (turns ratio)",
        behavior: "Power transfer between circuits with voltage and current transformation",
        examples: [
            "Power distribution transformers",
            "Isolation transformers for safety",
            "Voltage adaptation in power supplies",
            "Impedance matching in audio circuits"
        ],
        types: [
            "Power Transformers",
            "Audio Transformers",
            "RF Transformers",
            "Isolation Transformers",
            "Autotransformers"
        ]
    },
    fuse: {
        name: "Fuse",
        symbol: "F",
        unit: "A (amperes)",
        description: "A fuse is a safety device that operates to provide overcurrent protection of an electrical circuit. Its essential component is a metal wire or strip that melts when too much current flows through it, thereby stopping or interrupting the current. It is a sacrificial device; once a fuse has operated it is an open circuit, and it must be replaced or reset.",
        formula: "I > Irated (fuse blows)",
        behavior: "Normal operation until current exceeds rating, then open circuit",
        examples: [
            "Circuit protection in homes",
            "Device internal protection",
            "Automotive electrical systems",
            "Industrial equipment protection"
        ],
        types: [
            "Fast-Blow Fuses",
            "Slow-Blow Fuses",
            "Resettable Fuses (PTC)",
            "Cartridge Fuses",
            "Surface Mount Fuses"
        ]
    },
    crystal: {
        name: "Crystal Oscillator",
        symbol: "Y",
        unit: "Hz (hertz)",
        description: "A crystal oscillator is an electronic oscillator circuit that uses the mechanical resonance of a vibrating crystal of piezoelectric material to create an electrical signal with a precise frequency. This frequency is commonly used to keep track of time, to provide a stable clock signal for digital integrated circuits, and to stabilize frequencies for radio transmitters and receivers.",
        formula: "f = 1 / (2π × √(LC))",
        behavior: "Extremely stable frequency generation",
        examples: [
            "Clock generation in computers",
            "Frequency reference in radio equipment",
            "Timekeeping in watches",
            "Microcontroller timing"
        ],
        types: [
            "Quartz Crystals",
            "Ceramic Resonators",
            "Temperature Compensated Crystal Oscillators (TCXO)",
            "Voltage Controlled Crystal Oscillators (VCXO)",
            "Oven Controlled Crystal Oscillators (OCXO)"
        ]
    },
    relay: {
        name: "Relay",
        symbol: "K",
        unit: "N/A",
        description: "A relay is an electrically operated switch. It consists of a set of input terminals for a single or multiple control signals, and a set of operating contact terminals. The switch may have any number of contacts in multiple contact forms, such as make contacts, break contacts, or combinations thereof. Relays are used where it is necessary to control a circuit by an independent low-power signal, or where several circuits must be controlled by one signal.",
        formula: "N/A",
        behavior: "Electromagnetically activated mechanical switch",
        examples: [
            "Industrial control systems",
            "Automotive applications",
            "Home appliances",
            "Power distribution"
        ],
        types: [
            "Electromechanical Relays",
            "Reed Relays",
            "Solid State Relays",
            "Latching Relays",
            "Time Delay Relays"
        ]
    }
};

// RC Circuit Description
const rcCircuitDescription = {
    name: "RC Circuit",
    description: "An RC circuit is an electrical circuit composed of a resistor (R) and a capacitor (C) driven by a voltage or current source. It is one of the simplest analog electronic filters.",
    operation: "When voltage is applied to an RC circuit, the capacitor begins to charge exponentially. When the voltage source is removed, the capacitor discharges exponentially through the resistor.",
    timeConstant: "The time constant τ = RC determines how quickly the capacitor charges or discharges. After one time constant, the capacitor charges to about 63% of the final value.",
    applications: [
        "Timing circuits", 
        "Filters (high-pass, low-pass)", 
        "Coupling and decoupling", 
        "Oscillators", 
        "Power supply smoothing"
    ],
    formulas: {
        charging: "V(t) = V₀(1 - e^(-t/RC))",
        discharging: "V(t) = V₀e^(-t/RC)",
        timeConstant: "τ = RC",
        cutoffFrequency: "f = 1/(2πRC)"
    }
};

// Export the descriptions if needed for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { componentDescriptions, rcCircuitDescription };
} 