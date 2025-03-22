import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, RadioButtons, Button
from matplotlib.animation import FuncAnimation

class InteractiveRCCircuit:
    def __init__(self):
        # Default circuit parameters
        self.resistance = 1000.0  # ohms
        self.capacitance = 10.0e-6  # farads
        self.voltage = 5.0  # volts
        self.mode = 'charging'
        
        # Calculate time constant
        self.tau = self.resistance * self.capacitance
        
        # Set simulation parameters
        self.sim_time = self.tau * 5  # Show 5 time constants by default
        self.num_points = 1000
        
        # Animation parameters
        self.animation = None
        self.anim_speed = 1.0  # Animation speed factor
        self.anim_running = False
        self.t_current = 0
        
        # Setup the figure and plot
        self.setup_figure()
        
    def setup_figure(self):
        """Set up the interactive figure with sliders and buttons"""
        # Create the figure and axes
        self.fig = plt.figure(figsize=(12, 8))
        
        # Set up the grid for the main plot, control panel, and circuit diagram
        gs = self.fig.add_gridspec(3, 2, height_ratios=[1, 1, 0.5])
        
        # Create subplot axes
        self.voltage_ax = self.fig.add_subplot(gs[0, 0])
        self.current_ax = self.fig.add_subplot(gs[1, 0])
        self.circuit_ax = self.fig.add_subplot(gs[:2, 1])  # Circuit diagram on the right
        self.control_ax = self.fig.add_subplot(gs[2, :])   # Controls on the bottom
        
        # Set axis labels for voltage and current plots
        self.voltage_ax.set_ylabel('Voltage (V)')
        self.voltage_ax.set_title('Capacitor Voltage')
        self.voltage_ax.grid(True)
        
        self.current_ax.set_xlabel('Time (ms)')
        self.current_ax.set_ylabel('Current (mA)')
        self.current_ax.set_title('Circuit Current')
        self.current_ax.grid(True)
        
        # Draw the circuit diagram
        self.draw_circuit_diagram()
        
        # Create the control widgets
        self.create_widgets()
        
        # Initialize the plots
        self.voltage_line, = self.voltage_ax.plot([], [], 'b-', lw=2)
        self.current_line, = self.current_ax.plot([], [], 'r-', lw=2)
        self.time_marker_voltage, = self.voltage_ax.plot([], [], 'ko', markersize=6)
        self.time_marker_current, = self.current_ax.plot([], [], 'ko', markersize=6)
        
        # Set initial plot limits
        self.update_plot_limits()
        
        # Adjust layout
        plt.tight_layout()
    
    def draw_circuit_diagram(self):
        """Draw the RC circuit diagram"""
        self.circuit_ax.clear()
        self.circuit_ax.set_xlim(0, 10)
        self.circuit_ax.set_ylim(0, 10)
        self.circuit_ax.axis('off')
        self.circuit_ax.set_title('RC Circuit Diagram')
        
        # Draw the circuit components
        # Battery
        self.circuit_ax.add_patch(plt.Rectangle((1, 4), 0.5, 2, fill=False, lw=2))
        self.circuit_ax.plot([0.7, 1.8], [5, 5], 'k-', lw=2)
        self.circuit_ax.text(1.25, 3.5, f"{self.voltage}V", ha='center')
        
        # Wires
        self.circuit_ax.plot([1.5, 1.5], [6, 8], 'k-', lw=2)  # Vertical wire from battery
        self.circuit_ax.plot([1.5, 4], [8, 8], 'k-', lw=2)    # Top horizontal wire
        self.circuit_ax.plot([1.5, 1.5], [2, 4], 'k-', lw=2)  # Vertical wire from battery
        self.circuit_ax.plot([1.5, 8], [2, 2], 'k-', lw=2)    # Bottom horizontal wire
        
        # Resistor (zigzag)
        x = np.linspace(4, 6, 9)
        y = 8 + 0.5 * np.array([0, 1, -1, 1, -1, 1, -1, 1, 0])
        self.circuit_ax.plot(x, y, 'k-', lw=2)
        self.circuit_ax.text(5, 9, f"{self.resistance}Ω", ha='center')
        
        # Wire from resistor to capacitor
        self.circuit_ax.plot([6, 8], [8, 8], 'k-', lw=2)
        
        # Capacitor
        self.circuit_ax.plot([8, 8], [7, 9], 'k-', lw=2)  # Left plate
        self.circuit_ax.plot([8.5, 8.5], [7, 9], 'k-', lw=2)  # Right plate
        self.circuit_ax.text(8.25, 6.5, f"{self.capacitance*1e6}μF", ha='center')
        
        # Complete the circuit
        self.circuit_ax.plot([8.5, 8.5], [2, 7], 'k-', lw=2)  # Vertical wire from capacitor
        
        # Add switch
        switch_x = 3
        switch_y = 2
        if self.mode == 'charging':
            # Closed switch
            self.circuit_ax.plot([switch_x-1, switch_x+1], [switch_y, switch_y], 'k-', lw=2)
        else:
            # Open switch
            self.circuit_ax.plot([switch_x-1, switch_x], [switch_y, switch_y], 'k-', lw=2)
            self.circuit_ax.plot([switch_x, switch_x+0.7], [switch_y, switch_y+0.7], 'k-', lw=2)
        
        # Draw current flow indicators (arrows) if in charging mode
        if self.mode == 'charging' and self.anim_running:
            # Add arrow along the top wire
            self.circuit_ax.arrow(3, 8, 0.5, 0, head_width=0.2, head_length=0.3, fc='blue', ec='blue')
            # Add arrow along the right vertical wire (capacitor)
            self.circuit_ax.arrow(8.5, 5, 0, -0.5, head_width=0.2, head_length=0.3, fc='blue', ec='blue')
        elif self.mode == 'discharging' and self.anim_running:
            # Add arrow for discharge current (flowing in the opposite direction)
            self.circuit_ax.arrow(3, 2, 0.5, 0, head_width=0.2, head_length=0.3, fc='red', ec='red')
        
        # Update the circuit diagram with the current capacitor voltage
        if hasattr(self, 't_current'):
            if self.mode == 'charging':
                v_cap = self.charging_voltage(self.t_current)
            else:
                v_cap = self.discharging_voltage(self.t_current)
            
            self.circuit_ax.text(8.25, 10, f"Vcap = {v_cap:.2f}V", ha='center', 
                                bbox=dict(facecolor='white', alpha=0.7))
    
    def create_widgets(self):
        """Create the interactive widgets (sliders, buttons, etc)"""
        # Adjust the control axis position
        self.fig.subplots_adjust(bottom=0.25)
        
        # Create axes for the sliders
        resistance_ax = plt.axes([0.15, 0.15, 0.65, 0.03])
        capacitance_ax = plt.axes([0.15, 0.10, 0.65, 0.03])
        voltage_ax = plt.axes([0.15, 0.05, 0.65, 0.03])
        
        # Create sliders
        self.resistance_slider = Slider(
            resistance_ax, 'Resistance (Ω)', 100, 10000, 
            valinit=self.resistance, valfmt='%0.0f'
        )
        
        self.capacitance_slider = Slider(
            capacitance_ax, 'Capacitance (μF)', 1, 100, 
            valinit=self.capacitance * 1e6, valfmt='%0.0f'
        )
        
        self.voltage_slider = Slider(
            voltage_ax, 'Voltage (V)', 1, 12, 
            valinit=self.voltage, valfmt='%0.1f'
        )
        
        # Create axes for the radio buttons (mode selector)
        mode_ax = plt.axes([0.85, 0.05, 0.12, 0.15])
        self.mode_radio = RadioButtons(
            mode_ax, ('Charging', 'Discharging'), active=0
        )
        
        # Create button axes
        start_ax = plt.axes([0.15, 0.20, 0.12, 0.04])
        reset_ax = plt.axes([0.35, 0.20, 0.12, 0.04])
        
        # Create buttons
        self.start_button = Button(start_ax, 'Start/Pause')
        self.reset_button = Button(reset_ax, 'Reset')
        
        # Connect events
        self.resistance_slider.on_changed(self.update_params)
        self.capacitance_slider.on_changed(self.update_params)
        self.voltage_slider.on_changed(self.update_params)
        self.mode_radio.on_clicked(self.update_mode)
        self.start_button.on_clicked(self.toggle_animation)
        self.reset_button.on_clicked(self.reset)
    
    def update_params(self, val):
        """Update the circuit parameters when sliders change"""
        self.resistance = self.resistance_slider.val
        self.capacitance = self.capacitance_slider.val * 1e-6  # Convert μF to F
        self.voltage = self.voltage_slider.val
        
        # Recalculate time constant
        self.tau = self.resistance * self.capacitance
        
        # Update the simulation time based on the new time constant
        self.sim_time = self.tau * 5
        if self.mode == 'both':
            self.sim_time = self.tau * 10
        
        # Update the plot limits
        self.update_plot_limits()
        
        # Redraw the circuit diagram
        self.draw_circuit_diagram()
        
        # Restart animation if it was running
        if self.anim_running and self.animation is not None:
            self.animation.event_source.stop()
            self.start_animation()
    
    def update_mode(self, label):
        """Update the circuit mode when radio buttons change"""
        if label == 'Charging':
            self.mode = 'charging'
        else:
            self.mode = 'discharging'
        
        # Reset time to zero
        self.t_current = 0
        
        # Update the plot limits
        self.update_plot_limits()
        
        # Redraw the circuit diagram
        self.draw_circuit_diagram()
        
        # Restart animation if it was running
        if self.anim_running and self.animation is not None:
            self.animation.event_source.stop()
            self.start_animation()
    
    def toggle_animation(self, event):
        """Start or pause the animation"""
        if self.anim_running:
            # Pause the animation
            self.anim_running = False
            if self.animation is not None:
                self.animation.event_source.stop()
        else:
            # Start the animation
            self.anim_running = True
            self.start_animation()
    
    def reset(self, event):
        """Reset the simulation to initial state"""
        # Reset time to zero
        self.t_current = 0
        
        # Stop animation if running
        if self.animation is not None:
            self.animation.event_source.stop()
            self.anim_running = False
        
        # Update plots with the initial state
        self.update_plot(0)
        
        # Redraw the circuit diagram
        self.draw_circuit_diagram()
    
    def start_animation(self):
        """Start the animation"""
        # Set up time array for animation
        t_max = self.sim_time
        t_values = np.linspace(0, t_max, self.num_points)
        
        # Initialize data
        if self.mode == 'charging':
            v_values = self.charging_voltage(t_values)
            i_values = self.charging_current(t_values)
        else:  # discharging
            v_values = self.discharging_voltage(t_values)
            i_values = self.discharging_current(t_values)
        
        # Set data for plots
        self.voltage_line.set_data(t_values * 1000, v_values)  # Convert to ms
        self.current_line.set_data(t_values * 1000, i_values * 1000)  # Convert to ms and mA
        
        # Create the animation
        self.animation = FuncAnimation(
            self.fig, self.animate_func, frames=self.num_points,
            interval=50 / self.anim_speed, blit=False, repeat=False
        )
    
    def animate_func(self, frame):
        """Animation function that updates the time marker"""
        # Calculate the current time based on the frame
        t_max = self.sim_time
        t = frame * t_max / self.num_points
        self.t_current = t
        
        # Update the plot
        self.update_plot(t)
        
        # Redraw the circuit diagram to update the voltage display
        self.draw_circuit_diagram()
        
        return self.voltage_line, self.current_line, self.time_marker_voltage, self.time_marker_current
    
    def update_plot(self, t):
        """Update the plot markers for the current time"""
        # Calculate voltage and current at current time
        if self.mode == 'charging':
            v = self.charging_voltage(t)
            i = self.charging_current(t)
        else:  # discharging
            v = self.discharging_voltage(t)
            i = self.discharging_current(t)
        
        # Update time markers
        self.time_marker_voltage.set_data([t * 1000], [v])
        self.time_marker_current.set_data([t * 1000], [i * 1000])  # Convert to mA
    
    def update_plot_limits(self):
        """Update the axis limits for the plots"""
        # Calculate time array
        t_max = self.sim_time
        t_values = np.linspace(0, t_max, self.num_points)
        
        # Calculate voltage and current values
        if self.mode == 'charging':
            v_values = self.charging_voltage(t_values)
            i_values = self.charging_current(t_values)
        else:  # discharging
            v_values = self.discharging_voltage(t_values)
            i_values = self.discharging_current(t_values)
        
        # Set limits for voltage plot
        self.voltage_ax.set_xlim(0, t_max * 1000)  # Convert to ms
        max_voltage = self.voltage * 1.1  # Add 10% margin
        self.voltage_ax.set_ylim(-0.1, max_voltage)
        
        # Add reference line for source voltage
        if hasattr(self, 'v_ref_line'):
            self.v_ref_line.remove()
        self.v_ref_line = self.voltage_ax.axhline(y=self.voltage, color='g', 
                                         linestyle='--', alpha=0.7)
        
        # Set limits for current plot
        self.current_ax.set_xlim(0, t_max * 1000)  # Convert to ms
        max_current = np.max(np.abs(i_values)) * 1000 * 1.1  # Convert to mA and add margin
        self.current_ax.set_ylim(-max_current, max_current)
        
        # Mark the time constant on the plots
        tau_ms = self.tau * 1000
        
        # Clear any existing tau markers
        if hasattr(self, 'tau_markers'):
            for marker in self.tau_markers:
                if marker:
                    marker.remove()
        
        self.tau_markers = []
        
        if tau_ms < t_max * 1000:
            if self.mode == 'charging':
                v_tau = self.voltage * (1 - np.exp(-1))  # ~63.2% of full voltage
                i_tau = self.charging_current(self.tau) * 1000  # in mA
            else:  # discharging
                v_tau = self.voltage * np.exp(-1)  # ~36.8% of initial voltage
                i_tau = self.discharging_current(self.tau) * 1000  # in mA
            
            # Add tau marker to voltage plot
            tau_marker_v = self.voltage_ax.plot(tau_ms, v_tau, 'ro', markersize=6)[0]
            self.tau_markers.append(tau_marker_v)
            
            # Add tau marker to current plot
            tau_marker_i = self.current_ax.plot(tau_ms, i_tau, 'ro', markersize=6)[0]
            self.tau_markers.append(tau_marker_i)
            
            # Add annotation for tau
            tau_text = self.voltage_ax.annotate(
                f'τ = {tau_ms:.2f} ms', xy=(tau_ms, v_tau),
                xytext=(tau_ms + 5, v_tau + 0.2),
                arrowprops=dict(facecolor='black', shrink=0.05, width=1)
            )
            self.tau_markers.append(tau_text)
        
        # Add circuit information text
        if hasattr(self, 'info_text'):
            self.info_text.remove()
        
        info_str = (
            f"RC Circuit Parameters:\n"
            f"R = {self.resistance:.0f} Ω\n"
            f"C = {self.capacitance * 1e6:.1f} μF\n"
            f"V = {self.voltage:.1f} V\n"
            f"τ = RC = {self.tau * 1000:.2f} ms\n\n"
            f"After 1τ: {100 * (1 - np.exp(-1)):.1f}% charged\n"
            f"After 5τ: {100 * (1 - np.exp(-5)):.1f}% charged"
        )
        
        self.info_text = self.fig.text(0.85, 0.3, info_str, fontsize=10,
                              bbox=dict(facecolor='white', alpha=0.8))
        
        # Draw the static plot
        if self.mode == 'charging':
            self.voltage_line.set_data(t_values * 1000, v_values)
            self.current_line.set_data(t_values * 1000, i_values * 1000)  # Convert to mA
        else:  # discharging
            self.voltage_line.set_data(t_values * 1000, v_values)
            self.current_line.set_data(t_values * 1000, i_values * 1000)  # Convert to mA
    
    def charging_voltage(self, t):
        """Calculate capacitor voltage during charging at time t"""
        return self.voltage * (1 - np.exp(-t / self.tau))
    
    def discharging_voltage(self, t):
        """Calculate capacitor voltage during discharging at time t"""
        return self.voltage * np.exp(-t / self.tau)
    
    def charging_current(self, t):
        """Calculate current during charging at time t"""
        return (self.voltage / self.resistance) * np.exp(-t / self.tau)
    
    def discharging_current(self, t):
        """Calculate current during discharging at time t"""
        return -(self.voltage / self.resistance) * np.exp(-t / self.tau)
    
    def show(self):
        """Display the interactive plot"""
        plt.show()

if __name__ == "__main__":
    print("RC Circuit Interactive Simulator")
    print("--------------------------------")
    print("Instructions:")
    print("1. Use the sliders to adjust the circuit parameters")
    print("2. Choose between charging and discharging modes")
    print("3. Click 'Start/Pause' to run or pause the simulation")
    print("4. Click 'Reset' to reset the simulation to time = 0")
    print("\nNote: The interactive plot window will appear shortly.")
    
    circuit = InteractiveRCCircuit()
    circuit.show() 