export type TupleFloat = number | number[]

export type CellDesign = {
  cathode_mass_loading: TupleFloat
  anode_mass_loading: TupleFloat
  cathode_density: TupleFloat
  anode_density: TupleFloat
  theoretical_density_p: TupleFloat
  theoretical_density_n: TupleFloat
  theoretical_capacity_p: TupleFloat
  theoretical_capacity_n: TupleFloat
  cathode_specific_capacity: TupleFloat
  specific_capacity_n: TupleFloat
  theoretical_max_conc_p: TupleFloat
  theoretical_max_conc_n: TupleFloat
  conductivity_p: TupleFloat
  conductivity_n: TupleFloat
  a_prefactor_p: TupleFloat
  a_prefactor_n: TupleFloat
  cathode_D50: TupleFloat
  anode_D50: TupleFloat
  init_conc_negative: TupleFloat
  init_conc_positive: TupleFloat
  lower_voltage: number
  upper_voltage: number
  voltage_at_0_soc: number | null
  voltage_at_100_soc: number | null
  separator_thickness: number
  separator_porosity: number
  electrolyte_coefficient: number
  init_conc_electrolyte: number
  number_of_layers: number
  electrode_length: number
  electrode_width: number
  cc_p_thickness: number
  cc_n_thickness: number
  cc_p_tab_length: number
  cc_n_tab_length: number
  cc_n_tab_width: number
  cc_p_tab_width: number
  cc_p_tab_y_coordinate: number
  cc_n_tab_y_coordinate: number
  cc_position: string
  shell_length: number
  shell_width: number
  shell_thickness: number
  wall_thickness: number
}
