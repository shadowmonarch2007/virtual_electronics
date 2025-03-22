import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint

class RCCircuit:
    def __init__(self, resistance=1000, capacitance=1e-6, voltage=5):
        """
        Initialize RC circuit with given parameters
        
        Parameters:
            resistance: Resistance in ohms (default: 1000 Ω)
            capacitance: Capacitance in farads (default: 1e-6 F = 1 μF)
            voltage: Source voltage in volts (default: 5 V)
        """
        self.R = resistance
        self.C = capacitance
        self.V = voltage
        self.tau = self.R * self.C  # Time constant (seconds)
    
    def charging_voltage(self, t):
        """Calculate capacitor voltage during charging at time t"""
        return self.V * (1 - np.exp(-t / self.tau))
    
    def discharging_voltage(self, t):
        """Calculate capacitor voltage during discharging at time t"""
        return self.V * np.exp(-t / self.tau)
    
    def charging_current(self, t):
        """Calculate current during charging at time t"""
        return (self.V / self.R) * np.exp(-t / self.tau)
    
    def discharging_current(self, t):
        """Calculate current during discharging at time t"""
        return -(self.V / self.R) * np.exp(-t / self.tau)
    
    def simulate(self, total_time=0.1, num_points=1000, mode='charging'):
        """
        Simulate the RC circuit
        
        Parameters:
            total_time: Total simulation time in seconds
            num_points: Number of simulation points
            mode: 'charging', 'discharging', or 'both'
        
        Returns:
            t_values: Array of time values
            v_values: Array of voltage values
            i_values: Array of current values
        """
        t_values = np.linspace(0, total_time, num_points)
        v_values = np.zeros_like(t_values)
        i_values = np.zeros_like(t_values)
        
        if mode == 'charging':
            v_values = self.charging_voltage(t_values)
            i_values = self.charging_current(t_values)
        elif mode == 'discharging':
            v_values = self.discharging_voltage(t_values)
            i_values = self.discharging_current(t_values)
        elif mode == 'both':
            # For 'both', we'll split the time in half
            half_point = len(t_values) // 2
            charging_time = t_values[:half_point]
            discharging_time = t_values[half_point:] - t_values[half_point]
            
            # Charging phase
            v_values[:half_point] = self.charging_voltage(charging_time)
            i_values[:half_point] = self.charging_current(charging_time)
            
            # Discharging phase (starting from the charged voltage)
            v_values[half_point:] = self.V * np.exp(-discharging_time / self.tau)
            i_values[half_point:] = -self.V / self.R * np.exp(-discharging_time / self.tau)
        
        return t_values, v_values, i_values

    def plot_simulation(self, total_time=0.1, num_points=1000, mode='charging'):
        """
        Plot the voltage and current curves for the RC circuit
        
        Parameters:
            total_time: Total simulation time in seconds
            num_points: Number of simulation points
            mode: 'charging', 'discharging', or 'both'
        """
        t, v, i = self.simulate(total_time, num_points, mode)
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
        
        # Plot voltage
        ax1.plot(t * 1000, v, 'b-', linewidth=2)
        ax1.set_title('RC Circuit Simulation')
        ax1.set_ylabel('Voltage (V)')
        ax1.grid(True)
        
        # Mark time constant
        if mode != 'both':
            tau_ms = self.tau * 1000
            if tau_ms < total_time * 1000:
                if mode == 'charging':
                    v_tau = self.V * (1 - np.exp(-1))  # ~63.2% of full voltage
                else:  # discharging
                    v_tau = self.V * np.exp(-1)  # ~36.8% of initial voltage
                
                ax1.plot(tau_ms, v_tau, 'ro', markersize=8)
                ax1.annotate(f'τ = {tau_ms:.2f} ms', 
                             xy=(tau_ms, v_tau), 
                             xytext=(tau_ms + 2, v_tau + 0.2),
                             arrowprops=dict(facecolor='black', shrink=0.05, width=1.5))
        
        # Plot current
        ax2.plot(t * 1000, i * 1000, 'r-', linewidth=2)  # Convert to mA
        ax2.set_xlabel('Time (ms)')
        ax2.set_ylabel('Current (mA)')
        ax2.grid(True)
        
        # Add horizontal line at V/R for charging or 0 for discharging
        if mode == 'charging':
            ax1.axhline(y=self.V, color='g', linestyle='--', alpha=0.7)
            ax1.text(total_time * 500, self.V * 1.02, f'Vs = {self.V} V', color='g')
        
        plt.tight_layout()
        
        # Add circuit information
        info_text = (
            f"RC Circuit Parameters:\n"
            f"R = {self.R} Ω\n"
            f"C = {self.C * 1e6} μF\n"
            f"V = {self.V} V\n"
            f"τ = RC = {self.tau * 1000:.2f} ms"
        )
        
        plt.figtext(0.02, 0.02, info_text, fontsize=10, 
                   bbox=dict(facecolor='white', alpha=0.8))
        
        plt.show()
        
        return fig

def main():
    print("RC Circuit Simulator")
    print("--------------------")
    
    # Default parameters
    resistance = 1000.0  # 1 kΩ
    capacitance = 10.0e-6  # 10 μF
    voltage = 5.0  # 5V
    
    try:
        # Ask for user inputs with defaults
        user_r = input(f"Enter resistance in ohms (default: {resistance} Ω): ")
        user_c = input(f"Enter capacitance in microfarads (default: {capacitance * 1e6} μF): ")
        user_v = input(f"Enter voltage in volts (default: {voltage} V): ")
        
        # Update values if provided
        if user_r.strip():
            resistance = float(user_r)
        if user_c.strip():
            capacitance = float(user_c) * 1e-6  # Convert to farads
        if user_v.strip():
            voltage = float(user_v)
        
        # Create circuit
        circuit = RCCircuit(resistance, capacitance, voltage)
        
        # Calculate time constant and related values
        tau = circuit.tau
        print(f"\nTime Constant (τ = RC): {tau * 1000:.2f} ms")
        print(f"After one time constant ({tau * 1000:.2f} ms):")
        print(f"- During charging: The capacitor reaches 63.2% of full voltage ({voltage * 0.632:.2f} V)")
        print(f"- During discharging: The capacitor discharges to 36.8% of initial voltage ({voltage * 0.368:.2f} V)")
        print(f"- After 5 time constants ({tau * 5 * 1000:.2f} ms): The capacitor is nearly fully charged/discharged")
        
        # Ask for simulation mode
        print("\nSelect simulation mode:")
        print("1. Charging")
        print("2. Discharging")
        print("3. Both (charging then discharging)")
        
        mode_choice = input("Enter your choice (1/2/3): ")
        
        if mode_choice == '1':
            mode = 'charging'
        elif mode_choice == '2':
            mode = 'discharging'
        elif mode_choice == '3':
            mode = 'both'
        else:
            print("Invalid choice. Using 'charging' mode.")
            mode = 'charging'
        
        # Set simulation time based on time constant (display 5 time constants by default)
        sim_time = tau * 5
        if mode == 'both':
            sim_time = tau * 10  # Show more time for both modes
        
        # Round sim_time to a nice value
        sim_time = round(sim_time * 10) / 10
        
        # Plot simulation
        circuit.plot_simulation(total_time=sim_time, num_points=1000, mode=mode)
        
    except ValueError as e:
        print(f"Error: {e}")
        print("Please enter valid numerical values.")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main() 